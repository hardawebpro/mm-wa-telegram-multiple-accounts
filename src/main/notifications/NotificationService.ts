import { Notification, BrowserWindow } from 'electron'
import type { WebContentsView } from 'electron'
import type { AccountsStore } from '../store/accounts'
import type { MessagingViewManager } from '../messaging/MessagingViewManager'
import type { Platform } from '@shared/types'
import { extractPreviewFromTitle, pollUnreadCount } from './unreadMonitor'

interface TrackedView {
  accountId: string
  platform: Platform
  view: WebContentsView
}

interface NotificationServiceDeps {
  getMainWindow: () => BrowserWindow | null
  getViewManager: () => MessagingViewManager | null
  accountsStore: AccountsStore
  onOpenAccount: (accountId: string) => void
  onUnreadChanged: (accountId: string, unreadCount: number) => void
}

const POLL_INTERVAL_MS = 2000
const TITLE_REFRESH_DEBOUNCE_MS = 500
const NOTIFICATION_DEBOUNCE_MS = 800

export class NotificationService {
  /** Latest polled unread count — used for badge display. */
  private readonly polledUnreadByAccount = new Map<string, number>()
  /** Baseline for desktop notifications; only moves when user reads or we notify. */
  private readonly notificationBaselineByAccount = new Map<string, number>()
  private readonly trackedViews = new Map<string, TrackedView>()
  private readonly titleRefreshTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private readonly pendingNotifyTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private readonly pendingNotifyTitle = new Map<string, string>()
  private pollTimer: ReturnType<typeof setInterval> | null = null

  constructor(private readonly deps: NotificationServiceDeps) {
    this.startPolling()
  }

  attachToView(accountId: string, view: WebContentsView, platform: Platform = 'whatsapp'): void {
    if (this.trackedViews.has(accountId)) {
      return
    }

    this.trackedViews.set(accountId, { accountId, platform, view })
    this.polledUnreadByAccount.set(accountId, 0)
    this.notificationBaselineByAccount.set(accountId, 0)

    view.webContents.on('page-title-updated', (_event, title) => {
      this.pendingNotifyTitle.set(accountId, title)
      this.scheduleTitleRefresh(accountId)
    })

    void this.refreshAccountUnread(accountId)
  }

  detachFromView(accountId: string, view: WebContentsView): void {
    this.clearAccountTimers(accountId)
    this.trackedViews.delete(accountId)
    this.polledUnreadByAccount.delete(accountId)
    this.notificationBaselineByAccount.delete(accountId)
    this.pendingNotifyTitle.delete(accountId)

    if (!view.webContents.isDestroyed()) {
      view.webContents.removeAllListeners('page-title-updated')
    }

    this.deps.onUnreadChanged(accountId, 0)
  }

  dispose(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }

    for (const accountId of this.trackedViews.keys()) {
      this.clearAccountTimers(accountId)
    }
  }

  private clearAccountTimers(accountId: string): void {
    const titleTimer = this.titleRefreshTimers.get(accountId)
    if (titleTimer) {
      clearTimeout(titleTimer)
      this.titleRefreshTimers.delete(accountId)
    }

    const notifyTimer = this.pendingNotifyTimers.get(accountId)
    if (notifyTimer) {
      clearTimeout(notifyTimer)
      this.pendingNotifyTimers.delete(accountId)
    }
  }

  private scheduleTitleRefresh(accountId: string): void {
    const existing = this.titleRefreshTimers.get(accountId)
    if (existing) {
      clearTimeout(existing)
    }

    this.titleRefreshTimers.set(
      accountId,
      setTimeout(() => {
        this.titleRefreshTimers.delete(accountId)
        void this.refreshAccountUnread(accountId)
      }, TITLE_REFRESH_DEBOUNCE_MS)
    )
  }

  private startPolling(): void {
    this.pollTimer = setInterval(() => {
      void this.pollAllViews()
    }, POLL_INTERVAL_MS)
  }

  private async pollAllViews(): Promise<void> {
    for (const { accountId } of this.trackedViews.values()) {
      await this.refreshAccountUnread(accountId)
    }
  }

  private async refreshAccountUnread(accountId: string): Promise<void> {
    const tracked = this.trackedViews.get(accountId)
    if (!tracked || tracked.view.webContents.isDestroyed()) {
      return
    }

    const title = tracked.view.webContents.getTitle()
    this.pendingNotifyTitle.set(accountId, title)

    const unreadCount = await pollUnreadCount(tracked.view.webContents, tracked.platform)
    this.syncUnread(accountId, unreadCount, title)
  }

  private syncUnread(accountId: string, unreadCount: number, title?: string): void {
    const normalizedCount = Math.max(0, Math.floor(unreadCount))
    const previousCount = this.polledUnreadByAccount.get(accountId) ?? 0
    this.polledUnreadByAccount.set(accountId, normalizedCount)

    if (normalizedCount !== previousCount) {
      this.deps.onUnreadChanged(accountId, normalizedCount)
    }

    const baseline = this.notificationBaselineByAccount.get(accountId) ?? 0

    if (normalizedCount < baseline) {
      this.notificationBaselineByAccount.set(accountId, normalizedCount)
      this.clearPendingNotification(accountId)
      return
    }

    if (normalizedCount <= baseline) {
      return
    }

    const account = this.deps.accountsStore.get(accountId)
    if (!account) {
      return
    }

    const settings = this.deps.accountsStore.getSettings(accountId)
    if (!settings.notificationsEnabled) {
      this.notificationBaselineByAccount.set(accountId, normalizedCount)
      return
    }

    const viewManager = this.deps.getViewManager()
    const mainWindow = this.deps.getMainWindow()
    const activeAccountId = viewManager?.getActiveAccountId() ?? null
    const windowFocused = mainWindow?.isFocused() ?? false
    const shouldNotify = !windowFocused || activeAccountId !== accountId

    if (!shouldNotify) {
      this.notificationBaselineByAccount.set(accountId, normalizedCount)
      return
    }

    if (title) {
      this.pendingNotifyTitle.set(accountId, title)
    }

    this.scheduleNotification(accountId)
  }

  private clearPendingNotification(accountId: string): void {
    const timer = this.pendingNotifyTimers.get(accountId)
    if (timer) {
      clearTimeout(timer)
      this.pendingNotifyTimers.delete(accountId)
    }
  }

  private scheduleNotification(accountId: string): void {
    this.clearPendingNotification(accountId)

    this.pendingNotifyTimers.set(
      accountId,
      setTimeout(() => {
        this.pendingNotifyTimers.delete(accountId)
        void this.flushNotification(accountId)
      }, NOTIFICATION_DEBOUNCE_MS)
    )
  }

  private async flushNotification(accountId: string): Promise<void> {
    const normalizedCount = this.polledUnreadByAccount.get(accountId) ?? 0
    const baseline = this.notificationBaselineByAccount.get(accountId) ?? 0

    if (normalizedCount <= baseline) {
      return
    }

    const account = this.deps.accountsStore.get(accountId)
    if (!account) {
      return
    }

    const settings = this.deps.accountsStore.getSettings(accountId)
    if (!settings.notificationsEnabled) {
      this.notificationBaselineByAccount.set(accountId, normalizedCount)
      return
    }

    const viewManager = this.deps.getViewManager()
    const mainWindow = this.deps.getMainWindow()
    const activeAccountId = viewManager?.getActiveAccountId() ?? null
    const windowFocused = mainWindow?.isFocused() ?? false
    const shouldNotify = !windowFocused || activeAccountId !== accountId

    if (!shouldNotify) {
      this.notificationBaselineByAccount.set(accountId, normalizedCount)
      return
    }

    const newMessages = normalizedCount - baseline
    this.notificationBaselineByAccount.set(accountId, normalizedCount)

    const title = this.pendingNotifyTitle.get(accountId)
    this.showNotification(
      account.name,
      account.platform,
      newMessages,
      accountId,
      settings.soundEnabled,
      settings.notificationPreviewEnabled,
      title
    )
  }

  private showNotification(
    accountName: string,
    platform: string,
    newMessages: number,
    accountId: string,
    soundEnabled: boolean,
    previewEnabled: boolean,
    pageTitle?: string
  ): void {
    if (!Notification.isSupported()) {
      return
    }

    const platformLabel = platform === 'telegram' ? 'Telegram' : 'WhatsApp'
    const preview = previewEnabled ? extractPreviewFromTitle(pageTitle ?? '') : null

    let body: string
    if (previewEnabled && preview) {
      body =
        newMessages === 1
          ? preview
          : `${newMessages} new messages — ${preview}`
    } else {
      body =
        newMessages === 1
          ? 'You have a new message.'
          : `You have ${newMessages} new messages.`
    }

    const notification = new Notification({
      title: `${accountName} (${platformLabel})`,
      body,
      silent: !soundEnabled
    })

    notification.on('click', () => {
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore()
        }
        mainWindow.show()
        mainWindow.focus()
      }

      const viewManager = this.deps.getViewManager()
      viewManager?.setOverlayActive(false, accountId)
      this.deps.onOpenAccount(accountId)
    })

    notification.show()
  }
}

import { Notification, BrowserWindow, nativeImage } from 'electron'
import type { WebContentsView } from 'electron'
import type { AccountsStore } from '../store/accounts'
import type { MessagingViewManager } from '../messaging/MessagingViewManager'
import type { Platform } from '@shared/types'
import { getResourceIconPath } from '../utils/icons'
import { focusChatWithRetry } from './focusChat'
import {
  extractPreviewFromTitle,
  pollLatestUnreadChatWithRetry,
  pollUnreadCount
} from './unreadMonitor'

interface TrackedView {
  accountId: string
  platform: Platform
  view: WebContentsView
}

interface NotificationTarget {
  accountId: string
  chatLabel: string | null
}

interface NotificationServiceDeps {
  getMainWindow: () => BrowserWindow | null
  getViewManager: () => MessagingViewManager | null
  accountsStore: AccountsStore
  showMainWindow: () => void
  onOpenAccount: (accountId: string, chatLabel: string | null) => void
  onUnreadChanged: (accountId: string, unreadCount: number) => void
}

const POLL_INTERVAL_MS = 2000
const TITLE_REFRESH_DEBOUNCE_MS = 500
const NOTIFICATION_DEBOUNCE_MS = 800

export class NotificationService {
  private readonly polledUnreadByAccount = new Map<string, number>()
  private readonly notificationBaselineByAccount = new Map<string, number>()
  private readonly trackedViews = new Map<string, TrackedView>()
  private readonly titleRefreshTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private readonly pendingNotifyTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private readonly pendingNotifyTitle = new Map<string, string>()
  private readonly pendingNotifyChatLabel = new Map<string, string | null>()
  private readonly pendingNotifyMessagePreview = new Map<string, string | null>()
  /** Keep references alive until click/close — otherwise Windows may GC before the user clicks. */
  private readonly liveNotifications = new Set<Notification>()
  private readonly notificationTargets = new Map<Notification, NotificationTarget>()
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private readonly notificationIcon = nativeImage.createFromPath(getResourceIconPath(256))

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
      this.pendingNotifyChatLabel.set(accountId, extractPreviewFromTitle(title))
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
    this.pendingNotifyChatLabel.delete(accountId)
    this.pendingNotifyMessagePreview.delete(accountId)

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

    for (const notification of this.liveNotifications) {
      notification.close()
    }
    this.liveNotifications.clear()
    this.notificationTargets.clear()
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
    this.pendingNotifyChatLabel.set(accountId, extractPreviewFromTitle(title))

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
    const windowVisible = mainWindow?.isVisible() ?? false
    const shouldNotify = !windowVisible || !windowFocused || activeAccountId !== accountId

    if (!shouldNotify) {
      this.notificationBaselineByAccount.set(accountId, normalizedCount)
      return
    }

    if (title) {
      this.pendingNotifyTitle.set(accountId, title)
      this.pendingNotifyChatLabel.set(accountId, extractPreviewFromTitle(title))
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
    const windowVisible = mainWindow?.isVisible() ?? false
    const shouldNotify = !windowVisible || !windowFocused || activeAccountId !== accountId

    if (!shouldNotify) {
      this.notificationBaselineByAccount.set(accountId, normalizedCount)
      return
    }

    const newMessages = normalizedCount - baseline
    this.notificationBaselineByAccount.set(accountId, normalizedCount)

    const tracked = this.trackedViews.get(accountId)
    const latestChat =
      tracked && !tracked.view.webContents.isDestroyed()
        ? await pollLatestUnreadChatWithRetry(tracked.view.webContents, tracked.platform)
        : null

    const titleFromPage = this.pendingNotifyTitle.get(accountId)
    const chatLabel =
      latestChat?.chatName ??
      this.pendingNotifyChatLabel.get(accountId) ??
      extractPreviewFromTitle(titleFromPage ?? '')

    const messagePreview = settings.notificationPreviewEnabled
      ? (latestChat?.messagePreview ?? null)
      : null

    this.pendingNotifyChatLabel.set(accountId, chatLabel)
    this.pendingNotifyMessagePreview.set(accountId, messagePreview)

    this.showNotification(
      account.name,
      account.platform,
      newMessages,
      accountId,
      settings.soundEnabled,
      settings.notificationPreviewEnabled,
      chatLabel,
      messagePreview
    )
  }

  private showNotification(
    accountName: string,
    platform: string,
    newMessages: number,
    accountId: string,
    soundEnabled: boolean,
    previewEnabled: boolean,
    chatLabel: string | null,
    messagePreview: string | null
  ): void {
    if (!Notification.isSupported()) {
      return
    }

    const platformLabel = platform === 'telegram' ? 'Telegram' : 'WhatsApp'
    const resolvedChatLabel = chatLabel?.trim() || null
    const resolvedPreview = messagePreview?.trim() || null

    let title = 'New message'
    let body: string

    if (previewEnabled && resolvedChatLabel && resolvedPreview) {
      title = resolvedChatLabel
      body = resolvedPreview
    } else if (previewEnabled && resolvedPreview) {
      title = 'New message'
      body = resolvedPreview
    } else if (previewEnabled && resolvedChatLabel) {
      title = resolvedChatLabel
      body =
        newMessages === 1
          ? `New message · ${accountName} (${platformLabel})`
          : `${newMessages} new messages · ${accountName} (${platformLabel})`
    } else {
      body =
        newMessages === 1
          ? `${accountName} (${platformLabel})`
          : `${newMessages} new messages · ${accountName} (${platformLabel})`
    }

    const notification = new Notification({
      title,
      body,
      silent: !soundEnabled,
      ...(this.notificationIcon.isEmpty() ? {} : { icon: this.notificationIcon })
    })

    const target: NotificationTarget = {
      accountId,
      chatLabel: resolvedChatLabel
    }

    this.liveNotifications.add(notification)
    this.notificationTargets.set(notification, target)

    const release = (): void => {
      this.liveNotifications.delete(notification)
      this.notificationTargets.delete(notification)
    }

    notification.on('click', () => {
      const clickTarget = this.notificationTargets.get(notification) ?? target
      release()
      notification.close()
      void this.handleNotificationClick(clickTarget.accountId, clickTarget.chatLabel)
    })

    notification.on('close', release)
    notification.on('failed', release)

    notification.show()
  }

  private async handleNotificationClick(accountId: string, chatLabel: string | null): Promise<void> {
    this.deps.showMainWindow()

    const viewManager = this.deps.getViewManager()
    const mainWindow = this.deps.getMainWindow()

    viewManager?.setOverlayActive(false, accountId)
    viewManager?.showView(accountId)
    this.deps.onOpenAccount(accountId, chatLabel)

    await this.waitForWindowReady(mainWindow)

    mainWindow?.webContents.send('window:resized')
    await new Promise((resolve) => setTimeout(resolve, 250))

    const tracked = this.trackedViews.get(accountId)
    if (!tracked || tracked.view.webContents.isDestroyed()) {
      return
    }

    await focusChatWithRetry(tracked.view.webContents, tracked.platform, chatLabel)
    viewManager?.focusActiveView()
    mainWindow?.focus()
  }

  private async waitForWindowReady(mainWindow: BrowserWindow | null): Promise<void> {
    if (!mainWindow || mainWindow.isDestroyed()) {
      await new Promise((resolve) => setTimeout(resolve, 300))
      return
    }

    if (mainWindow.isVisible()) {
      await new Promise((resolve) => setTimeout(resolve, 150))
      return
    }

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, 800)
      mainWindow.once('show', () => {
        clearTimeout(timeout)
        resolve()
      })
    })
  }
}

import { Notification, BrowserWindow } from 'electron'
import type { WebContentsView } from 'electron'
import type { AccountsStore } from '../store/accounts'
import type { MessagingViewManager } from '../messaging/MessagingViewManager'
import type { Platform } from '@shared/types'
import { parseUnreadCountFromTitle, pollUnreadCount } from './unreadMonitor'

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

export class NotificationService {
  private readonly lastUnreadByAccount = new Map<string, number>()
  private readonly trackedViews = new Map<string, TrackedView>()
  private pollTimer: ReturnType<typeof setInterval> | null = null

  constructor(private readonly deps: NotificationServiceDeps) {
    this.startPolling()
  }

  attachToView(accountId: string, view: WebContentsView, platform: Platform = 'whatsapp'): void {
    if (this.trackedViews.has(accountId)) {
      return
    }

    this.trackedViews.set(accountId, { accountId, platform, view })
    this.lastUnreadByAccount.set(accountId, 0)

    view.webContents.on('page-title-updated', (_event, title) => {
      void this.syncUnread(accountId, parseUnreadCountFromTitle(title), title)
    })

    void this.refreshAccountUnread(accountId)
  }

  detachFromView(accountId: string, view: WebContentsView): void {
    this.trackedViews.delete(accountId)
    this.lastUnreadByAccount.delete(accountId)

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
  }

  private startPolling(): void {
    this.pollTimer = setInterval(() => {
      void this.pollAllViews()
    }, 2000)
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

    const unreadCount = await pollUnreadCount(tracked.view.webContents, tracked.platform)
    await this.syncUnread(accountId, unreadCount)
  }

  private async syncUnread(accountId: string, unreadCount: number, title?: string): Promise<void> {
    const previousUnread = this.lastUnreadByAccount.get(accountId) ?? 0
    this.lastUnreadByAccount.set(accountId, unreadCount)

    this.deps.onUnreadChanged(accountId, unreadCount)

    if (unreadCount <= previousUnread) {
      return
    }

    const account = this.deps.accountsStore.get(accountId)
    if (!account) {
      return
    }

    const settings = this.deps.accountsStore.getSettings(accountId)
    if (!settings.notificationsEnabled) {
      return
    }

    const viewManager = this.deps.getViewManager()
    const mainWindow = this.deps.getMainWindow()
    const activeAccountId = viewManager?.getActiveAccountId() ?? null
    const windowFocused = mainWindow?.isFocused() ?? false

    const shouldNotify = !windowFocused || activeAccountId !== accountId
    if (!shouldNotify) {
      return
    }

    const newMessages = unreadCount - previousUnread
    this.showNotification(
      account.name,
      account.platform,
      newMessages,
      accountId,
      settings.soundEnabled,
      title
    )
  }

  private showNotification(
    accountName: string,
    platform: string,
    newMessages: number,
    accountId: string,
    soundEnabled: boolean,
    _title?: string
  ): void {
    if (!Notification.isSupported()) {
      return
    }

    const platformLabel = platform === 'telegram' ? 'Telegram' : 'WhatsApp'
    const body =
      newMessages === 1
        ? 'You have a new message.'
        : `You have ${newMessages} new messages.`

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

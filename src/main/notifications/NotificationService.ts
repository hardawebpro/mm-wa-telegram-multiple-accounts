import { Notification, BrowserWindow } from 'electron'
import type { WebContentsView } from 'electron'
import type { AccountsStore } from '../store/accounts'
import type { MessagingViewManager } from '../messaging/MessagingViewManager'
import type { Platform } from '@shared/types'
import { getPlatformNotificationIcon } from '../utils/icons'
import { focusChatWithRetry } from './focusChat'
import {
  extractPreviewFromTitle,
  isGenericMessagingTitle,
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
const TRAY_POLL_INTERVAL_MS = 5000
const TITLE_REFRESH_DEBOUNCE_MS = 500
const NOTIFICATION_DEBOUNCE_MS = 800
const TRAY_NOTIFICATION_DEBOUNCE_MS = 1200
const CATCH_UP_GAP_MS = 60_000
const CATCH_UP_DEBOUNCE_MS = 4000
const NOTIFICATION_RATE_LIMIT_MS = 30_000
const POLL_ACCOUNT_TIMEOUT_MS = 3000
const CATCH_UP_BATCH_THRESHOLD = 3
const TRAY_PREVIEW_POLL_MAX_WAIT_MS = 3000

export class NotificationService {
  private readonly polledUnreadByAccount = new Map<string, number>()
  private readonly notificationBaselineByAccount = new Map<string, number>()
  private readonly trackedViews = new Map<string, TrackedView>()
  private readonly titleRefreshTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private readonly pendingNotifyTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private readonly pendingNotifySince = new Map<string, number>()
  private readonly pendingNotifyTitle = new Map<string, string>()
  private readonly pendingNotifyChatLabel = new Map<string, string | null>()
  private readonly pendingNotifyMessagePreview = new Map<string, string | null>()
  private readonly lastSuccessfulPollAt = new Map<string, number>()
  private readonly lastNotificationShownAt = new Map<string, number>()
  /** Keep references alive until click/close — otherwise Windows may GC before the user clicks. */
  private readonly liveNotifications = new Set<Notification>()
  private readonly notificationTargets = new Map<Notification, NotificationTarget>()
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private pollIntervalMs = POLL_INTERVAL_MS
  private shellHidden = false
  private loggedUnsupportedNotifications = false

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
    this.lastSuccessfulPollAt.set(accountId, Date.now())

    view.webContents.on('page-title-updated', (_event, title) => {
      this.pendingNotifyTitle.set(accountId, title)
      this.pendingNotifyChatLabel.set(accountId, extractPreviewFromTitle(title))
      if (this.shellHidden) {
        void this.refreshAccountUnread(accountId).then(() => {
          this.processPendingNotifications([accountId])
        })
        return
      }
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
    this.pendingNotifySince.delete(accountId)
    this.lastSuccessfulPollAt.delete(accountId)
    this.lastNotificationShownAt.delete(accountId)

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

  onShellHidden(): void {
    this.shellHidden = true
    this.setPollInterval(TRAY_POLL_INTERVAL_MS)
    void this.pollAllViews()
  }

  onShellShown(): void {
    this.shellHidden = false
    this.setPollInterval(POLL_INTERVAL_MS)
    void this.pollAllViews()
  }

  onSystemWake(): void {
    void this.pollAllViews()
  }

  private shouldShowDesktopNotification(accountId: string): boolean {
    if (this.shellHidden) {
      return true
    }

    const mainWindow = this.deps.getMainWindow()
    const viewManager = this.deps.getViewManager()
    const windowVisible = mainWindow?.isVisible() ?? false
    const windowFocused = mainWindow?.isFocused() ?? false
    const activeAccountId = viewManager?.getActiveAccountId() ?? null
    return !windowVisible || !windowFocused || activeAccountId !== accountId
  }

  private clearAccountTimers(accountId: string): void {
    const titleTimer = this.titleRefreshTimers.get(accountId)
    if (titleTimer) {
      clearTimeout(titleTimer)
      this.titleRefreshTimers.delete(accountId)
    }

    this.clearPendingNotifyTimer(accountId)
    this.pendingNotifySince.delete(accountId)
  }

  private clearPendingNotifyTimer(accountId: string): void {
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
        void this.refreshAccountUnread(accountId).then(() => {
          this.processPendingNotifications([accountId])
        })
      }, TITLE_REFRESH_DEBOUNCE_MS)
    )
  }

  private setPollInterval(intervalMs: number): void {
    if (this.pollIntervalMs === intervalMs && this.pollTimer) {
      return
    }

    this.pollIntervalMs = intervalMs

    if (this.pollTimer) {
      clearInterval(this.pollTimer)
    }

    this.pollTimer = setInterval(() => {
      void this.pollAllViews()
    }, this.pollIntervalMs)
  }

  private startPolling(): void {
    this.setPollInterval(POLL_INTERVAL_MS)
  }

  private async pollAllViews(): Promise<void> {
    const accountIds = [...this.trackedViews.keys()]
    await Promise.all(accountIds.map((accountId) => this.pollAccountWithTimeout(accountId)))
    this.processPendingNotifications()
  }

  private processPendingNotifications(accountIds?: string[]): void {
    const ids = accountIds ?? [...this.pendingNotifySince.keys()]
    const now = Date.now()

    for (const accountId of ids) {
      const since = this.pendingNotifySince.get(accountId)
      if (!since) {
        continue
      }

      const debounceMs = this.getNotificationDebounceMs(accountId)
      if (now - since >= debounceMs) {
        void this.flushNotification(accountId)
      }
    }
  }

  private async pollAccountWithTimeout(accountId: string): Promise<void> {
    try {
      await Promise.race([
        this.refreshAccountUnread(accountId),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('poll-timeout')), POLL_ACCOUNT_TIMEOUT_MS)
        })
      ])
      this.lastSuccessfulPollAt.set(accountId, Date.now())
    } catch {
      // Ignore timeouts and transient polling failures for one account.
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
      this.clearPendingNotifyTimer(accountId)
      this.pendingNotifySince.delete(accountId)
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

    if (!this.shouldShowDesktopNotification(accountId)) {
      this.notificationBaselineByAccount.set(accountId, normalizedCount)
      return
    }

    if (title) {
      this.pendingNotifyTitle.set(accountId, title)
      this.pendingNotifyChatLabel.set(accountId, extractPreviewFromTitle(title))
    }

    this.scheduleNotification(accountId)
  }

  private isCatchUpGap(accountId: string): boolean {
    if (this.shellHidden) {
      return true
    }

    const lastPoll = this.lastSuccessfulPollAt.get(accountId) ?? Date.now()
    return Date.now() - lastPoll > CATCH_UP_GAP_MS
  }

  private getNotificationDebounceMs(accountId: string): number {
    if (this.isCatchUpGap(accountId)) {
      return CATCH_UP_DEBOUNCE_MS
    }

    if (this.shellHidden) {
      return TRAY_NOTIFICATION_DEBOUNCE_MS
    }

    return NOTIFICATION_DEBOUNCE_MS
  }

  private scheduleNotification(accountId: string): void {
    if (!this.pendingNotifySince.has(accountId)) {
      this.pendingNotifySince.set(accountId, Date.now())
    }

    this.clearPendingNotifyTimer(accountId)

    const debounceMs = this.getNotificationDebounceMs(accountId)
    this.pendingNotifyTimers.set(
      accountId,
      setTimeout(() => {
        this.pendingNotifyTimers.delete(accountId)
        void this.flushNotification(accountId)
      }, debounceMs)
    )
  }

  private scheduleNotificationAfter(accountId: string, delayMs: number): void {
    if (!this.pendingNotifySince.has(accountId)) {
      this.pendingNotifySince.set(accountId, Date.now())
    }

    this.clearPendingNotifyTimer(accountId)

    this.pendingNotifyTimers.set(
      accountId,
      setTimeout(() => {
        this.pendingNotifyTimers.delete(accountId)
        void this.flushNotification(accountId)
      }, delayMs)
    )
  }

  private async flushNotification(accountId: string): Promise<void> {
    const normalizedCount = this.polledUnreadByAccount.get(accountId) ?? 0
    const baseline = this.notificationBaselineByAccount.get(accountId) ?? 0

    if (normalizedCount <= baseline) {
      this.pendingNotifySince.delete(accountId)
      return
    }

    const since = this.pendingNotifySince.get(accountId)
    if (since !== undefined) {
      const debounceMs = this.getNotificationDebounceMs(accountId)
      if (Date.now() - since < debounceMs) {
        return
      }
    }

    const account = this.deps.accountsStore.get(accountId)
    if (!account) {
      return
    }

    const settings = this.deps.accountsStore.getSettings(accountId)
    if (!settings.notificationsEnabled) {
      this.notificationBaselineByAccount.set(accountId, normalizedCount)
      this.pendingNotifySince.delete(accountId)
      return
    }

    if (!this.shouldShowDesktopNotification(accountId)) {
      this.notificationBaselineByAccount.set(accountId, normalizedCount)
      this.pendingNotifySince.delete(accountId)
      return
    }

    const now = Date.now()
    const lastShown = this.lastNotificationShownAt.get(accountId) ?? 0
    if (now - lastShown < NOTIFICATION_RATE_LIMIT_MS) {
      this.scheduleNotificationAfter(accountId, NOTIFICATION_RATE_LIMIT_MS - (now - lastShown))
      return
    }

    const newMessages = normalizedCount - baseline
    const isCatchUp = this.isCatchUpGap(accountId)
    const shouldPollPreview =
      settings.notificationPreviewEnabled && !(isCatchUp && newMessages > CATCH_UP_BATCH_THRESHOLD)

    const viewManager = this.deps.getViewManager()
    viewManager?.ensureViewAttached(accountId)
    const tracked = this.trackedViews.get(accountId)
    const latestChat =
      shouldPollPreview && tracked && !tracked.view.webContents.isDestroyed()
        ? await pollLatestUnreadChatWithRetry(tracked.view.webContents, tracked.platform, {
            maxAttempts: this.shellHidden ? 6 : 6,
            backgroundMode: this.shellHidden,
            maxWaitMs: this.shellHidden ? TRAY_PREVIEW_POLL_MAX_WAIT_MS : undefined
          })
        : null

    const titleFromPage = this.pendingNotifyTitle.get(accountId)
    const rawChatLabel =
      latestChat?.chatName ??
      this.pendingNotifyChatLabel.get(accountId) ??
      extractPreviewFromTitle(titleFromPage ?? '')
    const chatLabel = isGenericMessagingTitle(rawChatLabel) ? null : rawChatLabel

    const messagePreview = settings.notificationPreviewEnabled
      ? (latestChat?.messagePreview ?? null)
      : null

    this.pendingNotifyChatLabel.set(accountId, chatLabel)
    this.pendingNotifyMessagePreview.set(accountId, messagePreview)

    const shown = this.showNotification(
      account.name,
      account.platform,
      newMessages,
      accountId,
      settings.soundEnabled,
      settings.notificationPreviewEnabled,
      chatLabel,
      messagePreview,
      isCatchUp && newMessages > CATCH_UP_BATCH_THRESHOLD,
      () => {
        this.scheduleNotification(accountId)
      }
    )

    if (shown) {
      this.notificationBaselineByAccount.set(accountId, normalizedCount)
      this.lastNotificationShownAt.set(accountId, Date.now())
      this.pendingNotifySince.delete(accountId)
      this.clearPendingNotifyTimer(accountId)
    }
  }

  private showNotification(
    accountName: string,
    platform: Platform,
    newMessages: number,
    accountId: string,
    soundEnabled: boolean,
    previewEnabled: boolean,
    chatLabel: string | null,
    messagePreview: string | null,
    catchUpBatch = false,
    onFailed?: () => void
  ): boolean {
    if (!Notification.isSupported()) {
      if (!this.loggedUnsupportedNotifications) {
        console.warn('[NotificationService] Desktop notifications are not supported on this system.')
        this.loggedUnsupportedNotifications = true
      }
      return false
    }

    const platformLabel = platform === 'telegram' ? 'Telegram' : 'WhatsApp'
    const resolvedChatLabel = chatLabel?.trim() || null
    const resolvedPreview = messagePreview?.trim() || null

    let title = 'New message'
    let body: string

    if (catchUpBatch) {
      title = accountName
      body = `${newMessages} new messages · ${platformLabel} (while app was in tray)`
    } else if (previewEnabled && resolvedChatLabel && resolvedPreview) {
      title = resolvedChatLabel
      body = resolvedPreview
    } else if (previewEnabled && resolvedPreview) {
      title = accountName
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

    const notificationIcon = getPlatformNotificationIcon(platform)
    const notification = new Notification({
      title,
      body,
      silent: !soundEnabled,
      ...(notificationIcon.isEmpty() ? {} : { icon: notificationIcon })
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
    notification.on('failed', () => {
      release()
      onFailed?.()
    })

    notification.show()
    return true
  }

  private async handleNotificationClick(accountId: string, chatLabel: string | null): Promise<void> {
    const viewManager = this.deps.getViewManager()
    const mainWindow = this.deps.getMainWindow()

    this.deps.showMainWindow()
    await this.waitForWindowReady(mainWindow)

    viewManager?.setOverlayActive(false, accountId)
    viewManager?.showView(accountId)
    this.deps.onOpenAccount(accountId, chatLabel)

    await this.waitForMessagingSurface(accountId)

    mainWindow?.webContents.send('window:resized')
    await new Promise((resolve) => setTimeout(resolve, 400))

    const tracked = this.trackedViews.get(accountId)
    if (!tracked || tracked.view.webContents.isDestroyed()) {
      return
    }

    let resolvedChatLabel = chatLabel?.trim() || null
    if (!resolvedChatLabel) {
      const latest = await pollLatestUnreadChatWithRetry(tracked.view.webContents, tracked.platform, {
        maxAttempts: 8,
        backgroundMode: false
      })
      resolvedChatLabel = latest?.chatName ?? this.pendingNotifyChatLabel.get(accountId) ?? null
    }

    await focusChatWithRetry(tracked.view.webContents, tracked.platform, resolvedChatLabel, 10)
    viewManager?.focusActiveView()
    mainWindow?.focus()
  }

  private async waitForMessagingSurface(accountId: string): Promise<void> {
    const tracked = this.trackedViews.get(accountId)
    if (!tracked || tracked.view.webContents.isDestroyed()) {
      await new Promise((resolve) => setTimeout(resolve, 300))
      return
    }

    const readyScript =
      tracked.platform === 'telegram'
        ? `Boolean(document.querySelector('.chatlist, .ChatFolders, #LeftColumn'))`
        : `Boolean(document.querySelector('#pane-side, [aria-label="Chat list"]'))`

    for (let attempt = 0; attempt < 20; attempt++) {
      try {
        const ready = await tracked.view.webContents.executeJavaScript(readyScript, true)
        if (ready && !tracked.view.webContents.isLoading()) {
          return
        }
      } catch {
        // Retry until the messaging surface is ready after tray restore.
      }

      await new Promise((resolve) => setTimeout(resolve, 100 + attempt * 50))
    }
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
      const timeout = setTimeout(resolve, 1200)
      mainWindow.once('show', () => {
        clearTimeout(timeout)
        resolve()
      })
    })
  }
}

import { Notification, BrowserWindow } from 'electron'
import type { WebContentsView } from 'electron'
import type { AccountsStore } from '../store/accounts'
import type { MessagingViewManager } from '../messaging/MessagingViewManager'
import type { Platform } from '@shared/types'
import { getPlatformNotificationIcon } from '../utils/icons'
import { focusChatWithRetry } from './focusChat'
import { logNotificationEvent } from './notificationLog'
import {
  extractPreviewFromTitle,
  isGenericMessagingTitle,
  pollLatestUnreadChatWithRetry,
  pollUnreadCount,
  pollUnreadSnapshot,
  type UnreadSnapshot
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
const BACKGROUND_POLL_INTERVAL_MS = 2000
const TITLE_REFRESH_DEBOUNCE_MS = 500
const NOTIFICATION_DEBOUNCE_MS = 800
const BACKGROUND_NOTIFICATION_DEBOUNCE_MS = 1200
const STALE_GAP_MS = 120_000
const CATCH_UP_DEBOUNCE_MS = 8000
const NOTIFICATION_RATE_LIMIT_MS = 30_000
const POLL_ACCOUNT_TIMEOUT_MS = 3000
const PRE_SHOW_RECHECK_TIMEOUT_MS = 1500
const STALE_TIMEOUT_STREAK = 3
const BACKGROUND_PREVIEW_POLL_MAX_WAIT_MS = 1000
const FOREGROUND_PREVIEW_POLL_MAX_WAIT_MS = 1500
const POLL_LOG_HEARTBEAT_MS = 60_000
const SLOW_POLL_LOG_MS = 1000

interface PollResult extends UnreadSnapshot {
  title: string
}

interface PollLogState {
  loggedAt: number
  unreadCount: number
  visibilityState: string | null
}

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
  private readonly pollTimeoutStreak = new Map<string, number>()
  /** Accounts whose page stopped answering polls; the next unread increase is treated as catch-up. */
  private readonly staleAccounts = new Set<string>()
  /** Pending notifications that come from a backlog and must be confirmed before showing. */
  private readonly catchUpAccounts = new Set<string>()
  private readonly flushingAccounts = new Set<string>()
  private readonly pollLogState = new Map<string, PollLogState>()
  /** Keep references alive until click/close — otherwise Windows may GC before the user clicks. */
  private readonly liveNotifications = new Set<Notification>()
  private readonly notificationTargets = new Map<Notification, NotificationTarget>()
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private pollIntervalMs = POLL_INTERVAL_MS
  /** True when window hidden, minimized, or unfocused — faster poll + all-view sync in ViewManager. */
  private backgroundSync = false
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
      logNotificationEvent('title-updated', { accountId, platform })
      if (this.backgroundSync) {
        void this.pollAccountWithTimeout(accountId).then(() => {
          this.processPendingNotifications([accountId])
        })
        return
      }
      this.scheduleTitleRefresh(accountId)
    })

    void this.pollAccountWithTimeout(accountId)
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
    this.pollTimeoutStreak.delete(accountId)
    this.staleAccounts.delete(accountId)
    this.catchUpAccounts.delete(accountId)
    this.flushingAccounts.delete(accountId)
    this.pollLogState.delete(accountId)

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

  enterBackgroundSync(): void {
    if (this.backgroundSync) {
      return
    }

    this.backgroundSync = true
    logNotificationEvent('background-enter')
    this.setPollInterval(BACKGROUND_POLL_INTERVAL_MS)
    void this.pollAllViews()
  }

  exitBackgroundSync(): void {
    if (!this.backgroundSync) {
      return
    }

    this.backgroundSync = false
    logNotificationEvent('background-exit')
    this.setPollInterval(POLL_INTERVAL_MS)
    void this.pollAllViews()
  }

  /** @deprecated Use enterBackgroundSync — kept for tray hide callback. */
  onShellHidden(): void {
    this.enterBackgroundSync()
  }

  /** @deprecated Use exitBackgroundSync — kept for tray show callback. */
  onShellShown(): void {
    this.exitBackgroundSync()
  }

  onSystemWake(): void {
    void this.pollAllViews()
  }

  private shouldShowDesktopNotification(accountId: string): boolean {
    if (this.backgroundSync) {
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
        void this.pollAccountWithTimeout(accountId).then(() => {
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

  /** Results that arrive after the timeout are dropped so a page that wakes up late cannot replay old counts. */
  private async pollAccountWithTimeout(accountId: string): Promise<void> {
    const tracked = this.trackedViews.get(accountId)
    if (!tracked || tracked.view.webContents.isDestroyed()) {
      return
    }

    const startedAt = Date.now()
    const refresh = this.refreshAccountUnread(accountId).catch(() => null)
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined
    const outcome = await Promise.race([
      refresh,
      new Promise<'timeout'>((resolve) => {
        timeoutHandle = setTimeout(() => resolve('timeout'), POLL_ACCOUNT_TIMEOUT_MS)
      })
    ])
    clearTimeout(timeoutHandle)

    if (outcome === 'timeout') {
      this.handlePollTimeout(accountId, tracked)
      void refresh.then((late) => {
        if (late) {
          logNotificationEvent('poll-late-discarded', {
            accountId,
            platform: tracked.platform,
            latencyMs: Date.now() - startedAt
          })
        }
      })
      return
    }

    if (!outcome || !this.trackedViews.has(accountId)) {
      return
    }

    const lastSuccess = this.lastSuccessfulPollAt.get(accountId) ?? startedAt
    const recovering = this.staleAccounts.has(accountId) || startedAt - lastSuccess > STALE_GAP_MS
    this.lastSuccessfulPollAt.set(accountId, Date.now())
    this.pollTimeoutStreak.set(accountId, 0)
    this.staleAccounts.delete(accountId)

    this.logPollOk(accountId, tracked.platform, outcome, Date.now() - startedAt, recovering)

    this.pendingNotifyTitle.set(accountId, outcome.title)
    this.pendingNotifyChatLabel.set(accountId, extractPreviewFromTitle(outcome.title))
    this.syncUnread(accountId, outcome.unreadCount, outcome.title, recovering)
  }

  private handlePollTimeout(accountId: string, tracked: TrackedView): void {
    const streak = (this.pollTimeoutStreak.get(accountId) ?? 0) + 1
    this.pollTimeoutStreak.set(accountId, streak)
    logNotificationEvent('poll-timeout', { accountId, platform: tracked.platform, detail: `streak=${streak}` })

    if (streak < STALE_TIMEOUT_STREAK || this.staleAccounts.has(accountId)) {
      return
    }

    this.staleAccounts.add(accountId)
    logNotificationEvent('account-stale', { accountId, platform: tracked.platform })
    if (!tracked.view.webContents.isDestroyed()) {
      tracked.view.webContents.setBackgroundThrottling(false)
    }
  }

  private logPollOk(
    accountId: string,
    platform: Platform,
    snapshot: UnreadSnapshot,
    latencyMs: number,
    recovering: boolean
  ): void {
    const previous = this.pollLogState.get(accountId)
    const now = Date.now()
    const changed =
      !previous ||
      previous.unreadCount !== snapshot.unreadCount ||
      previous.visibilityState !== snapshot.visibilityState
    const heartbeatDue = !previous || now - previous.loggedAt >= POLL_LOG_HEARTBEAT_MS

    if (!changed && !heartbeatDue && !recovering && latencyMs < SLOW_POLL_LOG_MS) {
      return
    }

    this.pollLogState.set(accountId, {
      loggedAt: now,
      unreadCount: snapshot.unreadCount,
      visibilityState: snapshot.visibilityState
    })
    logNotificationEvent('poll-ok', {
      accountId,
      platform,
      unreadCount: snapshot.unreadCount,
      latencyMs,
      visibilityState: snapshot.visibilityState,
      detail: recovering ? 'recovering' : undefined
    })
  }

  private async refreshAccountUnread(accountId: string): Promise<PollResult | null> {
    const tracked = this.trackedViews.get(accountId)
    if (!tracked || tracked.view.webContents.isDestroyed()) {
      return null
    }

    const title = tracked.view.webContents.getTitle()
    const snapshot = await pollUnreadSnapshot(tracked.view.webContents, tracked.platform)
    return { ...snapshot, title }
  }

  private updatePolledCount(accountId: string, unreadCount: number): number {
    const normalizedCount = Math.max(0, Math.floor(unreadCount))
    const previousCount = this.polledUnreadByAccount.get(accountId) ?? 0
    this.polledUnreadByAccount.set(accountId, normalizedCount)

    if (normalizedCount !== previousCount) {
      this.deps.onUnreadChanged(accountId, normalizedCount)
    }

    return normalizedCount
  }

  private clearPendingNotification(accountId: string): void {
    this.clearPendingNotifyTimer(accountId)
    this.pendingNotifySince.delete(accountId)
    this.catchUpAccounts.delete(accountId)
  }

  private syncUnread(accountId: string, unreadCount: number, title?: string, recovering = false): void {
    const normalizedCount = this.updatePolledCount(accountId, unreadCount)
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

    if (!this.shouldShowDesktopNotification(accountId)) {
      this.notificationBaselineByAccount.set(accountId, normalizedCount)
      return
    }

    if (title) {
      this.pendingNotifyTitle.set(accountId, title)
      this.pendingNotifyChatLabel.set(accountId, extractPreviewFromTitle(title))
    }

    if (recovering && !this.catchUpAccounts.has(accountId)) {
      this.catchUpAccounts.add(accountId)
      logNotificationEvent('catch-up', {
        accountId,
        platform: account.platform,
        unreadCount: normalizedCount
      })
    }

    this.scheduleNotification(accountId)
  }

  private getNotificationDebounceMs(accountId: string): number {
    if (this.catchUpAccounts.has(accountId)) {
      return CATCH_UP_DEBOUNCE_MS
    }

    if (this.backgroundSync) {
      return BACKGROUND_NOTIFICATION_DEBOUNCE_MS
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
    if (this.flushingAccounts.has(accountId)) {
      return
    }

    this.flushingAccounts.add(accountId)
    try {
      await this.flushNotificationUnlocked(accountId)
    } finally {
      this.flushingAccounts.delete(accountId)
    }
  }

  /** Reads the unread count again right before a toast; returns null if the page did not answer in time. */
  private async recheckUnreadCount(accountId: string): Promise<number | null> {
    const tracked = this.trackedViews.get(accountId)
    if (!tracked || tracked.view.webContents.isDestroyed()) {
      return null
    }

    let timeoutHandle: ReturnType<typeof setTimeout> | undefined
    const outcome = await Promise.race([
      pollUnreadCount(tracked.view.webContents, tracked.platform).catch(() => null),
      new Promise<null>((resolve) => {
        timeoutHandle = setTimeout(() => resolve(null), PRE_SHOW_RECHECK_TIMEOUT_MS)
      })
    ])
    clearTimeout(timeoutHandle)
    return outcome
  }

  private async flushNotificationUnlocked(accountId: string): Promise<void> {
    const cachedCount = this.polledUnreadByAccount.get(accountId) ?? 0
    const baseline = this.notificationBaselineByAccount.get(accountId) ?? 0

    if (cachedCount <= baseline) {
      this.clearPendingNotification(accountId)
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
      this.notificationBaselineByAccount.set(accountId, cachedCount)
      this.clearPendingNotification(accountId)
      return
    }

    if (!this.shouldShowDesktopNotification(accountId)) {
      this.notificationBaselineByAccount.set(accountId, cachedCount)
      this.clearPendingNotification(accountId)
      return
    }

    const now = Date.now()
    const lastShown = this.lastNotificationShownAt.get(accountId) ?? 0
    if (now - lastShown < NOTIFICATION_RATE_LIMIT_MS) {
      this.scheduleNotificationAfter(accountId, NOTIFICATION_RATE_LIMIT_MS - (now - lastShown))
      return
    }

    const isCatchUp = this.catchUpAccounts.has(accountId)
    const freshCount = await this.recheckUnreadCount(accountId)

    if (freshCount === null && isCatchUp) {
      // Backlog toasts are only shown once the page confirms the messages are still unread.
      return
    }

    const normalizedCount =
      freshCount === null ? cachedCount : this.updatePolledCount(accountId, freshCount)

    if (normalizedCount <= baseline) {
      this.notificationBaselineByAccount.set(accountId, normalizedCount)
      this.clearPendingNotification(accountId)
      logNotificationEvent('toast-skipped-read', {
        accountId,
        platform: account.platform,
        unreadCount: normalizedCount,
        detail: isCatchUp ? 'catch-up' : undefined
      })
      return
    }

    const newMessages = normalizedCount - baseline
    const shouldPollPreview = settings.notificationPreviewEnabled && !isCatchUp

    const viewManager = this.deps.getViewManager()
    viewManager?.ensureViewAttached(accountId)
    const tracked = this.trackedViews.get(accountId)
    const latestChat =
      shouldPollPreview && tracked && !tracked.view.webContents.isDestroyed()
        ? await pollLatestUnreadChatWithRetry(tracked.view.webContents, tracked.platform, {
            maxAttempts: 4,
            backgroundMode: this.backgroundSync,
            maxWaitMs: this.backgroundSync
              ? BACKGROUND_PREVIEW_POLL_MAX_WAIT_MS
              : FOREGROUND_PREVIEW_POLL_MAX_WAIT_MS
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
      isCatchUp,
      () => {
        logNotificationEvent('toast-failed', { accountId, platform: account.platform })
        if (isCatchUp) {
          this.catchUpAccounts.add(accountId)
        }
        this.scheduleNotification(accountId)
      }
    )

    if (shown) {
      this.notificationBaselineByAccount.set(accountId, normalizedCount)
      this.lastNotificationShownAt.set(accountId, Date.now())
      this.clearPendingNotification(accountId)
      logNotificationEvent('toast-shown', {
        accountId,
        platform: account.platform,
        unreadCount: normalizedCount,
        detail: isCatchUp ? 'catch-up-summary' : undefined
      })
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
      title = 'Unread messages'
      body =
        newMessages === 1
          ? `1 unread message · ${accountName} (${platformLabel})`
          : `${newMessages} unread messages · ${accountName} (${platformLabel})`
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

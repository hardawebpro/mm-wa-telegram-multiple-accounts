import { BrowserWindow, WebContentsView, shell } from 'electron'
import { ALLOWED_PLATFORM_ORIGINS, getPlatformUrl } from '@shared/constants/platformUrls'
import { MESSAGING_USER_AGENT } from '@shared/constants/messaging'
import { BLOCK_WEB_NOTIFICATIONS_SCRIPT } from '../notifications/blockWebNotifications'
import type { MessagingAccount, Platform, ViewBounds } from '@shared/types'

const MESSAGING_WEB_PREFERENCES = {
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
  webSecurity: true
} as const

const HIDDEN_BOUNDS: ViewBounds = { x: 0, y: 0, width: 0, height: 0 }

export class MessagingViewManager {
  private readonly views = new Map<string, WebContentsView>()
  private readonly attachedViews = new Set<WebContentsView>()
  private activeAccountId: string | null = null
  private contentBounds: ViewBounds = { x: 0, y: 0, width: 0, height: 0 }
  private overlayActive = false

  constructor(
    private readonly getMainWindow: () => BrowserWindow | null,
    private readonly hooks?: {
      onViewCreated?: (account: MessagingAccount, view: WebContentsView) => void
      onViewDestroyed?: (accountId: string, view: WebContentsView) => void
    }
  ) {}

  createView(account: MessagingAccount): WebContentsView {
    const existing = this.views.get(account.id)
    if (existing) {
      return existing
    }

    const view = new WebContentsView({
      webPreferences: {
        ...MESSAGING_WEB_PREFERENCES,
        partition: account.partition
      }
    })

    view.webContents.setUserAgent(MESSAGING_USER_AGENT)
    view.webContents.setBackgroundThrottling(false)
    this.setupNavigationGuard(view, account.platform)
    this.setupNotificationBlocker(view)
    this.setupLoadHandlers(view, account.id)

    this.views.set(account.id, view)
    view.setVisible(false)

    if (!this.overlayActive) {
      this.ensureAttached(view)
    }

    void view.webContents.loadURL(getPlatformUrl(account.platform))
    this.hooks?.onViewCreated?.(account, view)
    return view
  }

  showView(accountId: string): void {
    const view = this.views.get(accountId)
    if (!view) {
      return
    }

    this.activeAccountId = accountId

    if (this.overlayActive) {
      return
    }

    this.applyVisibility()
  }

  hideView(accountId: string): void {
    const view = this.views.get(accountId)
    if (!view) {
      return
    }

    view.setVisible(false)
    if (this.activeAccountId === accountId) {
      this.activeAccountId = null
    }
  }

  hideAllViews(): void {
    if (this.overlayActive) {
      this.detachAllViews()
      return
    }

    for (const view of this.views.values()) {
      view.setVisible(false)
    }
  }

  setOverlayActive(active: boolean, accountId?: string | null): void {
    this.overlayActive = active

    if (active) {
      this.detachAllViews()
      return
    }

    if (accountId !== undefined) {
      this.activeAccountId = accountId
    }

    this.reattachAllViews()
    this.applyVisibility()
  }

  isOverlayActive(): boolean {
    return this.overlayActive
  }

  destroyView(accountId: string): void {
    const view = this.views.get(accountId)
    if (!view) {
      return
    }

    this.hooks?.onViewDestroyed?.(accountId, view)
    this.detachView(view)

    if (!view.webContents.isDestroyed()) {
      view.webContents.removeAllListeners()
      view.webContents.close()
    }

    this.views.delete(accountId)

    if (this.activeAccountId === accountId) {
      this.activeAccountId = null
    }
  }

  reloadView(accountId: string): void {
    const view = this.views.get(accountId)
    if (!view || view.webContents.isDestroyed()) {
      return
    }

    void view.webContents.reload()
  }

  async clearSession(accountId: string): Promise<void> {
    const view = this.views.get(accountId)
    if (!view || view.webContents.isDestroyed()) {
      return
    }

    await view.webContents.session.clearStorageData()
    await view.webContents.session.clearCache()
  }

  getView(accountId: string): WebContentsView | undefined {
    return this.views.get(accountId)
  }

  /** Keeps a messaging view attached so background DOM polling works while the shell is hidden. */
  ensureViewAttached(accountId: string): void {
    const view = this.views.get(accountId)
    if (!view || this.overlayActive) {
      return
    }

    this.ensureAttached(view)
  }

  resizeActiveView(bounds: ViewBounds): void {
    this.contentBounds = bounds

    if (this.overlayActive) {
      return
    }

    const effectiveBounds = this.getEffectiveBounds()
    for (const view of this.attachedViews) {
      view.setBounds(effectiveBounds)
    }
  }

  hasView(accountId: string): boolean {
    return this.views.has(accountId)
  }

  getActiveAccountId(): string | null {
    return this.activeAccountId
  }

  async restoreViews(accounts: MessagingAccount[]): Promise<void> {
    for (const account of accounts) {
      if (account.enabled) {
        this.createView(account)
      }
    }
  }

  private applyVisibility(): void {
    const bounds = this.getEffectiveBounds()

    for (const [id, view] of this.views) {
      if (!this.attachedViews.has(view)) {
        continue
      }

      const isActive = id === this.activeAccountId
      view.setBounds(bounds)
      view.setVisible(isActive)
    }

    if (this.activeAccountId) {
      const active = this.views.get(this.activeAccountId)
      if (active && this.attachedViews.has(active)) {
        this.raiseView(active)
        this.focusActiveView()
      }
    }
  }

  focusActiveView(): void {
    if (this.overlayActive || !this.activeAccountId) {
      return
    }

    const active = this.views.get(this.activeAccountId)
    if (!active || active.webContents.isDestroyed()) {
      return
    }

    active.webContents.focus()
  }

  private reattachAllViews(): void {
    for (const view of this.views.values()) {
      this.ensureAttached(view)
    }
  }

  private ensureAttached(view: WebContentsView): void {
    const mainWindow = this.getMainWindow()
    if (!mainWindow || this.attachedViews.has(view)) {
      return
    }

    mainWindow.contentView.addChildView(view)
    this.attachedViews.add(view)
    view.setBounds(this.getEffectiveBounds())
  }

  private detachView(view: WebContentsView): void {
    const mainWindow = this.getMainWindow()
    if (!mainWindow) {
      return
    }

    view.setVisible(false)
    view.setBounds(HIDDEN_BOUNDS)

    if (!this.attachedViews.has(view)) {
      return
    }

    try {
      mainWindow.contentView.removeChildView(view)
    } catch {
      // View was not attached.
    }

    this.attachedViews.delete(view)
  }

  private detachAllViews(): void {
    for (const view of [...this.attachedViews]) {
      this.detachView(view)
    }
  }

  private raiseView(view: WebContentsView): void {
    const mainWindow = this.getMainWindow()
    if (!mainWindow) {
      return
    }

    try {
      mainWindow.contentView.removeChildView(view)
    } catch {
      // View was not attached yet.
    }
    mainWindow.contentView.addChildView(view)
    view.setBounds(this.getEffectiveBounds())
    view.setVisible(true)
  }

  private getEffectiveBounds(): ViewBounds {
    if (this.contentBounds.width > 0 && this.contentBounds.height > 0) {
      return this.contentBounds
    }

    const mainWindow = this.getMainWindow()
    if (!mainWindow) {
      return this.contentBounds
    }

    const [width, height] = mainWindow.getContentSize()
    const sidebarWidth = 224
    const tabHeight = 40

    return {
      x: sidebarWidth,
      y: tabHeight,
      width: Math.max(0, width - sidebarWidth),
      height: Math.max(0, height - tabHeight)
    }
  }

  private setupNotificationBlocker(view: WebContentsView): void {
    const inject = (): void => {
      if (view.webContents.isDestroyed()) {
        return
      }
      void view.webContents.executeJavaScript(BLOCK_WEB_NOTIFICATIONS_SCRIPT, true).catch(() => {
        // Ignore injection failures on transient blank pages.
      })
    }

    view.webContents.on('dom-ready', inject)
  }

  private setupLoadHandlers(view: WebContentsView, accountId: string): void {
    view.webContents.on('did-finish-load', () => {
      if (!this.views.has(accountId) || view.webContents.isDestroyed()) {
        return
      }

      if (view.webContents.getURL() === 'about:blank') {
        return
      }

      if (this.overlayActive) {
        return
      }

      this.ensureAttached(view)
      view.setBounds(this.getEffectiveBounds())
      view.setVisible(this.activeAccountId === accountId)

      if (this.activeAccountId === accountId) {
        this.raiseView(view)
        this.focusActiveView()
      }
    })
  }

  private setupNavigationGuard(view: WebContentsView, platform: Platform): void {
    const allowedOrigins = ALLOWED_PLATFORM_ORIGINS[platform]

    view.webContents.setWindowOpenHandler(({ url }) => {
      if (allowedOrigins.some((origin) => url.startsWith(origin))) {
        void view.webContents.loadURL(url)
      } else {
        void shell.openExternal(url)
      }
      return { action: 'deny' }
    })

    view.webContents.on('will-navigate', (event, url) => {
      const isAllowed = allowedOrigins.some((origin) => url.startsWith(origin))
      if (!isAllowed) {
        event.preventDefault()
        void shell.openExternal(url)
      }
    })
  }
}

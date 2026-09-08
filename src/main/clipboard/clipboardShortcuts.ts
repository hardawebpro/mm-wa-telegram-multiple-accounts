import type { BrowserWindow, WebContentsView } from 'electron'
import type { MessagingViewManager } from '../messaging/MessagingViewManager'

function isClipboardShortcut(input: Electron.Input): boolean {
  if (input.type !== 'keyDown') {
    return false
  }

  const mod = input.control || input.meta
  if (!mod || input.alt) {
    return false
  }

  const key = input.key.toLowerCase()
  return key === 'c' || key === 'v' || key === 'x' || key === 'a'
}

function runClipboardCommand(webContents: Electron.WebContents, input: Electron.Input): boolean {
  const key = input.key.toLowerCase()

  if (key === 'c' && !input.shift) {
    webContents.copy()
    return true
  }

  if (key === 'v' && !input.shift) {
    webContents.paste()
    return true
  }

  if (key === 'x' && !input.shift) {
    webContents.cut()
    return true
  }

  if (key === 'a' && !input.shift) {
    webContents.selectAll()
    return true
  }

  return false
}

export function registerClipboardShortcuts(
  getMainWindow: () => BrowserWindow | null,
  getViewManager: () => MessagingViewManager | null
): void {
  const mainWindow = getMainWindow()
  if (!mainWindow) {
    return
  }

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (!isClipboardShortcut(input)) {
      return
    }

    const viewManager = getViewManager()
    if (!viewManager || viewManager.isOverlayActive()) {
      return
    }

    const activeAccountId = viewManager.getActiveAccountId()
    if (!activeAccountId) {
      return
    }

    const messagingView = viewManager.getView(activeAccountId)
    if (!messagingView || messagingView.webContents.isDestroyed()) {
      return
    }

    const messagingContents = messagingView.webContents

    // Messaging view already focused — let Chromium handle it natively.
    if (messagingContents.isFocused()) {
      return
    }

    // Shell has focus (e.g. after clicking sidebar) — forward to active WhatsApp/Telegram view.
    if (runClipboardCommand(messagingContents, input)) {
      event.preventDefault()
    }
  })
}

export function attachMessagingClipboardFocus(view: WebContentsView): void {
  view.webContents.on('before-input-event', (_event, input) => {
    if (input.type === 'mouseDown') {
      view.webContents.focus()
    }
  })
}

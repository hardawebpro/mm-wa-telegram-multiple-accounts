import { app, BrowserWindow } from 'electron'
import { APP_NAME, APP_USER_MODEL_ID } from '@shared/constants/app'
import { MessagingViewManager } from './messaging/MessagingViewManager'
import { AccountsStore } from './store/accounts'
import { SettingsStore, UiStateStore } from './store/settings'
import { registerIpcHandlers } from './ipc/registerIpc'
import { createMainWindow } from './window/createMainWindow'
import { NotificationService } from './notifications/NotificationService'
import { TrayManager } from './tray/TrayManager'
import { configureMessagingSessionPermissions } from './session/permissions'
import { createApplicationMenu } from './menu/applicationMenu'
import {
  attachMessagingClipboardFocus,
  registerClipboardShortcuts
} from './clipboard/clipboardShortcuts'

let mainWindow: BrowserWindow | null = null
let viewManager: MessagingViewManager | null = null
let notificationService: NotificationService | null = null
let trayManager: TrayManager | null = null

const accountsStore = new AccountsStore()
const settingsStore = new SettingsStore()
const uiStateStore = new UiStateStore()

async function restoreSession(): Promise<void> {
  if (!viewManager) {
    return
  }

  const settings = settingsStore.get()
  const uiState = uiStateStore.get()
  const accounts = accountsStore.list().filter((account) => account.enabled)

  await viewManager.restoreViews(accounts)

  const openedIds = settings.general.restoreOpenedTabs
    ? uiState.openedAccountIds.filter((id) => accounts.some((account) => account.id === id))
    : []

  if (openedIds.length === 0 && accounts.length > 0) {
    openedIds.push(accounts[0].id)
  }

  let activeId: string | null = null
  if (settings.general.restoreLastActiveAccount && uiState.activeAccountId) {
    activeId = openedIds.includes(uiState.activeAccountId) ? uiState.activeAccountId : openedIds[0] ?? null
  } else {
    activeId = openedIds[0] ?? null
  }

  if (activeId && !uiState.settingsOpen) {
    viewManager.showView(activeId)
  } else {
    viewManager.hideAllViews()
  }
}

function createWindow(): void {
  mainWindow = createMainWindow()

  trayManager = new TrayManager(() => mainWindow, () => settingsStore.get())
  trayManager.init()
  trayManager.attachToWindow(mainWindow)

  notificationService = new NotificationService({
    getMainWindow: () => mainWindow,
    getViewManager: () => viewManager,
    accountsStore,
    showMainWindow: () => trayManager?.showMainWindow(),
    onOpenAccount: (accountId, chatLabel) => {
      mainWindow?.webContents.send('notification:open-account', { accountId, chatLabel })
    },
    onUnreadChanged: (accountId, unreadCount) => {
      mainWindow?.webContents.send('account:unread-changed', { accountId, unreadCount })
    }
  })

  viewManager = new MessagingViewManager(() => mainWindow, {
    onViewCreated: (account, view) => {
      configureMessagingSessionPermissions(account.partition, account.platform, account.id, accountsStore)
      notificationService?.attachToView(account.id, view, account.platform)
      attachMessagingClipboardFocus(view)
    },
    onViewDestroyed: (accountId, view) => {
      notificationService?.detachFromView(accountId, view)
    }
  })

  registerIpcHandlers({
    viewManager,
    accountsStore,
    settingsStore,
    uiStateStore,
    isDev: !app.isPackaged
  })

  registerClipboardShortcuts(() => mainWindow, () => viewManager)

  void restoreSession()

  const notifyRendererResize = (): void => {
    mainWindow?.webContents.send('window:resized')
    setTimeout(() => mainWindow?.webContents.send('window:resized'), 50)
    setTimeout(() => mainWindow?.webContents.send('window:resized'), 150)
  }

  mainWindow.on('resize', notifyRendererResize)
  mainWindow.on('maximize', notifyRendererResize)
  mainWindow.on('unmaximize', notifyRendererResize)
  mainWindow.on('enter-full-screen', notifyRendererResize)
  mainWindow.on('leave-full-screen', notifyRendererResize)
}

app.whenReady().then(() => {
  app.setName(APP_NAME)

  if (process.platform === 'win32') {
    app.setAppUserModelId(APP_USER_MODEL_ID)
  }

  createApplicationMenu()
  createWindow()

  app.on('before-quit', () => {
    trayManager?.markQuitting()
    notificationService?.dispose()
    trayManager?.dispose()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else {
      mainWindow?.show()
      mainWindow?.focus()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

import { app, BrowserWindow, powerMonitor } from 'electron'
import { APP_NAME, APP_USER_MODEL_ID } from '@shared/constants/app'
import { MessagingViewManager } from './messaging/MessagingViewManager'
import { AccountsStore } from './store/accounts'
import { SettingsStore, UiStateStore } from './store/settings'
import { registerIpcHandlers } from './ipc/registerIpc'
import { createMainWindow } from './window/createMainWindow'
import { NotificationService } from './notifications/NotificationService'
import { logNotificationEvent } from './notifications/notificationLog'
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
let pendingSecondInstanceFocus = false

const accountsStore = new AccountsStore()
const settingsStore = new SettingsStore()
const uiStateStore = new UiStateStore()

function isMainWindowForeground(): boolean {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return false
  }

  return mainWindow.isVisible() && mainWindow.isFocused() && !mainWindow.isMinimized()
}

function accountNotificationsEnabled(accountId: string): boolean {
  return accountsStore.getSettings(accountId).notificationsEnabled
}

function updateBackgroundSyncState(): void {
  if (trayManager?.isHiddenInTray()) {
    viewManager?.setShellVisible(false)
    notificationService?.enterBackgroundSync()
    return
  }

  if (!isMainWindowForeground()) {
    viewManager?.setShellVisible(false)
    notificationService?.enterBackgroundSync()
    return
  }

  const multiAccountSync =
    viewManager?.needsMultiAccountSync(accountNotificationsEnabled) ?? false

  if (multiAccountSync) {
    const wasShellVisible = viewManager?.isShellVisible() ?? true
    viewManager?.setShellVisible(false)
    notificationService?.exitBackgroundSync()
    if (wasShellVisible) {
      logNotificationEvent('sync-mode-multi')
    }
    return
  }

  viewManager?.setShellVisible(true)
  notificationService?.exitBackgroundSync()
}

function focusExistingWindow(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    trayManager?.showMainWindow()
    updateBackgroundSyncState()
    return
  }

  pendingSecondInstanceFocus = true
}

const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    focusExistingWindow()
  })
}

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
    isDev: !app.isPackaged,
    onMessagingSyncStateChange: () => updateBackgroundSyncState()
  })

  registerClipboardShortcuts(() => mainWindow, () => viewManager)

  void restoreSession().then(() => updateBackgroundSyncState())

  let syncBoundsTimer: ReturnType<typeof setTimeout> | null = null

  const syncBoundsFromShellAndReflow = (): void => {
    void viewManager?.syncBoundsFromShell().then((updated) => {
      if (updated) {
        viewManager?.reapplyContentBounds()
      }
    })
  }

  const scheduleDebouncedSyncBoundsFromShell = (): void => {
    if (syncBoundsTimer) {
      clearTimeout(syncBoundsTimer)
    }
    syncBoundsTimer = setTimeout(() => {
      syncBoundsTimer = null
      syncBoundsFromShellAndReflow()
    }, 250)
  }

  const scheduleStaggeredSyncBoundsFromShell = (): void => {
    for (const delayMs of [0, 100, 300, 500, 800]) {
      if (delayMs === 0) {
        syncBoundsFromShellAndReflow()
      } else {
        setTimeout(() => syncBoundsFromShellAndReflow(), delayMs)
      }
    }
  }

  const pingRendererResize = (extendedDelays: boolean): void => {
    const delays = extendedDelays ? [0, 50, 150, 300, 500, 800] : [0, 50, 150]
    for (const delayMs of delays) {
      if (delayMs === 0) {
        mainWindow?.webContents.send('window:resized')
      } else {
        setTimeout(() => mainWindow?.webContents.send('window:resized'), delayMs)
      }
    }
    if (extendedDelays) {
      scheduleStaggeredSyncBoundsFromShell()
    } else {
      scheduleDebouncedSyncBoundsFromShell()
    }
  }

  mainWindow.on('resize', () => pingRendererResize(false))
  mainWindow.on('maximize', () => pingRendererResize(true))
  mainWindow.on('unmaximize', () => pingRendererResize(true))
  mainWindow.on('enter-full-screen', () => pingRendererResize(true))
  mainWindow.on('leave-full-screen', () => pingRendererResize(true))
  mainWindow.on('restore', () => pingRendererResize(true))

  trayManager = new TrayManager(() => mainWindow, () => settingsStore.get(), {
    onShellHidden: () => updateBackgroundSyncState(),
    onShellShown: () => updateBackgroundSyncState()
  })
  trayManager.init()
  trayManager.attachToWindow(mainWindow)

  mainWindow.on('hide', updateBackgroundSyncState)
  mainWindow.on('show', updateBackgroundSyncState)
  mainWindow.on('minimize', updateBackgroundSyncState)
  mainWindow.on('restore', updateBackgroundSyncState) // also pingRendererResize above
  mainWindow.on('blur', updateBackgroundSyncState)
  mainWindow.on('focus', updateBackgroundSyncState)

  powerMonitor.on('resume', () => {
    notificationService?.onSystemWake()
  })

  powerMonitor.on('unlock-screen', () => {
    notificationService?.onSystemWake()
  })

  updateBackgroundSyncState()

  if (pendingSecondInstanceFocus) {
    pendingSecondInstanceFocus = false
    focusExistingWindow()
  }
}

app.commandLine.appendSwitch('disable-background-timer-throttling')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion,IntensiveWakeUpThrottling')

if (gotSingleInstanceLock) {
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
        updateBackgroundSyncState()
      }
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}

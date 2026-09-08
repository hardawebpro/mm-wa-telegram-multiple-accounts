import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { getAppWindowIcon } from '../utils/icons'

const SHELL_WEB_PREFERENCES = {
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
  webSecurity: true,
  preload: join(__dirname, '../preload/index.js')
} as const

export function createMainWindow(): BrowserWindow {
  const windowIcon = getAppWindowIcon()
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'MM WA Telegram Multiple Accounts',
    ...(windowIcon.isEmpty() ? {} : { icon: windowIcon }),
    webPreferences: SHELL_WEB_PREFERENCES
  })

  mainWindow.setMenu(null)

  mainWindow.on('ready-to-show', () => {
    mainWindow.maximize()
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  const rendererUrl = process.env['ELECTRON_RENDERER_URL']
  if (rendererUrl) {
    void mainWindow.loadURL(rendererUrl)
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

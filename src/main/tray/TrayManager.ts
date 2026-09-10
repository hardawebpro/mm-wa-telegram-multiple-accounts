import { app, BrowserWindow, Menu, Tray } from 'electron'
import { APP_WINDOW_TITLE } from '@shared/constants/app'
import type { AppSettings } from '@shared/types'
import { getTrayIcon } from '../utils/icons'

export class TrayManager {
  private tray: Tray | null = null
  private isQuitting = false

  constructor(
    private readonly getMainWindow: () => BrowserWindow | null,
    private readonly getSettings: () => AppSettings
  ) {}

  init(): void {
    this.ensureTray()
  }

  attachToWindow(window: BrowserWindow): void {
    window.on('minimize', () => {
      if (this.shouldMinimizeToTray()) {
        this.hideToTray(window)
      }
    })

    window.on('close', (event) => {
      if (this.isQuitting || !this.shouldCloseToTray()) {
        return
      }

      event.preventDefault()
      this.hideToTray(window)
    })
  }

  markQuitting(): void {
    this.isQuitting = true
  }

  showMainWindow(): void {
    this.revealMainWindow()
  }

  dispose(): void {
    this.tray?.destroy()
    this.tray = null
  }

  private shouldMinimizeToTray(): boolean {
    return this.getSettings().general.minimizeToTray
  }

  private shouldCloseToTray(): boolean {
    return this.getSettings().general.closeToTray
  }

  private ensureTray(): void {
    if (this.tray) {
      return
    }

    this.tray = new Tray(getTrayIcon())
    this.tray.setToolTip(APP_WINDOW_TITLE)
    this.tray.setContextMenu(this.buildContextMenu())

    this.tray.on('click', () => {
      this.revealMainWindow()
    })

    this.tray.on('double-click', () => {
      this.revealMainWindow()
    })
  }

  private buildContextMenu(): Menu {
    return Menu.buildFromTemplate([
      {
        label: 'Show',
        click: () => this.revealMainWindow()
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          this.markQuitting()
          app.quit()
        }
      }
    ])
  }

  private hideToTray(window: BrowserWindow): void {
    this.ensureTray()
    window.setSkipTaskbar(true)
    window.hide()
  }

  private revealMainWindow(): void {
    const window = this.getMainWindow()
    if (!window || window.isDestroyed()) {
      return
    }

    window.setSkipTaskbar(false)
    if (window.isMinimized()) {
      window.restore()
    }
    window.show()
    window.focus()
  }
}

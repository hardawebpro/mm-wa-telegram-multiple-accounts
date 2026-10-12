import type { BrowserWindow } from 'electron'
import type { ViewBounds } from '@shared/types'

const READ_SHELL_MESSAGING_BOUNDS_SCRIPT = `(() => {
  const el = document.querySelector('[data-messaging-surface]')
  if (!el) {
    return null
  }
  const r = el.getBoundingClientRect()
  if (r.width <= 0 || r.height <= 0) {
    return null
  }
  return {
    x: Math.round(r.x),
    y: Math.round(r.y),
    width: Math.round(r.width),
    height: Math.round(r.height)
  }
})()`

export async function readShellMessagingBounds(mainWindow: BrowserWindow): Promise<ViewBounds | null> {
  if (mainWindow.isDestroyed() || mainWindow.webContents.isDestroyed()) {
    return null
  }

  try {
    const bounds = await mainWindow.webContents.executeJavaScript(READ_SHELL_MESSAGING_BOUNDS_SCRIPT, true)
    if (
      !bounds ||
      typeof bounds !== 'object' ||
      typeof bounds.x !== 'number' ||
      typeof bounds.y !== 'number' ||
      typeof bounds.width !== 'number' ||
      typeof bounds.height !== 'number' ||
      bounds.width <= 0 ||
      bounds.height <= 0
    ) {
      return null
    }
    return bounds as ViewBounds
  } catch {
    return null
  }
}

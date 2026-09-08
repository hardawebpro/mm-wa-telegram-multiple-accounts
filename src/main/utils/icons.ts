import { existsSync } from 'fs'
import { join } from 'path'
import { app, nativeImage } from 'electron'

export type ResourceIconSize = 16 | 32 | 256 | 1024

export function getResourcesDir(): string {
  const candidates = app.isPackaged
    ? [
        join(process.resourcesPath, 'resources'),
        join(process.resourcesPath, 'app.asar.unpacked', 'resources'),
        join(app.getAppPath(), 'resources')
      ]
    : [
        join(__dirname, '../../resources'),
        join(__dirname, '../resources'),
        join(process.cwd(), 'resources'),
        join(app.getAppPath(), 'resources')
      ]

  for (const dir of candidates) {
    if (existsSync(join(dir, '32.png'))) {
      return dir
    }
  }

  return join(__dirname, '../../resources')
}

export function getResourceIconPath(size: ResourceIconSize): string {
  return join(getResourcesDir(), `${size}.png`)
}

export function loadNativeIcon(size: ResourceIconSize): Electron.NativeImage {
  const image = nativeImage.createFromPath(getResourceIconPath(size))
  return image.isEmpty() ? nativeImage.createEmpty() : image
}

export function getAppWindowIcon(): Electron.NativeImage {
  const icon256 = loadNativeIcon(256)
  if (!icon256.isEmpty()) {
    return icon256
  }

  return loadNativeIcon(1024)
}

export function getTrayIcon(): Electron.NativeImage {
  const icon32 = loadNativeIcon(32)
  if (!icon32.isEmpty()) {
    icon32.setTemplateImage(false)
    return icon32
  }

  const icon16 = loadNativeIcon(16)
  icon16.setTemplateImage(false)
  return icon16
}

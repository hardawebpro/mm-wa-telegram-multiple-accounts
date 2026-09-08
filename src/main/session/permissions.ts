import { session } from 'electron'
import { ALLOWED_PLATFORM_ORIGINS } from '@shared/constants/platformUrls'
import type { Platform } from '@shared/types'

export function configureMessagingSessionPermissions(partition: string, platform: Platform): void {
  const ses = session.fromPartition(partition)
  const allowedOrigins = ALLOWED_PLATFORM_ORIGINS[platform]

  const isAllowedOrigin = (origin: string): boolean => {
    try {
      return allowedOrigins.includes(new URL(origin).origin)
    } catch {
      return false
    }
  }

  ses.setPermissionRequestHandler((_webContents, permission, callback, details) => {
    if (permission === 'notifications' && details.requestingUrl && isAllowedOrigin(details.requestingUrl)) {
      callback(true)
      return
    }
    callback(false)
  })

  ses.setPermissionCheckHandler((_webContents, permission, requestingOrigin) => {
    if (permission === 'notifications') {
      return isAllowedOrigin(requestingOrigin)
    }
    return false
  })
}

import { session, systemPreferences } from 'electron'
import { ALLOWED_PLATFORM_ORIGINS } from '@shared/constants/platformUrls'
import type { AccountSettings } from '@shared/types'
import type { Platform } from '@shared/types'
import type { AccountsStore } from '../store/accounts'

function isAllowedOrigin(origin: string, platform: Platform): boolean {
  try {
    return ALLOWED_PLATFORM_ORIGINS[platform].includes(new URL(origin).origin)
  } catch {
    return false
  }
}

function resolveRequestOrigin(details: Electron.PermissionRequest): string | null {
  if ('requestingUrl' in details && typeof details.requestingUrl === 'string' && details.requestingUrl) {
    try {
      return new URL(details.requestingUrl).origin
    } catch {
      return null
    }
  }
  if ('securityOrigin' in details && typeof details.securityOrigin === 'string' && details.securityOrigin) {
    return details.securityOrigin
  }
  return null
}

function isMediaAllowedBySettings(
  settings: AccountSettings,
  mediaTypes: Array<'video' | 'audio'> | undefined
): boolean {
  const types = mediaTypes ?? ['audio', 'video']
  const wantsVideo = types.includes('video')
  const wantsAudio = types.includes('audio')

  if (wantsVideo) {
    return settings.videoCallsEnabled
  }

  if (wantsAudio) {
    return settings.voiceCallsEnabled
  }

  return settings.voiceCallsEnabled || settings.videoCallsEnabled
}

async function ensureMacMediaAccess(mediaTypes: Array<'video' | 'audio'> | undefined): Promise<boolean> {
  if (process.platform !== 'darwin') {
    return true
  }

  const types = mediaTypes ?? ['audio', 'video']

  if (types.includes('audio')) {
    const micStatus = systemPreferences.getMediaAccessStatus('microphone')
    if (micStatus !== 'granted') {
      const granted = await systemPreferences.askForMediaAccess('microphone')
      if (!granted) {
        return false
      }
    }
  }

  if (types.includes('video')) {
    const cameraStatus = systemPreferences.getMediaAccessStatus('camera')
    if (cameraStatus !== 'granted') {
      const granted = await systemPreferences.askForMediaAccess('camera')
      if (!granted) {
        return false
      }
    }
  }

  return true
}

export function configureMessagingSessionPermissions(
  partition: string,
  platform: Platform,
  accountId: string,
  accountsStore: AccountsStore
): void {
  const ses = session.fromPartition(partition)
  const configuredKey = '__mmwaPermissionsConfigured'
  if ((ses as unknown as Record<string, boolean>)[configuredKey]) {
    return
  }
  ;(ses as unknown as Record<string, boolean>)[configuredKey] = true

  ses.setPermissionRequestHandler((_webContents, permission, callback, details) => {
    const origin = resolveRequestOrigin(details)
    const originAllowed = origin ? isAllowedOrigin(origin, platform) : false

    if (permission === 'notifications' && originAllowed) {
      callback(true)
      return
    }

    if (permission === 'media' && originAllowed) {
      const mediaDetails = details as Electron.MediaAccessPermissionRequest
      const settings = { ...accountsStore.getSettings(accountId) }

      if (!isMediaAllowedBySettings(settings, mediaDetails.mediaTypes)) {
        callback(false)
        return
      }

      void ensureMacMediaAccess(mediaDetails.mediaTypes).then((osGranted) => {
        callback(osGranted)
      })
      return
    }

    if (permission === 'speaker-selection' && originAllowed) {
      const settings = accountsStore.getSettings(accountId)
      callback(settings.voiceCallsEnabled || settings.videoCallsEnabled)
      return
    }

    callback(false)
  })

  ses.setPermissionCheckHandler((_webContents, permission, requestingOrigin, details) => {
    if (!isAllowedOrigin(requestingOrigin, platform)) {
      return false
    }

    const settings = accountsStore.getSettings(accountId)

    if (permission === 'notifications') {
      return true
    }

    if (permission === 'media') {
      const mediaType = details.mediaType
      const mediaTypes =
        mediaType && mediaType !== 'unknown' ? ([mediaType] as Array<'video' | 'audio'>) : undefined
      return isMediaAllowedBySettings(settings, mediaTypes)
    }

    return false
  })
}

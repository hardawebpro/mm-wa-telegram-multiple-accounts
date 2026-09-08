import type { Platform } from '../types'

export const WHATSAPP_WEB_URL = 'https://web.whatsapp.com/'

/** Official Telegram Web K client */
export const TELEGRAM_WEB_URL = 'https://web.telegram.org/k/'

export function getPlatformUrl(platform: Platform): string {
  return platform === 'whatsapp' ? WHATSAPP_WEB_URL : TELEGRAM_WEB_URL
}

export const ALLOWED_PLATFORM_ORIGINS: Record<Platform, string[]> = {
  whatsapp: ['https://web.whatsapp.com'],
  telegram: ['https://web.telegram.org']
}

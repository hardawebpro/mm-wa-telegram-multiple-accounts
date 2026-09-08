import type { Platform } from '@shared/types'
import type { WebContents } from 'electron'

export function parseUnreadCountFromTitle(title: string): number {
  if (!title) {
    return 0
  }

  const patterns = [
    /^\((\d+)\+?\)/,
    /\((\d+)\+?\)/,
    /^（(\d+)）/,
    /（(\d+)）/
  ]

  for (const pattern of patterns) {
    const match = title.match(pattern)
    if (match) {
      return Number.parseInt(match[1], 10)
    }
  }

  return 0
}

const WHATSAPP_UNREAD_SCRIPT = `
(function() {
  const fromTitle = (document.title.match(/\\((\\d+)\\+?\\)/) || [])[1]
  if (fromTitle) {
    return parseInt(fromTitle, 10)
  }

  let total = 0
  const rows = document.querySelectorAll('#pane-side [role="listitem"], #pane-side [role="row"]')
  rows.forEach(function(row) {
    const label = row.getAttribute('aria-label') || ''
    const labelMatch = label.match(/(\\d+)\\s*unread/i)
    if (labelMatch) {
      total += parseInt(labelMatch[1], 10)
      return
    }

    const unreadBadge = row.querySelector('[aria-label*="unread" i]')
    if (unreadBadge) {
      const badgeText = (unreadBadge.textContent || '').trim()
      if (/^\\d+$/.test(badgeText)) {
        total += parseInt(badgeText, 10)
      }
    }
  })

  return total
})()
`

const TELEGRAM_UNREAD_SCRIPT = `
(function() {
  const fromTitle = (document.title.match(/\\((\\d+)\\+?\\)/) || [])[1]
  if (fromTitle) {
    return parseInt(fromTitle, 10)
  }

  let total = 0
  document.querySelectorAll('.chatlist-chat, .ChatBadge, .badge').forEach(function(el) {
    const text = (el.textContent || '').trim()
    if (/^\\d+$/.test(text)) {
      total += parseInt(text, 10)
    }
  })

  return total
})()
`

export async function pollUnreadCount(webContents: WebContents, platform: Platform): Promise<number> {
  if (webContents.isDestroyed()) {
    return 0
  }

  const titleUnread = parseUnreadCountFromTitle(webContents.getTitle())

  try {
    const script = platform === 'telegram' ? TELEGRAM_UNREAD_SCRIPT : WHATSAPP_UNREAD_SCRIPT
    const domUnread = await webContents.executeJavaScript(script, true)
    if (typeof domUnread === 'number' && Number.isFinite(domUnread)) {
      // Prefer DOM total — WhatsApp Business title often stays at (1) regardless of count.
      return Math.max(domUnread, 0)
    }
  } catch {
    // Fall back to document title when DOM polling is unavailable.
  }

  return titleUnread
}

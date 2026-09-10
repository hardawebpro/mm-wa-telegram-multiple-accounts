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

export function extractPreviewFromTitle(title: string): string | null {
  if (!title) {
    return null
  }

  const cleaned = title.replace(/^\(\d+\+?\)\s*/, '').trim()
  if (!cleaned) {
    return null
  }

  if (/^whatsapp$/i.test(cleaned) || /^telegram$/i.test(cleaned)) {
    return null
  }

  return cleaned.length > 120 ? `${cleaned.slice(0, 117)}...` : cleaned
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
  const chatList = document.querySelector('.chatlist, .ChatFolders, #LeftColumn')
  if (!chatList) {
    return 0
  }

  chatList.querySelectorAll('.chatlist-chat, .ChatBadge.unread, .dialog-subtitle-badge-unread').forEach(function(el) {
    const text = (el.textContent || '').trim()
    if (/^\\d+$/.test(text)) {
      total += parseInt(text, 10)
    }
  })

  return total
})()
`

export interface UnreadChatPreview {
  chatName: string
  messagePreview: string | null
}

const WHATSAPP_LATEST_UNREAD_SCRIPT = `
(function() {
  var rows = Array.prototype.slice.call(
    document.querySelectorAll('#pane-side [role="listitem"], #pane-side [role="row"], [data-testid="cell-frame-container"]')
  );

  function hasUnread(row) {
    if (row.querySelector('[aria-label*="unread" i], [data-testid="icon-unread-count"]')) return true;
    return /\\d+\\s*unread/i.test(row.getAttribute('aria-label') || '');
  }

  function isTimeOrMeta(text) {
    if (!text) return true;
    if (/^\\d{1,2}:\\d{2}(\\s*[AP]M)?$/i.test(text)) return true;
    if (/^(yesterday|today|senin|selasa|rabu|kamis|jumat|sabtu|minggu|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i.test(text)) return true;
    if (/^\\d+\\s*unread/i.test(text)) return true;
    return false;
  }

  function parseAriaLabel(row) {
    var aria = (row.getAttribute('aria-label') || '').trim();
    if (!aria) return null;

    var parts = aria.split(',').map(function(part) { return part.trim(); }).filter(Boolean);
    if (parts.length < 2) return null;

    var chatName = parts[0];
    var messagePreview = null;

    for (var i = 1; i < parts.length; i++) {
      var part = parts[i];
      if (/\\d+\\s*unread/i.test(part)) continue;
      if (isTimeOrMeta(part)) continue;
      messagePreview = part;
      break;
    }

    return { chatName: chatName, messagePreview: messagePreview };
  }

  function rowName(row) {
    var parsed = parseAriaLabel(row);
    if (parsed && parsed.chatName) return parsed.chatName;

    var span = row.querySelector('span[title][dir="auto"], span[dir="auto"]');
    var fromSpan = span ? (span.getAttribute('title') || span.textContent || '') : '';
    return fromSpan.trim();
  }

  function rowPreview(row, chatName) {
    var parsed = parseAriaLabel(row);
    if (parsed && parsed.messagePreview) return parsed.messagePreview;

    var lastMsg = row.querySelector('[data-testid="last-msg"], [data-testid="last-msg-status"]');
    if (lastMsg) {
      var fromTestId = (lastMsg.textContent || '').trim();
      if (fromTestId && fromTestId !== chatName && !isTimeOrMeta(fromTestId)) {
        return fromTestId;
      }
    }

    var candidates = row.querySelectorAll('span[dir="ltr"], span[title]');
    for (var i = 0; i < candidates.length; i++) {
      var text = (candidates[i].textContent || '').trim();
      if (!text || text === chatName) continue;
      if (isTimeOrMeta(text)) continue;
      if (text.length > 0 && text.length < 300) return text;
    }

    return null;
  }

  for (var i = 0; i < rows.length; i++) {
    if (!hasUnread(rows[i])) continue;
    var chatName = rowName(rows[i]);
    if (!chatName) continue;
    return { chatName: chatName, messagePreview: rowPreview(rows[i], chatName) };
  }
  return null;
})()
`

const TELEGRAM_LATEST_UNREAD_SCRIPT = `
(function() {
  var chats = Array.prototype.slice.call(
    document.querySelectorAll('.chatlist-chat, a.ListItem, .ListItem-button, .chat-item')
  );

  function hasUnread(el) {
    return Boolean(
      el.querySelector('.badge.unread, .ChatBadge.unread, .dialog-subtitle-badge-unread, .unread, .chat-badge-transition')
    );
  }

  function chatName(el) {
    var title = el.querySelector('.peer-title, .title, .user-title, .dialog-title, h3, .name');
    return ((title && title.textContent) || '').trim();
  }

  function chatPreview(el, name) {
    var subtitle = el.querySelector(
      '.subtitle, .last-message, .dialog-subtitle, .message-subtitle, .last-message-summary'
    );
    var fromSubtitle = subtitle ? (subtitle.textContent || '').trim() : '';
    if (fromSubtitle && fromSubtitle !== name) return fromSubtitle;

    var aria = (el.getAttribute('aria-label') || '').trim();
    if (aria) {
      var parts = aria.split(',').map(function(part) { return part.trim(); }).filter(Boolean);
      if (parts.length >= 2 && parts[1] !== name) return parts[1];
    }

    return null;
  }

  for (var i = 0; i < chats.length; i++) {
    if (!hasUnread(chats[i])) continue;
    var name = chatName(chats[i]);
    if (!name) continue;
    return { chatName: name, messagePreview: chatPreview(chats[i], name) };
  }
  return null;
})()
`

function normalizeUnreadChatPreview(result: unknown): UnreadChatPreview | null {
  if (
    result &&
    typeof result === 'object' &&
    typeof (result as UnreadChatPreview).chatName === 'string' &&
    (result as UnreadChatPreview).chatName.trim()
  ) {
    const chatName = (result as UnreadChatPreview).chatName.trim()
    const rawPreview = (result as UnreadChatPreview).messagePreview
    const messagePreview =
      typeof rawPreview === 'string' && rawPreview.trim() && rawPreview.trim() !== chatName
        ? rawPreview.trim()
        : null

    return { chatName, messagePreview }
  }

  return null
}

export async function pollLatestUnreadChat(
  webContents: WebContents,
  platform: Platform
): Promise<UnreadChatPreview | null> {
  if (webContents.isDestroyed()) {
    return null
  }

  try {
    const script = platform === 'telegram' ? TELEGRAM_LATEST_UNREAD_SCRIPT : WHATSAPP_LATEST_UNREAD_SCRIPT
    const result = await webContents.executeJavaScript(script, true)
    return normalizeUnreadChatPreview(result)
  } catch {
    return null
  }
}

export async function pollLatestUnreadChatWithRetry(
  webContents: WebContents,
  platform: Platform,
  maxAttempts = 5
): Promise<UnreadChatPreview | null> {
  let best: UnreadChatPreview | null = null

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const current = await pollLatestUnreadChat(webContents, platform)
    if (current) {
      best = current
      if (current.messagePreview) {
        return current
      }
    }

    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 200 + attempt * 150))
    }
  }

  return best
}

export async function pollUnreadCount(webContents: WebContents, platform: Platform): Promise<number> {
  if (webContents.isDestroyed()) {
    return 0
  }

  const titleUnread = parseUnreadCountFromTitle(webContents.getTitle())

  try {
    const script = platform === 'telegram' ? TELEGRAM_UNREAD_SCRIPT : WHATSAPP_UNREAD_SCRIPT
    const domUnread = await webContents.executeJavaScript(script, true)
    if (typeof domUnread === 'number' && Number.isFinite(domUnread)) {
      const normalizedDom = Math.max(domUnread, 0)
      // Prefer DOM total when available; fall back to title when DOM returns zero but title has a count.
      if (normalizedDom > 0) {
        return normalizedDom
      }
      return titleUnread
    }
  } catch {
    // Fall back to document title when DOM polling is unavailable.
  }

  return titleUnread
}

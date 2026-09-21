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

const GENERIC_MESSAGING_TITLE = /^(whatsapp|whatsapp business|telegram)$/i

export function isGenericMessagingTitle(label: string | null | undefined): boolean {
  if (!label) {
    return true
  }

  return GENERIC_MESSAGING_TITLE.test(label.trim())
}

export function extractPreviewFromTitle(title: string): string | null {
  if (!title) {
    return null
  }

  const cleaned = title.replace(/^\(\d+\+?\)\s*/, '').trim()
  if (!cleaned || isGenericMessagingTitle(cleaned)) {
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
  const pane = document.querySelector('#pane-side') || document.querySelector('[aria-label="Chat list"]')
  if (!pane) {
    return 0
  }

  const rows = pane.querySelectorAll('[role="listitem"], [role="row"], [data-testid="cell-frame-container"]')
  rows.forEach(function(row) {
    const label = row.getAttribute('aria-label') || ''
    const labelMatch = label.match(/(\\d+)\\s*unread/i)
    if (labelMatch) {
      total += parseInt(labelMatch[1], 10)
      return
    }

    const unreadBadge = row.querySelector('[aria-label*="unread" i], [data-testid="icon-unread-count"]')
    if (unreadBadge) {
      const badgeLabel = unreadBadge.getAttribute('aria-label') || ''
      const badgeMatch = badgeLabel.match(/(\\d+)/)
      if (badgeMatch) {
        total += parseInt(badgeMatch[1], 10)
        return
      }
      const badgeText = (unreadBadge.textContent || '').trim()
      if (/^\\d+$/.test(badgeText)) {
        total += parseInt(badgeText, 10)
        return
      }
      total += 1
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
  var pane = document.querySelector('#pane-side') || document.querySelector('[aria-label="Chat list"]');
  if (!pane) return null;

  var rows = Array.prototype.slice.call(
    pane.querySelectorAll('[role="listitem"], [role="row"], [data-testid="cell-frame-container"]')
  );

  function unreadCount(row) {
    var badge = row.querySelector('[aria-label*="unread" i], [data-testid="icon-unread-count"]');
    if (badge) {
      var badgeLabel = badge.getAttribute('aria-label') || '';
      var badgeMatch = badgeLabel.match(/(\\d+)/);
      if (badgeMatch) return parseInt(badgeMatch[1], 10);
      var badgeText = (badge.textContent || '').trim();
      if (/^\\d+$/.test(badgeText)) return parseInt(badgeText, 10);
      return 1;
    }
    var aria = row.getAttribute('aria-label') || '';
    var ariaMatch = aria.match(/(\\d+)\\s*unread/i);
    return ariaMatch ? parseInt(ariaMatch[1], 10) : 0;
  }

  function isTimeOrMeta(text) {
    if (!text) return true;
    if (/^\\d{1,2}:\\d{2}(\\s*[AP]M)?$/i.test(text)) return true;
    if (/^(yesterday|today|senin|selasa|rabu|kamis|jumat|sabtu|minggu|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i.test(text)) return true;
    if (/^\\d+\\s*unread/i.test(text)) return true;
    if (/^\\d+$/.test(text)) return true;
    return false;
  }

  function parseRow(row) {
    var titled = row.querySelector('span[title][dir="auto"], span[title]');
    var chatName = titled ? (titled.getAttribute('title') || titled.textContent || '').trim() : '';
    if (!chatName) {
      var aria = (row.getAttribute('aria-label') || '').trim();
      chatName = aria ? aria.split(',')[0].trim() : '';
    }
    if (!chatName) return null;

    var ariaParts = (row.getAttribute('aria-label') || '').split(',').map(function(part) {
      return part.trim();
    }).filter(Boolean);
    var messagePreview = null;
    for (var p = 1; p < ariaParts.length; p++) {
      var part = ariaParts[p];
      if (isTimeOrMeta(part)) continue;
      messagePreview = part;
      break;
    }

    if (!messagePreview) {
      var lines = (row.innerText || '').split('\\n').map(function(line) {
        return line.trim();
      }).filter(Boolean);
      var previewLines = lines.filter(function(line) {
        return line !== chatName && !isTimeOrMeta(line);
      });
      for (var i = previewLines.length - 1; i >= 0; i--) {
        var candidate = previewLines[i];
        if (!isTimeOrMeta(candidate)) {
          messagePreview = candidate;
          break;
        }
      }
    }

    if (!messagePreview) {
      var lastMsg = row.querySelector('[data-testid="last-msg"], [data-testid="last-msg-status"]');
      if (lastMsg) {
        var fromTestId = (lastMsg.textContent || '').trim();
        if (fromTestId && fromTestId !== chatName && !isTimeOrMeta(fromTestId)) {
          messagePreview = fromTestId;
        }
      }
    }

    if (!messagePreview) {
      var secondary = row.querySelector('[data-testid="cell-frame-secondary"]');
      if (secondary) {
        var secondaryLines = (secondary.innerText || '').split('\\n').map(function(line) {
          return line.trim();
        }).filter(Boolean);
        for (var s = 0; s < secondaryLines.length; s++) {
          var secondaryLine = secondaryLines[s];
          if (secondaryLine !== chatName && !isTimeOrMeta(secondaryLine)) {
            messagePreview = secondaryLine;
            break;
          }
        }
      }
    }

    if (!messagePreview) {
      var spans = row.querySelectorAll('span[dir="auto"], span[dir="ltr"]');
      for (var j = 0; j < spans.length; j++) {
        var span = spans[j];
        var spanText = (span.textContent || '').trim();
        if (!spanText || spanText === chatName || isTimeOrMeta(spanText)) continue;
        if (span.getAttribute('title') === chatName) continue;
        messagePreview = spanText;
        break;
      }
    }

    return { chatName: chatName, messagePreview: messagePreview };
  }

  for (var i = 0; i < rows.length; i++) {
    if (unreadCount(rows[i]) <= 0) continue;
    var parsed = parseRow(rows[i]);
    if (parsed && parsed.chatName) return parsed;
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

export interface PollLatestUnreadChatOptions {
  maxAttempts?: number
  /** Extra delay between attempts when the shell window is hidden (e.g. system tray). */
  backgroundMode?: boolean
  /** Stop retrying after this many milliseconds (returns best result so far). */
  maxWaitMs?: number
}

export async function pollLatestUnreadChatWithRetry(
  webContents: WebContents,
  platform: Platform,
  options: PollLatestUnreadChatOptions = {}
): Promise<UnreadChatPreview | null> {
  const maxAttempts = options.maxAttempts ?? 5
  const backgroundMode = options.backgroundMode ?? false
  const maxWaitMs = options.maxWaitMs
  const startedAt = Date.now()
  let best: UnreadChatPreview | null = null

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (maxWaitMs !== undefined && Date.now() - startedAt >= maxWaitMs) {
      break
    }

    const current = await pollLatestUnreadChat(webContents, platform)
    if (current) {
      best = current
      if (current.messagePreview) {
        return current
      }
    }

    if (attempt < maxAttempts - 1) {
      const baseDelay = backgroundMode ? 300 : 200
      const stepDelay = backgroundMode ? 200 : 150
      const delayMs = baseDelay + attempt * stepDelay
      if (maxWaitMs !== undefined && Date.now() - startedAt + delayMs >= maxWaitMs) {
        break
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs))
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

import type { Platform } from '@shared/types'
import type { WebContents } from 'electron'

function buildFocusChatScript(platform: Platform, chatLabel: string | null): string {
  const labelJson = JSON.stringify(chatLabel)

  if (platform === 'telegram') {
    return `
(function(label) {
  function normalize(value) {
    return (value || '').trim().toLowerCase();
  }

  var target = normalize(label);
  var chats = Array.prototype.slice.call(
    document.querySelectorAll('.chatlist-chat, a.ListItem, .ListItem-button')
  );

  function chatName(el) {
    var title = el.querySelector('.peer-title, .title, .user-title, .dialog-title, h3');
    return normalize(title ? title.textContent : '');
  }

  function hasUnread(el) {
    return Boolean(
      el.querySelector('.badge.unread, .ChatBadge.unread, .dialog-subtitle-badge-unread, .unread')
    );
  }

  function openChat(el) {
    var link = el.closest('a') || el.querySelector('a') || el;
    link.click();
    return true;
  }

  if (target) {
    for (var i = 0; i < chats.length; i++) {
      var name = chatName(chats[i]);
      if (!name) continue;
      if (name === target || name.indexOf(target) !== -1 || target.indexOf(name) !== -1) {
        return openChat(chats[i]);
      }
    }
  }

  for (var j = 0; j < chats.length; j++) {
    if (hasUnread(chats[j])) {
      return openChat(chats[j]);
    }
  }

  return false;
})(${labelJson})
`
  }

  return `
(function(label) {
  function normalize(value) {
    return (value || '').trim().toLowerCase();
  }

  var target = normalize(label);
  var pane = document.querySelector('#pane-side') || document.querySelector('[aria-label="Chat list"]');
  if (!pane) return false;

  var rows = Array.prototype.slice.call(
    pane.querySelectorAll('[role="listitem"], [role="row"], [data-testid="cell-frame-container"]')
  );

  function rowName(row) {
    var titled = row.querySelector('span[title][dir="auto"], span[title]');
    var fromTitle = titled ? (titled.getAttribute('title') || titled.textContent || '') : '';
    var aria = row.getAttribute('aria-label') || '';
    var fromAria = aria.split(',')[0] || '';
    return normalize(fromTitle || fromAria);
  }

  function hasUnread(row) {
    if (row.querySelector('[aria-label*="unread" i], [data-testid="icon-unread-count"]')) {
      return true;
    }
    return /\\d+\\s*unread/i.test(row.getAttribute('aria-label') || '');
  }

  function openRow(row) {
    var focusable = row.querySelector('[tabindex="-1"], [tabindex="0"]') || row;
    focusable.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
    focusable.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
    focusable.click();
    if (typeof focusable.focus === 'function') {
      focusable.focus();
    }
    return true;
  }

  if (target) {
    for (var i = 0; i < rows.length; i++) {
      var name = rowName(rows[i]);
      if (!name) continue;
      if (name === target || name.indexOf(target) !== -1 || target.indexOf(name) !== -1) {
        return openRow(rows[i]);
      }
    }
  }

  for (var j = 0; j < rows.length; j++) {
    if (hasUnread(rows[j])) {
      return openRow(rows[j]);
    }
  }

  return false;
})(${labelJson})
`
}

export async function focusChatInView(
  webContents: WebContents,
  platform: Platform,
  chatLabel: string | null
): Promise<boolean> {
  if (webContents.isDestroyed()) {
    return false
  }

  try {
    const script = buildFocusChatScript(platform, chatLabel)
    const result = await webContents.executeJavaScript(script, true)
    return result === true
  } catch {
    return false
  }
}

export async function focusChatWithRetry(
  webContents: WebContents,
  platform: Platform,
  chatLabel: string | null,
  maxAttempts = 6
): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const focused = await focusChatInView(webContents, platform, chatLabel)
    if (focused) {
      return true
    }

    await new Promise((resolve) => setTimeout(resolve, 150 + attempt * 200))
  }

  return false
}

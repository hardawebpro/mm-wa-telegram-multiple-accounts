---
name: mm-wa-telegram
description: Maintain and implement MM WA Telegram Multiple Accounts — Electron desktop app for multiple WhatsApp and Telegram accounts via WebContentsView. Use for any task in this repository involving architecture, Electron, React UI, accounts, sessions, IPC, or Phase 1 features.
---

# MM WA Telegram Multiple Accounts

## Before any work

1. Read `about.md` completely (canonical product spec).
2. Follow every applicable file in `.cursor/rules/`.
3. Do not change protected product decisions without explicit user approval.

## Architecture summary

- **Stack:** Electron, TypeScript, React, Vite/electron-vite, Tailwind CSS.
- **Messaging:** One `WebContentsView` per account in the main process via `MessagingViewManager`.
- **Sessions:** Unique persistent partition per account (`persist:mmwa-{platform}-{id}`).
- **UI shell:** React renderer for sidebar, tabs, settings only.
- **IPC:** Validated channels (`domain:action`) through a narrow preload bridge (`window.mmwa`).

## Key files

```
src/main/messaging/MessagingViewManager.ts   # view lifecycle
src/main/session/partition.ts                # partition helpers
src/main/store/accounts.ts                   # account metadata persistence
src/main/store/settings.ts                   # app settings persistence
src/main/ipc/                                # IPC handlers
src/preload/index.ts                         # contextBridge API
src/shared/types/                            # MessagingAccount, AppState, etc.
src/shared/schemas/                          # Zod IPC validation
src/renderer/src/                            # React shell UI
```

## Account model

```ts
interface MessagingAccount {
  id: string;
  name: string;
  platform: "whatsapp" | "telegram";
  type: "personal" | "business" | "standard";
  partition: string;
  avatar?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}
```

Never use phone numbers or usernames as primary account IDs.

## Forbidden patterns

- `<webview>`, `iframe`, `BrowserView`, one BrowserWindow per account
- Node integration inside messaging web views
- Storing auth cookies/tokens in config files
- Bulk messaging, scraping, unofficial API integration (Phase 1)
- Restyling WhatsApp Web or Telegram Web DOM

## Phase 1 Definition of Done checklist

Before claiming Phase 1 complete, verify manually:

- [ ] Add Personal WA → QR scan → account loads
- [ ] Add Business WA → second QR → account loads
- [ ] Add Telegram → authenticate → account loads
- [ ] All accounts remain logged in simultaneously
- [ ] Sidebar shows all accounts; expand/collapse works
- [ ] Tabs switch without logout, reload, or session merge
- [ ] Account settings and application settings work
- [ ] Close and reopen → sessions, tabs, and UI state restored
- [ ] WhatsApp Personal, WhatsApp Business, and Telegram sessions remain isolated

## User verification handoff

After every code change, end with a concrete verification section listing commands to run and manual behaviors to test.

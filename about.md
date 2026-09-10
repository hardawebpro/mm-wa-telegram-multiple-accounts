# MM WA Telegram Multiple Accounts

<p align="center">
  <img src="resources/256.png" alt="MM WA Telegram Multiple Accounts application icon" width="128" height="128" />
</p>

<p align="center">
  <img src="./screenshot.jpg" alt="MM WA Telegram Multiple Accounts dark mode — sidebar, account tabs, and WhatsApp Web with demo chat data" width="960" />
</p>

<p align="center"><em>Screenshot (dark mode, v0.1.0 Beta) — demo contact names and messages only; no real phone numbers.</em></p>

## About

**Application Name:** MM WA Telegram Multiple Accounts  
**Version:** 0.1.0 Beta  
**Release Status:** Beta — features, UI, and behavior may change; expect occasional bugs before a stable release  
**Application Type:** Portable desktop application (no Windows installer in Phase 1)  
**Primary Platform:** Windows 10+ (64-bit)  
**Application Language:** English  
**Distribution:** Free and open source (MIT license; source + launcher scripts; not an official Meta or Telegram product)  
**Pricing:** Free — no paid tiers, subscriptions, or in-app purchases

## Beta release

The current public build is a **beta** version (`0.1.0-beta` in `package.json`).

- Intended for early adopters and testers on Windows 10+
- Not feature-complete relative to the long-term product vision
- Breaking changes, refactors, and bug fixes are expected between beta builds
- Users should report issues with OS version, app version, and steps to reproduce

The running application shows the version in:

- the **window title bar** (e.g. `MM WA Telegram Multiple Accounts - 0.1.0 Beta`)
- the **sidebar footer** (expanded mode)
- **Settings → About**

## Portable distribution (no installer)

MM WA Telegram Multiple Accounts is designed as a **portable app** in Phase 1. Users do **not** run a traditional setup installer (`.exe`) to install the application into Program Files.

### What the user does

1. Download or clone the repository and **extract** it to any writable folder (e.g. `Documents\MM-WA-Telegram`, USB drive, or Desktop subfolder).
2. Install **Node.js LTS** once from [nodejs.org](https://nodejs.org/) if not already present — this is the only system-level dependency.
3. Run **`setup-first-time.bat`** once in the project folder. It runs `npm install` to download JavaScript dependencies into `node_modules` inside that folder.
4. Launch the app from the **Desktop shortcut**, **Start Menu shortcut** (both created by setup), or **`start-app.vbs`** in the project folder.

Setup also registers a **Start Menu shortcut** with the Windows **AppUserModelID** (`com.jbs.mm-wa-telegram-multiple-accounts`) so desktop toast notifications display **MM WA Telegram Multiple Accounts** instead of the raw app ID. Re-run `setup-first-time.bat` or `create-desktop-shortcut.bat` after moving the project folder. Launch from a shortcut — not `npm run dev` — for proper notification identity on Windows.

### Why this is safe and portable

- **No app installer:** The application itself is not registered in Add/Remove Programs and does not require administrator rights for normal use.
- **Folder = app:** The entire app lives in the folder the user chose. Moving or deleting that folder removes the app files (not WhatsApp/Telegram sessions — see below).
- **Dependencies are local:** `node_modules` stays inside the project directory; nothing is copied to `Program Files` by this project’s launchers.
- **Credentials stay isolated:** WhatsApp and Telegram authentication cookies and tokens are **never** stored in application JSON config files. Each account uses a persistent Electron partition; session data lives under the standard Chromium/Electron user-data location for the app, separate from the portable project folder.
- **One-time Node.js install:** Node.js is a development runtime used to run Electron from source in Phase 1. It is installed once on the PC, similar to installing Java or Python for other portable tools.

### What is not portable by default

Login sessions for WhatsApp Web and Telegram Web persist in Electron’s user profile on that Windows user account. Clearing an account session or uninstalling Electron user data is done per account in **Settings**, not by deleting the project folder alone.

## Background

MM WA Telegram Multiple Accounts is a desktop application built to manage multiple WhatsApp and Telegram accounts from a single Electron application.

The application is designed for users who need to operate several WhatsApp Personal, WhatsApp Business, and Telegram accounts without opening multiple browser profiles or separate browser windows.

Each account runs inside its own isolated persistent Electron session. This allows every WhatsApp or Telegram account to maintain an independent login state, cookies, local storage, and web session.

The application uses WhatsApp Web and Telegram Web as the underlying communication interfaces. Therefore, messaging functionality available inside MM WA Telegram Multiple Accounts depends on the features currently supported by the corresponding web clients.

The application must not be described or presented as an official WhatsApp, Meta, or Telegram application.

## Core Concept

One desktop application can contain multiple WhatsApp accounts.

Example:

```text
MM WA Telegram Multiple Accounts
├── WhatsApp Personal
├── WhatsApp Business Jakarta
├── Telegram Personal
└── Telegram Support
```

Each account has:

- its own persistent login session
- its own WebContentsView
- its own platform type
- its own account settings
- its own tab
- its own sidebar entry
- its own local application metadata

Switching between accounts must not log out, reload, or merge sessions.

## Technology Stack

Use:

- Electron
- TypeScript
- React
- Vite / electron-vite
- Tailwind CSS

Use Electron `WebContentsView` for WhatsApp Web instances.

Do not use:

- `<webview>`
- `iframe`
- `BrowserView`
- one BrowserWindow per account
- Node.js integration inside WhatsApp Web

## Supported Platforms and Account Types

The application must support:

- WhatsApp Personal
- WhatsApp Business
- Telegram

WhatsApp accounts use:

```text
https://web.whatsapp.com/
```

Telegram accounts use an official Telegram Web client.

The platform and account type must be stored as application metadata and may later be used for labels, filtering, settings, grouping, and templates.

## Messaging Platform Feature Scope

MM WA Telegram Multiple Accounts does not recreate WhatsApp or Telegram.

It hosts WhatsApp Web and Telegram Web inside isolated Electron sessions.

Features available in the application therefore follow the capabilities and limitations of the corresponding official web clients.

Typical supported WhatsApp Web functions include:

- text chat
- images
- videos
- documents
- voice messages
- contact sharing
- desktop notifications (native web toasts are disabled in this app; see **Desktop Notifications**)
- Status viewing
- Status replies
- voice and video calls where supported by WhatsApp Web or Telegram Web (see **Voice and Video Calls** below)

Some WhatsApp native/mobile features may be unavailable or limited on WhatsApp Web or linked devices.

Known examples include:

- Live Location
- Broadcast List management on linked devices
- some WhatsApp Business linked-device features
- some Status capabilities
- WhatsApp Flows on linked devices
- mobile-only features introduced by WhatsApp

Do not attempt to emulate unsupported native WhatsApp functionality unless it can be implemented safely at the application layer without bypassing WhatsApp systems.

## Voice and Video Calls

MM WA Telegram Multiple Accounts **supports voice and video calls** when the underlying WhatsApp Web or Telegram Web session offers them.

How it works:

- Calls run inside the official web client (WebRTC). The application does not implement a separate calling stack.
- Microphone and camera access is granted through Electron `media` permissions for allowed origins only (`web.whatsapp.com`, `web.telegram.org`).
- Each account has independent call settings under **Settings → Accounts → Account Settings**:
  - **Voice calls (microphone)** — allow audio for voice calls
  - **Video calls (camera + microphone)** — allow camera and audio for video calls
- Both options are **enabled by default** for new accounts. Disable them per account if you do not want calls on that account.
- Device selection (microphone, speaker, camera) uses the standard picker inside WhatsApp Web or Telegram Web.

Requirements and limits:

- **Windows 10+:** Allow microphone and camera for the app in **Settings → Privacy & security → Microphone / Camera** if Windows prompts or blocks access.
- Call availability still depends on Meta/Telegram, account type, linked-device rules, and region — the application cannot enable calls if the web client does not offer them.
- Restart the application after changing call permission settings if a call still fails immediately after toggling options.

## Desktop Notifications

Desktop notifications are handled by the **application shell** (`NotificationService`), not by native WhatsApp Web or Telegram Web toasts. Web notification permission inside messaging views is **denied** to avoid duplicate, non-actionable system toasts.

Behavior:

- Unread counts are polled from each account’s web view (title + DOM).
- When unread increases and the app is hidden, unfocused, or on another account tab, the shell shows a Windows/macOS desktop notification.
- Per account: **Notifications**, **Sound**, and **Notification preview** (chat name + last message snippet when available).
- **Click notification:** restore from system tray, switch to the account tab, and open the related chat in the web client when identifiable.
- Notification preview text is read from the chat list DOM (e.g. WhatsApp `aria-label` on unread rows).

Windows requirements:

- `app.setAppUserModelId('com.jbs.mm-wa-telegram-multiple-accounts')` must match shortcuts created by `setup-first-time.bat` / `create-desktop-shortcut.bat`.
- Users should **launch from Desktop or Start Menu shortcut** for the correct toast app name (**MM WA Telegram Multiple Accounts**). Launching via `npm run dev` may show the raw AppUserModelID in the toast header.

Implementation files:

```text
src/main/notifications/NotificationService.ts
src/main/notifications/unreadMonitor.ts
src/main/notifications/focusChat.ts
src/main/notifications/blockWebNotifications.ts
scripts/create-windows-shortcuts.ps1
```

## Custom Application Features

MM WA Telegram Multiple Accounts may add productivity features that are independent from WhatsApp itself.

Planned examples:

- custom text templates
- quick replies
- reusable response snippets
- categorized reply templates
- account-specific templates
- text variables/placeholders
- template search
- keyboard shortcuts
- favorite replies
- recent replies

Example:

```text
Templates
├── Greeting
├── Pricing
├── Address
├── Follow Up
└── Custom
```

A text-template feature should allow the user to choose a prepared reply, insert it into the active WhatsApp conversation composer, optionally edit it, and then send it manually.

Phase 1 must not include bulk messaging, spam automation, contact scraping, or unofficial WhatsApp protocol manipulation.

## Main Application Layout

```text
┌──────────────────────────────────────────────────────────────┐
│ Tabs                                                         │
├──────────────┬───────────────────────────────────────────────┤
│              │                                               │
│ Sidebar      │                                               │
│              │                                               │
│ Account 1    │              WhatsApp Web                     │
│ Account 2    │                                               │
│ Account 3    │              Active Account                   │
│              │                                               │
│ Settings     │                                               │
│              │                                               │
└──────────────┴───────────────────────────────────────────────┘
```

## Sidebar

The sidebar must support:

- expanded mode
- compact mode
- account avatar/icon
- account name
- unread indicator
- active account state
- Add Account button
- Settings button

Expanded mode should show icon/avatar and account information.

Compact mode should show icons/avatars only.

Use tooltips when the sidebar is compact.

Example state:

```ts
sidebarMode: "expanded" | "compact";
```

## Tabs

Each opened account must have its own tab with a **platform icon** (WhatsApp green / Telegram blue) beside the account name.

Example:

```text
[ WA Personal ] [ WA Business ] [ TG Support ] [+]
```

A tab represents one account workspace.

Closing a tab must not:

- log out WhatsApp
- delete the account
- delete its session

It only removes the tab from the visible tab bar.

## Account Model

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

Never use a WhatsApp phone number, Telegram phone number, username, or chat identifier as the application's primary account identifier.

## Persistent Sessions

Every account must use a unique persistent Electron partition.

Example:

```text
WhatsApp A → persist:mmwa-whatsapp-a
WhatsApp B → persist:mmwa-whatsapp-b
Telegram A → persist:mmwa-telegram-a
```

Never share one partition between multiple WhatsApp accounts.

Do not manually store WhatsApp or Telegram authentication cookies or tokens in application configuration files.

Electron session storage must manage platform session data.

## WebContentsView Manager

Create a centralized service:

```text
MessagingViewManager
```

Responsibilities:

```text
createView(accountId)
showView(accountId)
hideView(accountId)
destroyView(accountId)
reloadView(accountId)
clearSession(accountId)
getView(accountId)
resizeActiveView(bounds)
```

Use:

```ts
Map<string, WebContentsView>;
```

Only the selected account view should be visible.

Inactive views may remain alive to maintain connection and notifications.

Do not destroy and recreate views every time the user switches tabs.

## Settings

Application settings:

```text
Settings
├── General
├── Appearance
├── Accounts
├── About
└── Advanced
```

### General

- Launch at startup
- Start minimized
- Minimize to tray
- Close to tray
- Restore last active account
- Restore opened tabs

### Appearance

- System theme
- Light theme
- Dark theme
- Expanded sidebar
- Compact sidebar
- Font size preset: **XS**, **S** (default), **M**, **L** — shell UI only; messaging web clients use their own zoom per account

### Accounts

Each account may provide:

- Account Name
- Account Type
- Avatar/Icon
- Enabled state
- Notifications
- Sound
- Notification preview (chat name and message snippet in desktop toast)
- Voice calls (microphone)
- Video calls (camera + microphone)
- Zoom factor
- Open
- Edit
- Reload
- Logout
- Delete

### About

- Application name and version (beta)
- Portable app explanation
- **Report a bug on GitHub** (opens issue tracker)
- View repository link

### Advanced

- Clear account cache
- Clear account session
- Reload WhatsApp
- Open DevTools in development mode
- Reset application settings

## Account-Specific Settings

Each account can support:

```ts
interface AccountSettings {
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  notificationPreviewEnabled: boolean;
  voiceCallsEnabled: boolean;
  videoCallsEnabled: boolean;
  zoomFactor: number;
  backgroundMode: "active" | "suspended";
}
```

Global appearance settings include:

```ts
interface AppearanceSettings {
  theme: "system" | "light" | "dark";
  sidebarMode: "expanded" | "compact";
  fontSize: "xs" | "s" | "m" | "l";
}
```

Account settings must remain independent from global application settings.

## Add Account Flow

```text
Add Account
     ↓
Enter Account Name
     ↓
Select Account Type
     ↓
Create Unique Account ID
     ↓
Create Persistent Partition
     ↓
Create WebContentsView
     ↓
Load the selected platform web client
     ↓
Display the platform login flow
     ↓
User authenticates the account
     ↓
Account Ready
```

Do not automate QR scanning, OTP entry, or account authentication.

## Delete Account Flow

Deleting an account must require confirmation.

Deletion must:

1. destroy its WebContentsView
2. clear its Electron session
3. remove account metadata
4. close its tab
5. remove it from the sidebar

## Performance Strategy

Multiple WhatsApp Web and Telegram Web instances consume Chromium resources.

Phase 1 behavior:

- active account: visible and fully active
- inactive opened accounts: alive but hidden
- deleted accounts: destroyed
- closed tabs: session remains available unless the account itself is deleted

A future optional feature may suspend inactive accounts.

Suspension must not be enabled by default because it can affect background connectivity and notifications.

## UI State

React manages application UI state only.

Example:

```ts
interface AppState {
  activeAccountId: string | null;
  openedAccountIds: string[];
  sidebarMode: "expanded" | "compact";
  settingsOpen: boolean;
}
```

Electron `WebContentsView` instances for all messaging platforms must remain exclusively in the Main Process.

## Security Requirements

Remote messaging web views must use:

```text
nodeIntegration: false
contextIsolation: true
sandbox: true
webSecurity: true
```

Never expose:

- Node.js
- filesystem access
- `child_process`
- raw `ipcRenderer`
- unrestricted Electron APIs

to WhatsApp Web or Telegram Web.

Use a restricted preload bridge for the React renderer.

Every IPC handler must validate input.

Restrict navigation and external links appropriately.

## Design System

All MM WA Telegram Multiple Accounts UI must use Tailwind CSS.

Do not modify or restyle WhatsApp Web or Telegram Web unless a future feature explicitly requires a safe compatibility layer.

Application UI must remain in English.

Example labels:

- Accounts
- Add Account
- Settings
- General
- Appearance
- Notifications
- Account Settings
- Reload WhatsApp
- Logout
- Delete Account
- Cancel
- Save Changes

## Modular Architecture

The application is free and open source. Optional future modules must remain separated from the core messaging account/session layer, for example:

```text
updates/
backup/
profiles/
workspace/
templates/
platforms/
```

Do not add paid licensing, subscription tiers, payment flows, or usage-based billing. The product stays free for all users.

## Phase 1 Scope

Required:

- Electron application
- TypeScript
- React
- Tailwind CSS
- secure BrowserWindow
- expandable/compact sidebar
- account tabs
- multiple WhatsApp accounts
- WhatsApp Personal support
- WhatsApp Business support
- Telegram support
- persistent session per account
- WebContentsView per account
- add account
- rename account
- delete account
- switch account
- persistent login
- global settings
- account settings
- light/dark/system theme
- remembered UI state
- secure IPC
- secure WhatsApp Web renderer
- secure Telegram Web renderer

Not required in Phase 1 (and permanently out of scope for this product):

- paid licensing or license server
- payment or billing integration
- subscription tiers
- cloud synchronization
- analytics
- remote database
- CRM
- AI chatbot
- bulk sender
- contact scraping
- unofficial WhatsApp API integration
- auto updater

## Future Features

Possible future features:

- Custom Auto Text
- Text Templates
- Quick Replies
- Account-specific templates
- Placeholder variables
- Template categories
- Favorite replies
- Keyboard shortcuts
- Searchable templates
- enhanced notification management (beyond Phase 1 shell toasts)
- extended tray integration
- application auto update

Any feature that interacts with WhatsApp Web or Telegram Web must be designed so it does not bypass platform security, authentication, or service restrictions.

Paid features, license keys, and subscription systems are not planned for this application.

## Definition of Done — Phase 1

Phase 1 is complete when:

```text
Launch MM WA Telegram Multiple Accounts

→ Add "Personal"
→ Scan WhatsApp QR
→ Personal account loads

→ Add "Business"
→ Scan another WhatsApp QR
→ Business account loads

→ Add "Telegram"
→ Authenticate Telegram
→ Telegram account loads

→ All accounts remain logged in

→ Sidebar displays all accounts

→ Tabs can switch between accounts

→ Sidebar can expand and collapse

→ Account settings work

→ Application settings work

→ Close application

→ Reopen application

→ Sessions remain logged in

→ Tabs and UI state are restored

→ WhatsApp Personal, WhatsApp Business, and Telegram authentication sessions remain isolated
```

## Documentation

User-facing guides and repository entry points:

- [CARA-PAKAI.txt](CARA-PAKAI.txt) — panduan singkat Bahasa Indonesia (mulai dari download ZIP)
- [README.md](README.md) — overview, requirements, quick start, troubleshooting (English + Indonesian)
- [docs/HOW_TO_USE.en.md](docs/HOW_TO_USE.en.md) — step-by-step guide (English)
- [docs/HOW_TO_USE.id.md](docs/HOW_TO_USE.id.md) — panduan langkah demi langkah (Bahasa Indonesia)

**Public distribution (current):** Beta portable build — users download or clone this repository, install Node.js once, run `setup-first-time.bat`, then launch from the **Desktop or Start Menu shortcut**. There is no signed `.exe` installer in Phase 1. See **Portable distribution (no installer)** and **Desktop Notifications** above.

**Repository:** [github.com/hardawebpro/mm-wa-telegram-multiple-accounts](https://github.com/hardawebpro/mm-wa-telegram-multiple-accounts) — report bugs via **Settings → About** or GitHub Issues.

# How to Use — MM WA Telegram Multiple Accounts

Step-by-step guide for **Windows 10+** users. You only need **Command Prompt**, **PowerShell**, or **Windows Terminal**. Git and an IDE are **optional**.

---

## 1. What you need

| Item | Required? | Notes |
|------|-----------|-------|
| Windows 10 or 11 (64-bit) | Yes | Windows 7/8 are not supported |
| Node.js 20 or 22 LTS | Yes | Download once from [https://nodejs.org/](https://nodejs.org/) |
| npm | Yes | Included with Node.js |
| Internet | Yes | For install, WhatsApp Web, Telegram Web |
| Git | No | You can download ZIP instead |
| VS Code / IDE | No | Double-click `.bat` files is enough |

---

## 2. Get the application

### Option A — Download ZIP (recommended)

1. Open the GitHub repository page.
2. Click **Code → Download ZIP**.
3. Extract to a writable folder, for example:
   ```text
   C:\Users\YourName\Documents\MM-WA-Telegram\
   ```
4. Do **not** run the app from `Program Files` unless you have admin rights for `npm install`.

### Option B — Git clone (developers)

```cmd
git clone <repository-url>
cd mm-wa-telegram-multiple-accounts
```

---

## 3. Install Node.js (one time)

1. Go to [https://nodejs.org/](https://nodejs.org/).
2. Download **LTS** (20.x or 22.x).
3. Run the installer.
4. Keep **"Add to PATH"** checked.
5. **Close and reopen** Command Prompt or PowerShell after install.
6. Verify:

```cmd
node -v
npm -v
```

You should see version numbers (e.g. `v20.x.x` and `10.x.x`).

---

## 4. First-time setup

### Easiest: double-click

1. Open the extracted project folder in File Explorer.
2. Double-click **`setup-first-time.bat`**.
3. Wait for `npm install` to finish (first run only).
4. A Desktop shortcut **"MM WA Telegram Multiple Accounts"** is created.

### Using Command Prompt

```cmd
cd /d C:\Users\YourName\Documents\MM-WA-Telegram\mm-wa-telegram-multiple-accounts
setup-first-time.bat
```

### Using PowerShell

```powershell
cd "C:\Users\YourName\Documents\MM-WA-Telegram\mm-wa-telegram-multiple-accounts"
.\setup-first-time.bat
```

### Using Windows Terminal

Same commands as above — choose **Command Prompt** or **PowerShell** profile.

---

## 5. Launch the app (every day)

**Recommended:** Double-click the **Desktop shortcut**.

Alternative from project folder:

```cmd
start-app.bat
```

Or for developers:

```cmd
npm run dev
```

### Important

- **Do not** move only `start-app.bat` to the Desktop — it needs the full project folder (`package.json`, `node_modules`, etc.).
- The Desktop shortcut runs `start-app.bat` with the correct **Start in** folder automatically.

---

## 6. Add and use accounts

### WhatsApp Personal or Business

1. Click **+** or **Add Account**.
2. Enter a name (e.g. `Business Jakarta`).
3. Choose **WhatsApp** and account type.
4. Wait for WhatsApp Web to load.
5. On your phone: **Linked devices → Link a device** → scan the QR code.
6. Repeat for each WhatsApp account.

### Telegram

1. Click **Add Account**.
2. Choose **Telegram**.
3. Sign in with phone number or QR as shown on Telegram Web.

### Switch accounts

- Click an account in the **sidebar** or **tab bar**.
- Sessions stay logged in; switching does not merge accounts.

---

## 7. Useful settings

Open **Settings** (gear icon):

| Setting | Description |
|---------|-------------|
| Minimize to tray | Hide to system tray when minimizing |
| Close to tray | Keep running in tray when clicking X |
| Notifications | Desktop alerts for new messages |
| Voice calls (microphone) | Allow voice calls via WhatsApp Web / Telegram Web |
| Video calls (camera + microphone) | Allow video calls when the web client supports them |
| Restore opened tabs | Reopen tabs after restart |

If a call fails, enable **Voice calls** / **Video calls** for that account, then check **Windows Settings → Privacy & security → Microphone / Camera** for this app.

---

## 8. Logout or remove an account

1. Open **Settings → Accounts**.
2. Select the account.
3. **Delete Account** — removes metadata and destroys the session partition (logs out).

To reload without deleting: use **Reload** in account settings.

---

## 9. Where data is stored

| Data | Location |
|------|----------|
| Account names, settings | Electron userData `store\` folder |
| WhatsApp/Telegram login (cookies) | Electron partition folders on your PC |
| Project files | Your extracted/cloned folder |

Nothing is sent to a developer server in Phase 1.

---

## 10. Manual Desktop shortcut (if script fails)

If `create-desktop-shortcut.bat` fails (e.g. PowerShell blocked):

1. Right-click Desktop → **New → Shortcut**.
2. **Target:** browse to `start-app.bat` inside the project folder.
3. **Start in:** the project folder (same folder as `package.json`).
4. Name it `MM WA Telegram Multiple Accounts`.
5. Right-click shortcut → **Properties → Change Icon** → select `resources\256.ico`.

---

## 11. Uninstall

1. Delete the project folder.
2. Delete the Desktop shortcut.
3. Optional: remove app data from `%APPDATA%` (search for folder related to the app name / Electron userData).

---

## 12. Troubleshooting

### Node.js / npm

| Symptom | Cause | Fix |
|---------|-------|-----|
| `'node' is not recognized` | Node not installed or PATH stale | Install LTS; restart terminal |
| `'npm' is not recognized` | Broken Node install | Reinstall Node.js |
| `npm install` EACCES / permission denied | Folder is protected | Move project to `Documents` |
| `npm install` fails with engine error | Node too old | Upgrade to Node 20+ |

### Launcher / shortcut

| Symptom | Cause | Fix |
|---------|-------|-----|
| Double-click `.bat` closes immediately | Hidden error | Run from cmd inside project folder |
| Shortcut opens then nothing | Missing `node_modules` | Run `setup-first-time.bat` again |
| Wrong folder | Shortcut Start in empty | Recreate shortcut (section 10) |

### Application

| Symptom | Cause | Fix |
|---------|-------|-----|
| Blank WhatsApp after add | Slow load / overlay | Wait; switch tab; close modals |
| QR never appears | Network / WA block | Check internet; reload account |
| Session lost | Clear session used | Log in again; avoid Clear Session |
| No notifications | Settings / Windows | Enable in app + Windows notification settings |
| Tray icon missing | Minimize to tray off | Enable in Settings → General |
| Two accounts blank | View attach issue | Restart app; switch tabs |
| Call needs permission / no audio | App or Windows blocked mic/camera | Settings → Accounts: enable Voice/Video calls; Windows Privacy settings |

### Still stuck?

1. Open cmd in project folder.
2. Run `npm run dev` and read the error text.
3. Run `npm run typecheck` if you changed source code.
4. Open an issue on GitHub with OS version, Node version, and error message (no passwords or QR screenshots with personal data).

---

## Related links

- [README.md](../README.md)
- [HOW_TO_USE.id.md](HOW_TO_USE.id.md) — Bahasa Indonesia
- [about.md](../about.md) — product specification

# MM WA Telegram Multiple Accounts

Desktop application to manage multiple **WhatsApp Personal**, **WhatsApp Business**, and **Telegram** accounts from one window.

This is **not** an official WhatsApp, Meta, or Telegram product. It hosts the official web clients inside isolated Electron sessions on your PC.

---

## English

### Features

- Multiple WA/TG accounts with separate login sessions
- Sidebar, tabs, per-account settings
- Desktop notifications and unread badges
- Minimize to system tray (optional)
- Sessions persist after restart

### Tech stack

| Layer | Technology |
|-------|------------|
| Desktop | Electron 34 |
| Build | electron-vite, Vite 5 |
| UI | React 18, TypeScript 5.7, Tailwind CSS 4 |
| Validation | Zod |
| Messaging | Official WhatsApp Web + Telegram Web via `WebContentsView` |

### System requirements

| Requirement | Details |
|-------------|---------|
| OS | **Windows 10** (64-bit) or newer |
| Node.js | **20 LTS** or **22 LTS** ([nodejs.org](https://nodejs.org/)) |
| npm | 10+ (included with Node.js) |
| RAM | 4 GB minimum recommended |
| Disk | ~500 MB+ for `node_modules` |
| Terminal | Command Prompt, PowerShell, or Windows Terminal — **no Git or IDE required** |

### Quick start (recommended for most users)

1. **Download** this repository as ZIP from GitHub and **extract** to a folder you can write to (e.g. `Documents\MM-WA-Telegram`).
2. **Install Node.js LTS** once from [nodejs.org](https://nodejs.org/). Close and reopen any open terminal after install.
3. Open the project folder and **double-click** `setup-first-time.bat`.
4. A **Desktop shortcut** is created automatically.
5. **Double-click the Desktop shortcut** to launch the app.
6. Click **Add Account**, choose platform, scan QR or sign in to Telegram.

**Do not** copy only `start-app.bat` to the Desktop — it must stay in the project folder (the shortcut points to it with the correct working directory).

### Manual setup (Command Prompt)

```cmd
cd /d C:\path\to\mm-wa-telegram-multiple-accounts
setup-first-time.bat
```

Then use the Desktop shortcut, or run:

```cmd
start-app.bat
```

PowerShell (same folder):

```powershell
cd "C:\path\to\mm-wa-telegram-multiple-accounts"
.\setup-first-time.bat
```

### Developer commands

Run from the project folder after `npm install`:

```cmd
npm run dev
npm run build
npm run typecheck
```

### Documentation

- [Step-by-step guide (English)](docs/HOW_TO_USE.en.md)
- [Panduan lengkap (Bahasa Indonesia)](docs/HOW_TO_USE.id.md)
- [Product specification](about.md)

### Security & privacy

- No telemetry or cloud sync in Phase 1
- Login sessions stay in Electron local storage on **your PC**
- Account metadata (name, platform) is stored locally; **not** passwords or tokens in config files
- You are responsible for securing your computer and QR login process

### Troubleshooting (English)

| Problem | Likely cause | Fix |
|---------|--------------|-----|
| `'node' is not recognized` | Node.js not installed or PATH not updated | Install Node.js LTS; **close and reopen** cmd/PowerShell |
| `'npm' is not recognized` | Incomplete Node install | Reinstall Node.js; check "Add to PATH" |
| `.bat` window closes instantly | Error on startup | Open cmd, `cd` to project folder, run the `.bat` manually to read the message |
| `npm install` fails | Old Node, bad cache, read-only folder | Use Node 20+; extract project to `Documents`; delete `node_modules` and retry |
| Shortcut does nothing | Wrong working directory | Re-run `create-desktop-shortcut.bat` or `setup-first-time.bat` |
| Moved only `.bat` to Desktop | `% ~dp0` cannot find project | Use Desktop **shortcut** from setup; keep project folder intact |
| Blank screen after Add Account | WA Web still loading / overlay | Wait 30s; switch tabs; close Settings/Add Account modal |
| QR code not showing | Network or WA server | Check internet; refresh; try Reload in account settings |
| Lost login after restart | Cleared session or deleted partition data | Avoid "Clear session" unless logging out intentionally |
| No notifications | App or Windows settings | Enable notifications in app Settings + Windows Focus Assist off |
| Port already in use | Another dev instance running | Close all Electron windows; end task in Task Manager if needed |
| Generic shortcut icon | PNG used instead of ICO | Ensure `resources\256.ico` exists; re-run shortcut script |

### License

MIT — see [LICENSE](LICENSE).

---

## Bahasa Indonesia

### Fitur

- Beberapa akun WA/TG dengan sesi login terpisah
- Sidebar, tab, pengaturan per akun
- Notifikasi desktop dan badge unread
- Minimize ke system tray (opsional)
- Sesi tetap login setelah app ditutup

### Stack teknologi

| Lapisan | Teknologi |
|---------|-----------|
| Desktop | Electron 34 |
| Build | electron-vite, Vite 5 |
| UI | React 18, TypeScript 5.7, Tailwind CSS 4 |
| Validasi | Zod |
| Messaging | WhatsApp Web + Telegram Web resmi via `WebContentsView` |

### Persyaratan sistem

| Persyaratan | Detail |
|-------------|--------|
| OS | **Windows 10** (64-bit) atau lebih baru |
| Node.js | **20 LTS** atau **22 LTS** ([nodejs.org](https://nodejs.org/)) |
| npm | 10+ (sudah termasuk dengan Node.js) |
| RAM | Minimal 4 GB disarankan |
| Disk | ~500 MB+ untuk `node_modules` |
| Terminal | Command Prompt, PowerShell, atau Windows Terminal — **tidak perlu Git atau IDE** |

### Mulai cepat (disarankan)

1. **Download** repository ini sebagai ZIP dari GitHub lalu **extract** ke folder yang bisa ditulis (mis. `Documents\MM-WA-Telegram`).
2. **Install Node.js LTS** sekali dari [nodejs.org](https://nodejs.org/). Tutup dan buka ulang terminal setelah install.
3. Buka folder project lalu **double-click** `setup-first-time.bat`.
4. **Shortcut Desktop** dibuat otomatis.
5. **Double-click shortcut Desktop** untuk menjalankan app.
6. Klik **Add Account**, pilih platform, scan QR atau login Telegram.

**Jangan** hanya copy `start-app.bat` ke Desktop — file harus tetap di folder project (shortcut mengarah ke file itu dengan working directory yang benar).

### Setup manual (Command Prompt)

```cmd
cd /d C:\path\to\mm-wa-telegram-multiple-accounts
setup-first-time.bat
```

Lalu pakai shortcut Desktop, atau jalankan:

```cmd
start-app.bat
```

PowerShell (folder yang sama):

```powershell
cd "C:\path\to\mm-wa-telegram-multiple-accounts"
.\setup-first-time.bat
```

### Perintah developer

Jalankan dari folder project setelah `npm install`:

```cmd
npm run dev
npm run build
npm run typecheck
```

### Dokumentasi

- [Step-by-step guide (English)](docs/HOW_TO_USE.en.md)
- [Panduan lengkap (Bahasa Indonesia)](docs/HOW_TO_USE.id.md)
- [Spesifikasi produk](about.md)

### Keamanan & privasi

- Tidak ada telemetry atau cloud sync di Phase 1
- Sesi login disimpan lokal di **PC Anda** (Electron userData)
- Metadata akun (nama, platform) disimpan lokal; **bukan** password/token di file config
- Anda bertanggung jawab mengamankan PC dan proses scan QR

### Troubleshooting (Bahasa Indonesia)

| Masalah | Penyebab umum | Solusi |
|---------|---------------|--------|
| `'node' is not recognized` | Node.js belum terinstall / PATH belum update | Install Node.js LTS; **tutup & buka ulang** cmd/PowerShell |
| `'npm' is not recognized` | Install Node tidak lengkap | Install ulang Node.js; centang "Add to PATH" |
| Jendela `.bat` langsung tertutup | Error saat startup | Buka cmd, `cd` ke folder project, jalankan `.bat` manual untuk baca pesan |
| `npm install` gagal | Node lama, cache rusak, folder read-only | Pakai Node 20+; extract ke `Documents`; hapus `node_modules`, coba lagi |
| Shortcut tidak jalan | Working directory salah | Jalankan ulang `create-desktop-shortcut.bat` atau `setup-first-time.bat` |
| Hanya pindahkan `.bat` ke Desktop | `% ~dp0` tidak menemukan project | Pakai **shortcut** Desktop dari setup; folder project harus utuh |
| Layar blank setelah Add Account | WA Web masih load / overlay | Tunggu 30 detik; ganti tab; tutup modal Settings/Add Account |
| QR tidak muncul | Jaringan / server WA | Cek internet; refresh; coba Reload di pengaturan akun |
| Login hilang setelah restart | Session di-clear / data partition terhapus | Hindari "Clear session" kecuali logout sengaja |
| Notifikasi tidak muncul | Setting app atau Windows | Aktifkan notifikasi di Settings app + matikan Focus Assist |
| Port sudah dipakai | Instance dev masih jalan | Tutup semua jendela Electron; end task di Task Manager jika perlu |
| Icon shortcut generik | Pakai PNG bukan ICO | Pastikan `resources\256.ico` ada; jalankan ulang script shortcut |

### Lisensi

MIT — lihat [LICENSE](LICENSE).

---

## Before pushing to GitHub

```cmd
git init
git add .
git status
```

Confirm these are **not** staged: `node_modules/`, `out/`, `.env`, `resources/ori.png`, `*.tsbuildinfo`.

```cmd
git commit -m "Initial public release"
git remote add origin <your-repo-url>
git push -u origin main
```

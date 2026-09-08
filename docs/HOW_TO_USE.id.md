# Panduan Penggunaan — MM WA Telegram Multiple Accounts

Panduan langkah demi langkah untuk **Windows 10+**. Anda hanya perlu **Command Prompt**, **PowerShell**, atau **Windows Terminal**. Git dan IDE **tidak wajib**.

---

## 1. Yang Anda butuhkan

| Item | Wajib? | Catatan |
|------|--------|---------|
| Windows 10 atau 11 (64-bit) | Ya | Windows 7/8 tidak didukung |
| Node.js 20 atau 22 LTS | Ya | Download sekali dari [https://nodejs.org/](https://nodejs.org/) |
| npm | Ya | Sudah termasuk dengan Node.js |
| Internet | Ya | Untuk install, WhatsApp Web, Telegram Web |
| Git | Tidak | Bisa download ZIP saja |
| VS Code / IDE | Tidak | Cukup double-click file `.bat` |

---

## 2. Mendapatkan aplikasi

### Opsi A — Download ZIP (disarankan)

1. Buka halaman repository GitHub.
2. Klik **Code → Download ZIP**.
3. Extract ke folder yang bisa ditulis, contoh:
   ```text
   C:\Users\NamaAnda\Documents\MM-WA-Telegram\
   ```
4. Jangan jalankan dari `Program Files` kecuali Anda punya hak admin untuk `npm install`.

### Opsi B — Git clone (developer)

```cmd
git clone <url-repository>
cd mm-wa-telegram-multiple-accounts
```

---

## 3. Install Node.js (sekali saja)

1. Buka [https://nodejs.org/](https://nodejs.org/).
2. Download **LTS** (20.x atau 22.x).
3. Jalankan installer.
4. Pastikan **"Add to PATH"** dicentang.
5. **Tutup dan buka ulang** Command Prompt atau PowerShell setelah install.
6. Verifikasi:

```cmd
node -v
npm -v
```

Harus muncul nomor versi (mis. `v20.x.x` dan `10.x.x`).

---

## 4. Setup pertama kali

### Paling mudah: double-click

1. Buka folder project di File Explorer.
2. Double-click **`setup-first-time.bat`**.
3. Tunggu `npm install` selesai (hanya pertama kali).
4. Shortcut Desktop **"MM WA Telegram Multiple Accounts"** dibuat otomatis.

### Menggunakan Command Prompt

```cmd
cd /d C:\Users\NamaAnda\Documents\MM-WA-Telegram\mm-wa-telegram-multiple-accounts
setup-first-time.bat
```

### Menggunakan PowerShell

```powershell
cd "C:\Users\NamaAnda\Documents\MM-WA-Telegram\mm-wa-telegram-multiple-accounts"
.\setup-first-time.bat
```

### Menggunakan Windows Terminal

Perintah sama seperti di atas — pilih profil **Command Prompt** atau **PowerShell**.

---

## 5. Menjalankan app (sehari-hari)

**Disarankan:** Double-click **shortcut Desktop**.

Alternatif dari folder project:

```cmd
start-app.bat
```

Atau untuk developer:

```cmd
npm run dev
```

### Penting

- **Jangan** hanya memindahkan `start-app.bat` ke Desktop — file butuh folder project lengkap (`package.json`, `node_modules`, dll.).
- Shortcut Desktop menjalankan `start-app.bat` dengan folder **Start in** yang benar secara otomatis.

---

## 6. Menambah dan menggunakan akun

### WhatsApp Personal atau Business

1. Klik **+** atau **Add Account**.
2. Isi nama (mis. `Business Jakarta`).
3. Pilih **WhatsApp** dan tipe akun.
4. Tunggu WhatsApp Web load.
5. Di HP: **Perangkat tertaut → Tautkan perangkat** → scan QR code.
6. Ulangi untuk setiap akun WhatsApp.

### Telegram

1. Klik **Add Account**.
2. Pilih **Telegram**.
3. Login dengan nomor HP atau QR sesuai Telegram Web.

### Ganti akun

- Klik akun di **sidebar** atau **tab bar**.
- Sesi tetap login; ganti akun tidak mencampur session.

---

## 7. Pengaturan berguna

Buka **Settings** (ikon gear):

| Pengaturan | Keterangan |
|------------|------------|
| Minimize to tray | Sembunyikan ke system tray saat minimize |
| Close to tray | Tetap jalan di tray saat klik X |
| Notifications | Notifikasi desktop untuk pesan baru |
| Restore opened tabs | Buka kembali tab setelah restart |

---

## 8. Logout atau hapus akun

1. Buka **Settings → Accounts**.
2. Pilih akun.
3. **Delete Account** — hapus metadata dan session (logout).

Untuk reload tanpa hapus: gunakan **Reload** di pengaturan akun.

---

## 9. Lokasi penyimpanan data

| Data | Lokasi |
|------|--------|
| Nama akun, pengaturan | Folder `store\` di Electron userData |
| Login WA/TG (cookie) | Folder partition Electron di PC Anda |
| File project | Folder extract/clone Anda |

Tidak ada data yang dikirim ke server developer di Phase 1.

---

## 10. Shortcut Desktop manual (jika script gagal)

Jika `create-desktop-shortcut.bat` gagal (mis. PowerShell diblokir):

1. Klik kanan Desktop → **New → Shortcut**.
2. **Target:** arahkan ke `start-app.bat` di folder project.
3. **Start in:** folder project (folder yang berisi `package.json`).
4. Beri nama `MM WA Telegram Multiple Accounts`.
5. Klik kanan shortcut → **Properties → Change Icon** → pilih `resources\256.ico`.

---

## 11. Uninstall

1. Hapus folder project.
2. Hapus shortcut Desktop.
3. Opsional: hapus data app di `%APPDATA%` (cari folder terkait nama app / Electron userData).

---

## 12. Troubleshooting

### Node.js / npm

| Gejala | Penyebab | Solusi |
|--------|----------|--------|
| `'node' is not recognized` | Node belum terinstall / PATH belum update | Install LTS; restart terminal |
| `'npm' is not recognized` | Install Node rusak | Install ulang Node.js |
| `npm install` EACCES / permission denied | Folder terproteksi | Pindahkan project ke `Documents` |
| `npm install` gagal engine error | Node terlalu lama | Upgrade ke Node 20+ |

### Launcher / shortcut

| Gejala | Penyebab | Solusi |
|--------|----------|--------|
| Double-click `.bat` langsung tutup | Error tersembunyi | Jalankan dari cmd di folder project |
| Shortcut buka lalu tidak ada apa-apa | `node_modules` belum ada | Jalankan `setup-first-time.bat` lagi |
| Folder salah | Start in shortcut kosong | Buat ulang shortcut (bagian 10) |

### Aplikasi

| Gejala | Penyebab | Solusi |
|--------|----------|--------|
| WhatsApp blank setelah add | Load lambat / overlay | Tunggu; ganti tab; tutup modal |
| QR tidak muncul | Jaringan / blokir WA | Cek internet; reload akun |
| Session hilang | Clear session dipakai | Login lagi; hindari Clear Session |
| Notifikasi tidak muncul | Setting app / Windows | Aktifkan di app + pengaturan notifikasi Windows |
| Icon tray hilang | Minimize to tray off | Aktifkan di Settings → General |
| Dua akun blank | Masalah attach view | Restart app; ganti tab |

### Masih bermasalah?

1. Buka cmd di folder project.
2. Jalankan `npm run dev` dan baca pesan error.
3. Jalankan `npm run typecheck` jika Anda mengubah source code.
4. Buka issue di GitHub dengan versi OS, versi Node, dan pesan error (tanpa password atau screenshot QR berisi data pribadi).

---

## Tautan terkait

- [README.md](../README.md)
- [HOW_TO_USE.en.md](HOW_TO_USE.en.md) — English
- [about.md](../about.md) — spesifikasi produk

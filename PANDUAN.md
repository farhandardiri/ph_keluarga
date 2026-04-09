# 📋 PANDUAN SETUP — Pohon Keluarga + Google Sheets

---

## 🗂️ Isi Paket

| File         | Keterangan                           |
| ------------ | ------------------------------------ |
| `index.html` | Aplikasi web utama (buka di browser) |
| `Code.gs`    | Kode backend Google Apps Script      |
| `PANDUAN.md` | File panduan ini                     |

---

## 🚀 LANGKAH 1 — Buat Google Spreadsheet

1. Buka [sheets.google.com](https://sheets.google.com)
2. Klik **+ Spreadsheet baru** (kosong)
3. Beri nama misal: **"Pohon Keluarga"**
4. Salin **Spreadsheet ID** dari URL:
   ```
   https://docs.google.com/spreadsheets/d/[INI_SPREADSHEET_ID]/edit
   ```
   Contoh: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms`

---

## 🔧 LANGKAH 2 — Buat Google Apps Script

1. Di spreadsheet tadi, klik menu **Extensions → Apps Script**
2. Hapus semua kode yang ada di editor
3. Buka file **`Code.gs`** dari paket ini
4. Salin & tempel seluruh isinya ke editor Apps Script
5. Pada baris ke-7, ganti nilai `SPREADSHEET_ID`:

   ```javascript
   // SEBELUM:
   const SPREADSHEET_ID = "GANTI_DENGAN_SPREADSHEET_ID_ANDA";

   // SESUDAH (contoh):
   const SPREADSHEET_ID = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms";
   ```

6. Klik tombol **💾 Simpan** (Ctrl+S)

---

## ✅ LANGKAH 3 — Tes Koneksi (Opsional)

1. Pilih fungsi `testSetup` dari dropdown fungsi di toolbar
2. Klik tombol **▶ Jalankan**
3. Izinkan akses Google ketika diminta
4. Periksa log — harus muncul: _"Sheet berhasil dibuat/ditemukan"_
5. Periksa spreadsheet Anda — harus sudah ada sheet **"Anggota"** dengan header

---

## 🌐 LANGKAH 4 — Deploy sebagai Web App

1. Di Apps Script, klik **Deploy → New deployment**
2. Klik ⚙️ di sebelah "Select type" → pilih **Web app**
3. Isi konfigurasi:
   - **Description**: `Pohon Keluarga v1`
   - **Execute as**: `Me (email Anda)`
   - **Who has access**: `Anyone` ⚠️ _(agar aplikasi bisa akses)_
4. Klik **Deploy**
5. Klik **Authorize access** → izinkan semua permission
6. **Salin URL Web App** yang tampil (format: `https://script.google.com/macros/s/.../exec`)

---

## 🔗 LANGKAH 5 — Hubungkan Aplikasi

1. Buka file **`index.html`** di browser (klik dua kali)
2. Klik tab **⚙️ Pengaturan**
3. Tempel URL Web App tadi ke kolom **URL Google Apps Script Web App**
4. Klik **Simpan**
5. Aplikasi akan otomatis terhubung ke Google Sheets ✅

---

## 📸 Cara Upload Foto Profil

Aplikasi menggunakan **URL gambar** (bukan upload langsung). Ada beberapa cara:

### A. Google Drive (Gratis)

1. Upload foto ke Google Drive
2. Klik kanan foto → **Share** → ubah ke _"Anyone with link"_
3. Salin link, lalu ubah formatnya: -> `https://drive.google.com/file/d/FILE_ID/view`

### B. Imgur (Mudah, Gratis)

1. Buka [imgur.com](https://imgur.com)
2. Upload foto
3. Klik kanan foto → **Copy image address**
4. Salin URL tersebut (format `.jpg` atau `.png`)

---

## 💡 Tips Penggunaan

- **Generasi**: Isi angka 1 untuk leluhur tertua, 2 untuk anak, 3 untuk cucu, dst.
- **Pohon Visual**: Pilih "Tampilkan dari" untuk fokus ke satu cabang keluarga
- **Sinkron**: Klik tombol Sinkron di header untuk menyegarkan data dari Sheets
- **Backup**: Gunakan Export JSON secara berkala sebagai cadangan

---

## ⚠️ Penting — Izin Apps Script

Saat pertama kali menjalankan/deploy, Google akan meminta izin. Klik:

1. **Advanced** (Tampilkan opsi lanjutan)
2. **Go to [Nama Project] (unsafe)**
3. **Allow** semua izin

Ini normal untuk Apps Script yang dibuat sendiri.

---

## 🔁 Update Kode di Masa Depan

Jika ada perubahan kode di `Code.gs`:

1. Simpan perubahan di Apps Script editor
2. Klik **Deploy → Manage deployments**
3. Klik ✏️ Edit → ganti versi ke **"New version"**
4. Klik **Deploy**

---

_Dibuat dengan ❤️ — Pohon Keluarga v1.0_

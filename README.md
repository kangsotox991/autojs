# e-MASTER Auto Fill — Chrome Extension + Browser Version

Versi browser dari [e-MASTER Auto Fill](https://github.com/gilelundro01/emaster) untuk pengisian otomatis **Aktivitas Kinerja Harian** di aplikasi [Si-MASTER BKD Jatim](https://master.bkd.jatimprov.go.id/).

> **Tidak perlu Tampermonkey, tidak perlu Python.**

---

## Fitur

- **Chrome Extension** — auto-fill panel otomatis muncul di halaman Si-MASTER, tetap ada setelah refresh
- **Import Excel langsung di browser** — konversi `.xlsx` ke JSON tanpa Python (SheetJS)
- **Import JSON** — file JSON hasil `convert_excel.py` tetap bisa diimport
- **Auto-fill dengan state persist** — proses isi form otomatis: Tambah → isi → Save → ulangi
- **Popup Kamus Aktifitas** — otomatis cari dan klik aktivitas di popup Kamus
- **Mapping Kamus** — konfigurasi kata kunci pencarian per breakdown kegiatan
- **Preview data** — lihat breakdown dan entry sebelum menjalankan auto-fill
- **Semua data lokal** — tersimpan di `chrome.storage` (bukan server)

---

## Cara Install Chrome Extension

### 1. Download

Download atau clone repo ini:
```bash
git clone https://github.com/kangsotox991/autojs.git
```

### 2. Load di Chrome

1. Buka Chrome → ketik `chrome://extensions/` di address bar
2. Aktifkan **Developer mode** (toggle kanan atas)
3. Klik **"Load unpacked"**
4. Pilih folder `autojs/` (yang berisi `manifest.json`)
5. Extension akan muncul di toolbar Chrome

### 3. Import Data

1. Klik icon extension **"e"** di toolbar Chrome → popup terbuka
2. Upload file **Excel** (.xlsx) atau **JSON** di tab "Import Data"
3. Cek tab **Preview** untuk pastikan data benar

### 4. Jalankan Auto-Fill

1. **Login manual** ke [Si-MASTER](https://master.bkd.jatimprov.go.id) (NIP + Password + OTP)
2. Buka halaman **Aktivitas Bulan**
3. Panel auto-fill **otomatis muncul** di kanan atas halaman
4. Klik icon **kunci pas** pada breakdown yang ingin diisi → masuk halaman realisasi
5. Di panel auto-fill, pilih breakdown dari dropdown
6. Klik **"Mulai Auto Fill"**
7. Script otomatis: klik Tambah → isi form → klik Save → ulangi

> **Panel tetap ada setelah refresh halaman** — tidak perlu inject ulang seperti bookmarklet.

---

## Alternatif: Standalone HTML (tanpa install extension)

Buka file `index.html` langsung di browser. Fitur sama, tapi menggunakan bookmarklet (perlu inject ulang setiap refresh halaman Si-MASTER).

---

## Perbedaan dengan Versi Asli

| Komponen | Versi Asli | Chrome Extension |
|---|---|---|
| Konversi Excel | Python (`convert_excel.py`) | Browser (SheetJS library) |
| Auto-fill | Tampermonkey userscript | Content script (auto-inject) |
| GUI | Python tkinter (`emaster_gui.py`) | Extension popup |
| Penyimpanan | `GM_setValue` / file JSON | `chrome.storage.local` |
| Dependency | Python 3.10+, openpyxl | Tidak ada (cukup Chrome) |
| Refresh halaman | Tampermonkey auto-inject | Content script auto-inject |

---

## Mapping Kamus Aktifitas

Di tab "Kamus" pada popup extension, ada editor mapping kata kunci:

```
Melaksanakan asuhan keperawatan sesuai SOP [single]
  - Manajemen Asuhan Keperawatan

Melaksanakan tindakan keperawatan tepat waktu [multi]
  - Pasang Infus
  - Sampling Darah Vena Instalasi
  - Terapi Injeksi Parenteral

Melaksanakan prosedur keperawatan sesuai SOP [multi]
  - Terapi Injeksi Line
  - Pasang Infus
  - Mengukur Tanda Tanda
  - Sampling Darah Vena Instalasi
```

- **[single]**: satu kata kunci untuk semua entry dalam breakdown
- **[multi]**: tiap tanggal punya beberapa kata kunci — 1 entry Excel menjadi N entry form (1 per keyword)

---

## Format Data Excel

| Kolom | Deskripsi | Contoh |
|-------|-----------|--------|
| No | Nomor urut per hari | 1, 2, 3 |
| Hari | Nama hari | Rabu |
| Tanggal | Tanggal aktivitas | 01-04-2026 |
| Kegiatan Tugas Jabatan | Nama breakdown | Melaksanakan asuhan... |
| Obyek Kerja | Detail/uraian kegiatan | Melakukan asuhan keperawatan... |
| Volume | Jumlah volume | 3 |
| Durasi (Menit) | Durasi = WPT | 28 |

---

## Struktur File

```
autojs/
├── manifest.json          # Chrome Extension manifest v3
├── popup.html             # UI popup extension (import, preview, kamus)
├── popup.js               # Logic popup
├── content.js             # Auto-fill panel (inject ke Si-MASTER)
├── libs/
│   └── xlsx.full.min.js   # SheetJS library (bundled)
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── index.html             # Standalone version (alternatif tanpa extension)
└── README.md
```

---

## Catatan Keamanan

- Skrip ini **TIDAK** menyimpan atau mengirimkan data login Anda
- Semua data tersimpan lokal di browser (`chrome.storage.local`)
- Login tetap dilakukan manual (NIP + Password + OTP)
- File JSON tidak mengandung kredensial
- Extension hanya aktif di domain `master.bkd.jatimprov.go.id`

## Lisensi

MIT

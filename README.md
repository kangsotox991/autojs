# e-MASTER Auto Fill — Browser Version

Versi browser dari [e-MASTER Auto Fill](https://github.com/gilelundro01/emaster) untuk pengisian otomatis **Aktivitas Kinerja Harian** di aplikasi [Si-MASTER BKD Jatim](https://master.bkd.jatimprov.go.id/).

> **Tidak perlu Tampermonkey, tidak perlu Python** — cukup buka file `index.html` di browser.

---

## Fitur

- **Import Excel langsung di browser** — konversi `.xlsx` ke JSON tanpa Python (`convert_excel.py` sudah digantikan SheetJS)
- **Import JSON** — file JSON hasil `convert_excel.py` tetap bisa diimport
- **Bookmarklet** — inject panel auto-fill langsung ke halaman Si-MASTER
- **Auto-fill dengan state persist** — proses isi form otomatis: Tambah → isi → Save → ulangi
- **Popup Kamus Aktifitas** — otomatis cari dan klik aktivitas di popup Kamus
- **Mapping Kamus** — konfigurasi kata kunci pencarian per breakdown kegiatan
- **Preview data** — lihat breakdown dan entry sebelum menjalankan auto-fill
- **Semua data lokal** — tersimpan di `localStorage` browser (bukan server)

---

## Perbedaan dengan Versi Asli

| Komponen | Versi Asli | Versi Browser |
|---|---|---|
| Konversi Excel | Python (`convert_excel.py`) | Browser (SheetJS library) |
| Auto-fill | Selenium CLI / Tampermonkey | Bookmarklet (inject ke halaman) |
| GUI | Python tkinter (`emaster_gui.py`) | HTML di browser |
| Penyimpanan | `GM_setValue` / file JSON | `localStorage` browser |
| Dependency | Python 3.10+, openpyxl, selenium | Tidak ada (cukup browser) |

---

## Cara Pakai

### 1. Import Data

Buka file `index.html` di browser.

**Opsi A: Import Excel**
- Upload file Excel (`.xlsx`) di tab "Import Data"
- Kolom yang dibutuhkan: **No, Hari, Tanggal, Kegiatan Tugas Jabatan, Obyek Kerja, Volume, Durasi (Menit)**
- Kegiatan "Briefing" dan "Timbang Terima" otomatis diskip
- Data langsung dikonversi dan disimpan

**Opsi B: Import JSON**
- Upload file JSON (hasil `python convert_excel.py`) di tab yang sama
- Format JSON sama dengan output `convert_excel.py`

### 2. Setup Bookmarklet

Di tab "Bookmarklet":
- Drag tombol biru **"e-MASTER Auto Fill"** ke bookmark bar browser
- Atau copy kode dari text area dan paste di Developer Console (F12)

### 3. Jalankan Auto-Fill

1. Buka [Si-MASTER](https://master.bkd.jatimprov.go.id) dan **login manual** (NIP + Password + OTP)
2. Buka halaman **Aktivitas Bulan** (`essmedia.php?module=aktifitas_bulan`)
3. Klik icon **kunci pas** pada breakdown yang ingin diisi → masuk halaman realisasi
4. Klik **bookmarklet** di bookmark bar → panel auto-fill muncul
5. Pilih breakdown dari dropdown
6. Klik **"Mulai Auto Fill"**
7. Script otomatis: klik Tambah → isi form → klik Save → ulangi

State tersimpan di `localStorage`, jadi jika halaman reload, proses akan lanjut otomatis.

---

## Mapping Kamus Aktifitas

Di tab "Import Data", ada editor mapping kata kunci pencarian popup Kamus per kegiatan:

```
Melaksanakan asuhan keperawatan sesuai SOP [single]
  - Manajemen Asuhan Keperawatan

Melaksanakan tindakan keperawatan tepat waktu [rotating]
  - Sampling Darah Vena Instalasi
  - Terapi Injeksi Parenteral
  - Pasang Infus
```

- **single**: satu kata kunci untuk semua entry dalam breakdown
- **rotating**: setiap entry di-duplikasi untuk setiap kata kunci (1 entry Excel → N entry form)

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

## Catatan Keamanan

- Skrip ini **TIDAK** menyimpan atau mengirimkan data login Anda
- Semua data tersimpan lokal di browser (`localStorage`)
- Login tetap dilakukan manual (NIP + Password + OTP)
- File JSON tidak mengandung kredensial

## Lisensi

MIT

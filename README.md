# E-MASTER AutoFill — Browser Version

Versi browser dari skrip [E-MASTER AutoFill](https://github.com/kangsotox991/emasterjs) untuk mengisi otomatis form **Aktivitas Harian SKP** di aplikasi [Si-MASTER BKD Jatim](https://master.bkd.jatimprov.go.id).

> **Tidak perlu Tampermonkey / Greasemonkey** — cukup buka file `index.html` di browser.

---

## Perbedaan dengan Versi Userscript

| Fitur | Userscript (Tampermonkey) | Browser Version |
|---|---|---|
| Instalasi | Perlu extension Tampermonkey | Langsung buka di browser |
| Penyimpanan data | Tampermonkey storage (`GM_getValue/GM_setValue`) | `localStorage` browser |
| Cara pakai | Otomatis inject di halaman Si-MASTER | Buka `index.html`, lalu hubungkan ke Si-MASTER via iframe atau bookmarklet |
| Library XLSX | `@require` dari CDN | `<script>` tag dari CDN |
| Dependency | Tampermonkey extension | Tidak ada |

---

## Fitur

- **GUI Panel** — antarmuka lengkap untuk mengisi form aktivitas harian
- **Template Aktivitas** — simpan template kegiatan yang sering dipakai
- **Detail Aktifitas via Popup** — otomatis buka popup "Kamus Aktifitas Harian", cari kata kunci, dan klik hasil
- **Import Excel** — upload file Excel (.xlsx / .csv) untuk isi form dari data spreadsheet
- **Mapping Kata Kunci** — satu kegiatan di Excel bisa punya beberapa kata kunci pencarian popup
- **Konfigurasi** — tambah/hapus template, atur delay, reset ke default
- **Bookmarklet** — inject panel langsung ke halaman Si-MASTER
- **Iframe** — buka Si-MASTER langsung di dalam halaman (jika diizinkan oleh server)

---

## Cara Pakai

### Opsi 1: Bookmarklet (Direkomendasikan)

1. Buka file `index.html` di browser
2. Drag tombol **"E-MASTER AutoFill"** ke bookmark bar
3. Buka [Si-MASTER](https://master.bkd.jatimprov.go.id) di tab baru dan **login manual**
4. Navigasi ke halaman form **Aktivitas Harian**
5. Klik bookmarklet di bookmark bar — panel AutoFill akan muncul
6. Pilih template / isi kata kunci → klik **Isi Form** atau **Isi & Save**

### Opsi 2: Buka Langsung

1. Buka file `index.html` di browser
2. Atur template dan konfigurasi di panel
3. Buka [Si-MASTER](https://master.bkd.jatimprov.go.id) di iframe (bagian bawah halaman)
4. Login dan navigasi ke form Aktivitas Harian
5. Gunakan tab "Isi Form" untuk mengisi data

> **Catatan:** Iframe mungkin diblokir oleh kebijakan keamanan Si-MASTER (X-Frame-Options). Jika tidak bisa di-load, gunakan bookmarklet.

---

## Tab-Tab yang Tersedia

### Tab "Isi Form"
- Pilih template aktivitas (kartu biru) atau isi kata kunci manual
- Opsional: isi tanggal manual (format dd/mm/yyyy), kosong = hari ini
- Klik **Isi Form** atau **Isi & Save**

### Tab "Excel"
- Upload file Excel (.xlsx) atau CSV
- Kolom: **No**, **Tanggal**, **Kegiatan Tugas Jabatan**, **Obyek Kerja**, **Volume**
- Navigasi baris data dengan Prev/Next
- Filter berdasarkan kolom No

### Tab "Mapping"
- Atur mapping kegiatan → kata kunci pencarian popup
- Satu kegiatan bisa punya beberapa kata kunci (1 kata kunci = 1x isi form)

### Tab "Konfigurasi"
- Tambah/hapus template
- Atur delay antar pengisian
- Reset ke default

### Tab "Deteksi"
- Lihat field form yang terdeteksi di halaman target
- Hijau = ditemukan, Merah = tidak ditemukan

---

## Template Default

| Template | Kata Kunci | Volume | Objek Kerja |
|---|---|---|---|
| Administrasi Surat | administrasi surat | 5 | Surat masuk dan surat keluar |
| Menyusun Laporan | menyusun laporan | 1 | Laporan kegiatan berkala |
| Rapat Koordinasi | rapat koordinasi | 1 | Rapat internal |
| Pelayanan Publik | pelayanan | 3 | Pelayanan tamu / masyarakat |
| Pengelolaan Data | pengelolaan data | 10 | Data kepegawaian |
| Tindakan Keperawatan | keperawatan | 5 | Pasien rawat inap / rawat jalan |

---

## Catatan Penting

- **Skrip ini TIDAK menyimpan atau mengirimkan data login Anda**
- Data konfigurasi template tersimpan lokal di browser (localStorage)
- Selalu periksa data sebelum klik Save
- Login tetap dilakukan manual

## Lisensi

MIT

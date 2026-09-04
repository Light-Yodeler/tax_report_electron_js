# Rekapitulasi Pendapatan & Pelaporan Pajak Usaha

Aplikasi desktop berbasis Electron dan React untuk merekapitulasi pendapatan harian, mengelola data transaksi dari berkas spreadsheet, menghitung kewajiban pajak usaha daerah, dan mencetak laporan perpajakan resmi.

Aplikasi ini dirancang untuk operasional dua unit usaha, yaitu Bungalows dan Restaurant, dengan pemisahan pencatatan transaksi dan konfigurasi profil wajib pajak masing-masing.

---

## Kegunaan

Aplikasi ini menyelesaikan alur kerja pelaporan pajak usaha daerah dari hulu ke hilir:
1. Membaca dan memvalidasi rekapan pendapatan harian dari berkas Excel (.xlsx dan .xls).
2. Menyimpan seluruh data transaksi ke dalam database lokal berbasis SQLite di komputer pengguna.
3. Mengarsipkan salinan fisik berkas Excel asli setiap kali proses impor dilakukan.
4. Menghitung akumulasi pendapatan kotor, omset kena pajak, dan nominal pajak terutang secara otomatis.
5. Menyajikan tinjauan visual melalui metrik keuangan, grafik tren pendapatan, dan tabel rekapitulasi harian.
6. Mencetak lembar laporan fisik atau mengekspor berkas ke format PDF dan Excel siap setor.

---

## Fitur Utama

### 1. Pengelolaan Dua Unit Usaha
- Mendukung pemisahan data antara unit Bungalows dan Restaurant dalam satu aplikasi.
- Konfigurasi profil usaha terpisah untuk setiap unit: nama wajib pajak, NPWPD, nama pimpinan, alamat, dan persentase tarif pajak daerah.

### 2. Impor Data Excel dan Validasi Unit
- Membaca transaksi dari berkas spreadsheet dengan pengenalan otomatis kolom tanggal, nomor kamar atau meja, keterangan, dan nominal omset.
- Dilengkapi pendeteksi unit otomatis berdasarkan struktur lembar kerja untuk mencegah salah unggah berkas (misalnya dokumen Restaurant yang tidak sengaja diunggah pada unit Bungalows).
- Menampilkan peringatan sebelum data disimpan jika unit target tidak sesuai dengan isi dokumen, disertai tombol penyesuaian target dalam satu klik.
- Riwayat impor lengkap mencakup nama berkas, waktu proses, jumlah baris berhasil, dan tautan langsung untuk membuka kembali berkas arsip.

### 3. Pengarsipan Fisik Berkas
- Setiap berkas Excel yang diunggah otomatis disalin ke folder arsip lokal dengan format penamaan berbasis waktu yang aman untuk sistem file Windows maupun macOS.
- Berkas arsip dapat dibuka langsung menggunakan aplikasi spreadsheet default atau ditinjau lokasinya di File Explorer / Finder melalui tombol pada antarmuka aplikasi.

### 4. Performa Skalabilitas dengan Paginasi SQL
- Pembacaan data mentah transaksi menggunakan paginasi langsung di level database (`LIMIT` dan `OFFSET`), menjaga konsumsi memori tetap rendah saat memproses puluhan hingga ratusan ribu baris data.
- Antarmuka data mentah menyediakan opsi pemilihan 25, 50, atau 100 baris per halaman dengan kontrol navigasi halaman dan pencarian transaksi.

### 5. Rekapitulasi dan Pelaporan Pajak
- Rekapitulasi pendapatan harian otomatis untuk bulan dan tahun yang dipilih.
- Penghitungan metrik operasional: total omset, pajak terutang (10%), pendapatan bersih, rata-rata omset per hari aktif, dan rekor omset harian tertinggi.
- Ekspor laporan bulanan ke format spreadsheet Excel dengan format tabel akuntansi.
- Antarmuka cetak laporan resmi yang telah disesuaikan dengan formulir pelaporan pajak usaha, lengkap dengan ruang tanda tangan dan tanggal surat.

### 6. Transparansi Lokasi Penyimpanan
- Menu pengaturan menyediakan informasi detail mengenai sistem operasi yang aktif, lokasi file database SQLite, ukuran file di disk, jumlah transaksi tersimpan, dan path folder arsip berkas Excel.
- Tersedia tombol pintas untuk membuka folder database dan folder arsip secara langsung melalui file manager bawaan sistem operasi.

### 7. Tampilan Fleksibel
- Mendukung mode tampilan Terang (Light) dan Gelap (Dark) yang tersimpan secara lokal pada sesi pengguna.

---

## Tumpukan Teknologi

- **Desktop Framework**: Electron 34
- **User Interface**: React 18
- **Styling**: Tailwind CSS 3
- **Database**: SQLite (sql.js)
- **Pemrosesan Spreadsheet**: ExcelJS dan SheetJS (xlsx)
- **Ikon & Visualisasi**: Lucide React, Recharts
- **Build Tool**: Vite 6, Electron Builder 25

---

## Kebutuhan Sistem

Sebelum menjalankan atau membangun aplikasi, pastikan sistem Anda memenuhi persyaratan berikut:

- **Node.js**: Versi 18.0.0 atau lebih baru (disarankan Node.js LTS)
- **npm**: Versi 9.0.0 atau lebih baru
- **Sistem Operasi**:
  - Windows 10 atau 11 (64-bit)
  - macOS 12 Monterey atau lebih baru (Apple Silicon M-series atau Intel x64)

---

## Panduan Instalasi dan Pengembangan

### 1. Kloning Repositori
```bash
git clone https://github.com/Light-Yodeler/tax_report_electron_js.git
cd tax_report_electron_js
```

### 2. Pasang Dependensi
```bash
npm install
```

### 3. Menjalankan Aplikasi dalam Mode Pengembangan
Untuk menjalankan antarmuka React bersamaan dengan instance Electron:
```bash
npm run dev
```

Jika ingin menjalankan komponen secara terpisah:
- **Hanya server React (port 5173)**:
  ```bash
  npm run dev:react
  ```
- **Hanya instance Electron**:
  ```bash
  npm run dev:electron
  ```

---

## Pembuatan Paket Aplikasi (Production Build)

Aplikasi dapat dikompilasi menjadi paket executable siap pakai untuk distribusi:

### Membangun Paket untuk macOS
Perintah ini menghasilkan berkas `.dmg` dan `.zip` di dalam direktori `release/`:
```bash
npm run build:mac
```

### Membangun Paket untuk Windows
Perintah ini menghasilkan installer NSIS (`.exe`) dan versi portabel di dalam direktori `release/`:
```bash
npm run build:win
```

### Membangun Seluruh Platform Sekaligus
```bash
npm run build:all
```

---

## Struktur Direktori

```text
├── electron/
│   ├── main.js             # Proses utama Electron, lifecycle window, dan IPC handlers
│   ├── preload.js          # Skrip preload untuk mengekspos API aman ke renderer
│   ├── database.js         # Layanan SQLite: migrasi tabel, paginasi transaksi, dan arsip
│   ├── excelService.js     # Parser dan pembaca format file Excel
│   └── pdfService.js       # Generator pencetakan dan ekspor PDF laporan
├── src/
│   ├── components/         # Komponen antarmuka React (Header, Tabel, Modal, dsb.)
│   ├── utils/              # Fungsi pembantu format tanggal dan mata uang Rupiah
│   ├── App.jsx             # Komponen utama dan alur logika aplikasi
│   ├── main.jsx            # Titik masuk React DOM
│   └── index.css           # Konfigurasi Tailwind CSS dan gaya global
├── index.html              # Template HTML utama
├── package.json            # Konfigurasi proyek, skrip, dan dependensi
├── tailwind.config.js      # Konfigurasi tema Tailwind CSS
└── vite.config.js          # Konfigurasi bundler Vite
```

---

## Lokasi Penyimpanan Data Lokal

Database SQLite dan berkas arsip disimpan secara terpisah dari kode aplikasi di folder data aplikasi pengguna:

- **Windows**:
  `%APPDATA%\tax-report-app\`
  - Database: `database.sqlite`
  - Folder Arsip: `arsip_excel\`

- **macOS**:
  `~/Library/Application Support/tax-report-app/`
  - Database: `database.sqlite`
  - Folder Arsip: `arsip_excel/`

Data tersimpan secara persisten dan tidak akan terhapus saat aplikasi diperbarui.

---

## Lisensi

Proyek ini dilisensikan di bawah lisensi ISC.

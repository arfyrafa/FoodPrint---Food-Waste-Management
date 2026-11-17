# 🌿 FoodPrint

**Stop Wasting Food, Start Predicting Demand**

Web app berbasis AI untuk pengelola kantin kampus dan UMKM kuliner agar memasak sesuai permintaan, bukan berlebih, sekaligus menyalurkan makanan surplus yang masih layak kepada pembeli.

| | |
|---|---|
| **Kompetisi** | IT RUSH 2026 (Web Development) |
| **Subtema** | Lingkungan dan Konservasi |
| **Tim** | Techtonic ampe Wisuda |
| **Live Website** | `[ISI: https://....vercel.app]` |
| **Video Demo** | `[ISI: link YouTube Unlisted]` |
| **Versi PRD** | v1.1 (10 November 2026) |

> ⚠️ **Data demo adalah data simulasi**, bukan data usaha nyata. Lihat [Catatan Data Simulasi](#-catatan-data-simulasi).

---

## 📌 Latar Belakang

Kantin kampus dan UMKM kuliner sering memproduksi makanan berlebih karena menentukan jumlah masak berdasarkan perkiraan kasar. Akibatnya terjadi kerugian finansial dan makanan layak makan terbuang. Di sisi lain, banyak mahasiswa dan masyarakat membutuhkan makanan murah serta ingin menjaga pola makan sesuai tujuan diet.

FoodPrint menjawab ketiganya dalam satu aplikasi: **prediksi produksi**, **penyaluran surplus**, dan **pemantauan gizi**.

## ✨ Fitur

### Admin Restoran (Owner)
- **Manajemen menu** dengan foto (dikompres di browser menjadi JPEG 640 px), harga jual, dan HPP. Menu dinonaktifkan dengan soft delete.
- **Catatan harian**: isi diproduksi dan terjual; sisa dan rugi per menu (`sisa × HPP`) dihitung otomatis. Satu catatan per menu per tanggal (upsert).
- **Prediksi produksi** besok per menu (algoritma deterministik) beserta **penjelasan AI**.
- **Kesimpulan harian AI** *(P1)*: ringkasan hari terakhir, menu paling rugi dan paling efisien, serta saran.
- **AI Vision**: foto satu makanan → komposisi gizi, vitamin dan mineral (% AKG), serta kelayakan makan (layak / perlu dicek / tidak layak).
- **Dashboard analitik** per bulan: kerugian waste (Rp), potensi hemat, laba bersih, grafik sisa, persentase waste, dan menu paling boros.
- **Surplus Food**: buat listing dari sisa dengan foto produk dan checklist keamanan pangan wajib.
- **Pesanan masuk**: scan atau ketik kode barcode, konfirmasi, tandai sudah diambil, atau batalkan.
- **Ekspor CSV** ringkasan bulanan *(P1)*.

### Customer
- **Tujuan diet**: turun berat badan, kurangi gula, naik massa otot, jaga berat badan, kurangi garam, atau makan seimbang.
- **Cek Gizi AI** dari nama dan/atau foto makanan, dinilai terhadap tujuan diet (skor 0–100), lalu bisa dicatat ke makanan hari ini.
- **Beranda progres diet**: total hari ini vs target, tren 7 hari, grafik 14 hari, dan progres berat badan.
- **Pesan makanan surplus** (1–20 porsi, bayar di tempat) dan tunjukkan **barcode Code 128** di halaman *Pesananku*.

### Publik (tanpa login)
- Halaman `/surplus` menampilkan daftar makanan surplus aktif beserta fotonya.

## 🤖 Fitur AI

| Fitur | Endpoint | Fungsi | Fallback jika AI gagal |
|---|---|---|---|
| AI Vision | `api/vision.ts` | Gizi dan kelayakan makanan dari foto (output JSON terstruktur) | Pesan jelas + tombol *Lihat contoh hasil* |
| Penjelasan rekomendasi & kesimpulan harian | `api/explain.ts` | Menjelaskan angka hasil prediksi. **AI tidak mengubah angka.** | Template berbasis aturan |
| Cek Gizi customer | `api/nutrition.ts` | Estimasi gizi dan penilaian terhadap tujuan diet | Tabel gizi cadangan makanan umum Indonesia |

**Batas dan keamanan AI**
- API key Gemini hanya ada di server (environment variable Vercel).
- Setiap panggilan memverifikasi JWT Supabase.
- Rate limit **30 panggilan AI per pengguna per hari** (tabel `ai_usage`), timeout 20 detik, retry maksimal 1 kali.
- Respons divalidasi dengan `zod`; respons invalid tidak membuat aplikasi crash.
- Hasil penjelasan dan kesimpulan di-cache di `ai_insights` (per tanggal).
- Foto untuk AI Vision dan Cek Gizi **tidak disimpan**.
- Disclaimer: hasil AI berupa perkiraan, bukan pengganti pemeriksaan langsung atau saran tenaga kesehatan. Kelayakan makanan hanya dinilai dari tanda visual.

### Algoritma Prediksi (deterministik, TypeScript)
Untuk setiap menu aktif dan tanggal target dengan hari dalam minggu `d`:
1. Ambil maksimal 6 catatan terakhir pada hari `d`.
2. Hitung rata-rata tertimbang `terjual` (bobot 1, 2, 3, … dari terlama ke terbaru, dinormalisasi).
3. `rekomendasi_produksi = ceil(prediksi_terjual × 1.05)` (buffer 5%).
4. **Keyakinan**: tinggi jika data ≥ 4 dan koefisien variasi < 0.25; sedang jika data ≥ 3; selain itu rendah.
5. Jika data hari yang sama < 2, gunakan rata-rata keseluruhan dan tandai **Data belum cukup**.
6. `estimasi_hemat = max(0, produksi_terakhir_hari_yang_sama − rekomendasi) × HPP`.

Fungsi ini berupa fungsi murni dengan unit test (`src/lib/forecast.test.ts`).

## 🧱 Tech Stack

| Lapisan | Teknologi |
|---|---|
| Frontend | React + Vite + TypeScript, Tailwind CSS, React Router |
| Grafik | Recharts |
| Ikon | lucide-react |
| Barcode | JsBarcode (Code 128) |
| Backend | Vercel Serverless Functions (TypeScript) |
| Database & Auth | Supabase (PostgreSQL, Auth, Row Level Security) |
| AI | Google Gemini API (multimodal) |
| Validasi | zod |
| Testing | Vitest |
| Hosting | Vercel (frontend + functions), Supabase Cloud |

## 🏗️ Arsitektur

```
Browser (React + Vite)
 ├── Supabase JS ── auth, CRUD, RPC pesanan (dilindungi RLS)
 └── fetch /api/*  ── Vercel Serverless Functions
                        ├── verifikasi JWT Supabase
                        ├── cek rate limit (ai_usage)
                        ├── panggil Gemini API (key di env)
                        └── kembalikan JSON tervalidasi (zod)
```

Semua logika berada dalam satu repo dan di-deploy ke Vercel + Supabase, tanpa layanan terpisah yang bisa mati saat penjurian.

## 📁 Struktur Repo

```
foodprint/
├── api/                  # vision.ts, explain.ts, nutrition.ts, _lib/
├── src/
│   ├── pages/
│   │   ├── public/       # Landing, Auth, SurplusPublic, NotFound
│   │   ├── owner/        # Dashboard, InputPage, WastePage (AI Vision), ForecastPage,
│   │   │                 # SurplusManage, SurplusNew, OwnerOrders, Settings
│   │   └── customer/     # Home, Onboarding, Nutrition, MyOrders, ProfilePage
│   ├── components/
│   └── lib/              # supabase.ts, forecast.ts, analytics.ts, diet.ts (+ test),
│                         # fallback.ts, format.ts, mockSupabase.ts
├── supabase/             # schema.sql, seed.sql
├── docs/                 # ai-usage.md, screenshots, sample-photos
├── .env.example
└── README.md
```

## 🗺️ Rute Aplikasi

| Route | Isi | Akses |
|---|---|---|
| `/` | Landing, tombol Coba Demo dan Login | Publik |
| `/login`, `/register` | Autentikasi dan pilihan peran | Publik |
| `/forgot-password`, `/reset-password` | Lupa dan reset password | Publik |
| `/surplus` | Daftar makanan surplus | Publik |
| `/dashboard` | Dashboard analitik | Owner |
| `/input` | Menu dan catatan harian (`?date=YYYY-MM-DD`) | Owner |
| `/waste` | AI Vision | Owner |
| `/forecast` | Prediksi, penjelasan AI, kesimpulan harian | Owner |
| `/surplus/new`, `/surplus/manage` | Buat dan kelola listing | Owner |
| `/orders`, `/settings` | Pesanan masuk dan profil usaha | Owner |
| `/onboarding`, `/home` | Tujuan diet dan Beranda progres | Customer |
| `/nutrition`, `/myorders`, `/profile` | Cek Gizi, pesanan + barcode, profil | Customer |

## 🚀 Cara Menjalankan

### Prasyarat
- Node.js 20+ dan npm
- Akun Supabase (free tier), akun Vercel, dan API key Gemini dari Google AI Studio

### 1. Clone dan install
```bash
git clone https://github.com/arfyrafa/FoodPrint---Food-Waste-Management.git
cd FoodPrint---Food-Waste-Management
npm install
```

### 2. Mode demo lokal (tanpa server)
Jika `.env` belum diisi, aplikasi otomatis memakai `mockSupabase.ts` dengan data contoh di browser.
```bash
npm run dev
```
Akun mode lokal: `demo@foodprint.id` / `pembeli@foodprint.id` dengan password `demo123` (hanya untuk laptop).

### 3. Mode penuh (Supabase + Gemini)
```bash
cp .env.example .env
```
Isi variabel berikut:

| Variabel | Keterangan |
|---|---|
| `VITE_SUPABASE_URL` | URL project Supabase |
| `VITE_SUPABASE_ANON_KEY` | Anon key Supabase (aman untuk client, dilindungi RLS) |
| `GEMINI_API_KEY` | **Server only.** Jangan pernah di-commit |
| `GEMINI_MODEL` | Nama model Gemini Flash terbaru di free tier (cek Google AI Studio) |
| *(sesuai kebutuhan `api/_lib`)* | Variabel server Supabase untuk verifikasi JWT dan rate limit |

### 4. Siapkan database
1. Jalankan `supabase/schema.sql` di SQL Editor Supabase (aman dijalankan ulang).
2. Di **Authentication**, buat dua user demo (centang *Auto Confirm User*).
3. Samakan email pada `v_owner_email` dan `v_customer_email` di `supabase/seed.sql`, lalu jalankan.
4. Tambahkan `https://[domain-production]/reset-password` ke **Redirect URLs** Supabase.

### 5. Jalankan, uji, dan build
```bash
npm run dev      # development
npm test         # Vitest (forecast, analytics, diet, fallback, skema AI)
npm run build    # production build
```
Untuk menjalankan serverless functions secara lokal, gunakan `vercel dev`.

### 6. Deploy
Hubungkan repo ke Vercel, isi environment variables di dashboard Vercel, lalu deploy. Website harus tetap aktif sampai **30 November 2026**.

## 🔑 Akun Demo

| Peran | Email | Password |
|---|---|---|
| Admin Restoran | `demo@foodprint.id` | `demo123` |
| Customer | `pembeli@foodprint.id` | `demo123` |

- Akun customer dibuat dengan `onboarded = false`, sehingga pertanyaan tujuan diet muncul saat login pertama.
- Akun demo **tidak boleh dihapus** sebelum 30 November 2026.
- Listing surplus contoh di seed hanya aktif sekitar 3–4 jam. Jalankan ulang `seed.sql` sebelum perekaman video dan sebelum penjurian (28–29 November) agar halaman `/surplus` terisi.

## 🧪 Catatan Data Simulasi

Seluruh data pada akun demo dibuat oleh `supabase/seed.sql` dan **merupakan simulasi, bukan data usaha nyata**:
- 1 outlet demo (*Kantin Kampus Demo*), 6 menu, dan 8 minggu catatan harian hari kerja.
- Pola simulasi: Senin dan Rabu ramai, Jumat paling sepi, waste lebih tinggi pada menu yang diproduksi berlebih (Gado-Gado, Soto Ayam).
- Data customer: 14 hari catatan makan, catatan berat 4 minggu.
- Tanggal bersifat relatif terhadap hari seed dijalankan.

## 🔒 Keamanan dan Privasi

- **Row Level Security aktif di semua tabel.** Pengguna A tidak dapat membaca data pengguna B.
- Peran (`profiles.role`) tidak dapat diubah sendiri oleh pengguna (column-level grant).
- Pesanan hanya lewat RPC atomik `place_order` dan `set_order_status` (`security definer`) yang menjaga stok dan perpindahan status.
- Halaman publik membaca view `public_surplus` dengan kolom terbatas, bukan tabel langsung.
- Tidak ada secret di repo; gunakan `.env.example`.
- Data yang dikumpulkan: email, nama usaha (admin), tujuan diet, berat badan, catatan makan, dan nomor WhatsApp opsional (customer). Data customer hanya dapat dibaca pemiliknya.

## 🤝 Penggunaan AI, Template, dan Library

> Sumber kebenaran: `docs/ai-usage.md`. Isi tabel ini harus **konsisten** dengan proposal (bagian 2.5) dan Surat Pernyataan Orisinalitas dan AI.

### AI di dalam aplikasi
| Layanan | Dipakai untuk |
|---|---|
| Google Gemini API (`GEMINI_MODEL`) | AI Vision, penjelasan rekomendasi, kesimpulan harian, Cek Gizi |

### AI coding assistant saat development
| Tool | Dipakai untuk |
|---|---|
| Claude & Gemini | Scaffold awal, implementasi fitur prediksi & analitik, penulisan test, refactoring UI, dan dokumentasi |

### Library dan aset pihak ketiga
React, Vite, TypeScript, Tailwind CSS, React Router, Recharts, lucide-react, JsBarcode, zod, Vitest, Supabase JS. Seluruh aset ikon menggunakan lucide-react (open-source) dan logo FoodPrint dibuat orisinal oleh tim.

## 🔭 Pengembangan Lanjutan

Di luar scope MVP: integrasi POS/kasir, multi-outlet, pembayaran online, onboarding mitra food rescue, model ML terlatih di server Python terpisah (saat data sudah banyak), dan aplikasi mobile native.

## 👥 Tim

**Techtonic ampe Wisuda**

| Nama | Peran | Kampus |
|---|---|---|
| Muhammad Arfy Rafa | Project Manager | Institut Teknologi Sains Bandung |
| Astri Octasari | Frontend Developer (Admin) | Institut Teknologi Sains Bandung |
| Ratna Juita | Frontend Developer (User) | Institut Teknologi Sains Bandung |
| Galang Thoriq Putra Cahyanto | Dokumenter | Institut Teknologi Sains Bandung |

---

# 🧭 Panduan untuk AI Agent (konteks pengembangan)

> Bagian ini adalah konteks untuk AI coding assistant dan AI penulis proposal. Baca seluruh README ini sebelum mengerjakan tugas apa pun.

## Prinsip kerja
1. Satu alur utama yang matang lebih baik daripada banyak fitur setengah jadi.
2. Semua fitur P0 harus jalan di **production**, bukan hanya localhost.
3. Jangan menambah layanan terpisah (tanpa server Python). Semua logika di satu repo.
4. **Tidak ada layar kosong.** Setiap panggilan AI/database harus punya loading, error ramah, dan fallback.
5. Semua teks UI dalam **Bahasa Indonesia**. Mobile first (uji di 360 px). Tema hijau hangat, ikon dalam kotak berwarna seragam, grafik aman buta warna dan selalu berlabel teks.
6. Status kelayakan makanan selalu tampil dengan **ikon + teks**, tidak hanya warna.

## Aturan keras (pelanggaran = risiko diskualifikasi)
- ❌ Dilarang `git push --force`, rebase pada branch publik, atau menghapus/memanipulasi commit. Gunakan branch + PR.
- ❌ Jangan commit API key atau secret. Periksa riwayat commit.
- ❌ Jangan pakai foto dari internet untuk menu demo (hak cipta); pakai foto asli.
- ❌ Jangan mengklaim data demo sebagai data nyata.
- ❌ Jangan memuat unsur SARA, pornografi, perjudian, malware. Beri moderasi sederhana pada catatan listing dan catatan pesanan.
- ✅ Catat **setiap** penggunaan AI, library, dan aset di `docs/ai-usage.md` sejak hari pertama.
- ✅ Repo public sejak hari 1.

## Jadwal
| Tanggal | Peristiwa |
|---|---|
| 15 Nov | Feature freeze (P1 hanya jika P0 stabil) |
| 19 Nov | Target internal submit |
| 20 Nov 23.59 WIB | **Batas akhir** pengumpulan Gelombang 2 |
| 28–29 Nov | Penjurian (pastikan website dan seed aktif) |
| 30 Nov | Pengumuman pemenang (website wajib tetap aktif) |

## Definition of Done (MVP)
- [ ] Daftar, login, logout, lupa password berfungsi di URL production (Redirect URL Supabase terisi)
- [ ] Akun demo admin (data 8 minggu) dan customer siap; pertanyaan tujuan diet muncul saat login pertama
- [ ] AI Vision menghasilkan JSON valid (komposisi, % AKG, kelayakan), termasuk uji foto tidak layak
- [ ] Forecast menampilkan angka + penjelasan AI; fallback bekerja saat key sengaja dibuat salah
- [ ] Dashboard cocok dengan hitungan manual dari seed
- [ ] Pesan surplus mengurangi stok, barcode tampil, owner bisa scan/ketik kode lalu tandai sudah diambil
- [ ] Cek Gizi bisa dicatat dan progres Beranda berubah
- [ ] Foto menu demo dan foto produk surplus sudah diunggah
- [ ] RLS diuji: akun B tidak dapat membaca data akun A (termasuk pesanan dan catatan makan)
- [ ] Tidak ada API key di repo; `.env.example` ada
- [ ] Unit test forecast dan diet lulus
- [ ] Responsif di 360 px
- [ ] README lengkap (file ini)
- [ ] Video demo 3–5 menit, YouTube Unlisted, bisa dibuka tanpa login
- [ ] Proposal PDF dan Surat Pernyataan Orisinalitas dan AI (PDF)

## Paket pengumpulan (Google Form)
- **Bagian A**: scan KTM seluruh anggota
- **Bagian B**: bukti pembayaran (Gelombang 2: Rp75.000/tim), bukti follow `@it.rush2026` dan `@himatif.unib`, bukti unggah Twibbon resmi
- **Bagian C**: link live website, link repo public, link video demo, proposal PDF, Surat Pernyataan PDF
- **Penamaan proposal**: `ITRUSH26_TechtonicAmpeWisuda_FoodPrint.pdf` (hindari spasi/karakter bermasalah)

**Isi video demo** (urutan): perkenalan → latar belakang & solusi → demo penggunaan dan penjelasan fitur.
Alur admin: login demo → dashboard (pilih bulan) → catatan harian → Forecast → Jelaskan + kesimpulan → AI Vision → buat listing surplus.
Alur customer: login demo → pilih tujuan diet → Beranda → Cek Gizi lalu catat → pesan surplus → tunjukkan barcode → admin scan dan tandai diambil.

## Kriteria penilaian juri
Fungsionalitas & kualitas teknis **25%** · Inovasi & ketepatan solusi **20%** · Relevansi tema & dampak **15%** · UI/UX **15%** · Kualitas source code **15%** · Dokumentasi (proposal, video, README) **10%**.

## Pemetaan Proposal (template resmi IT RUSH) ← README ← PRD

Gunakan README ini sebagai sumber utama saat menulis proposal. Jangan menambah klaim yang tidak ada di README.

| Bagian proposal | Isi yang harus ditulis | Ambil dari |
|---|---|---|
| **1.1 Latar Belakang** | Masalah food waste di kantin/UMKM, kerugian finansial, kebutuhan makanan murah dan pola makan sehat | Latar Belakang |
| **1.2 Rumusan Masalah** | Poin-poin masalah dari 1.1 (produksi tanpa prediksi, surplus terbuang, minim akses gizi) | Latar Belakang |
| **1.3 Tujuan** | Manfaat website: memprediksi produksi, menyalurkan surplus, memantau gizi | Fitur |
| **1.4 Manfaat** | Manfaat keberlanjutan (kurangi waste, hemat biaya, akses makanan murah) | Fitur, Pengembangan Lanjutan |
| **2.1 Deskripsi Website** | Konsep dan fungsi utama, dua peran (owner, customer) + publik | Fitur |
| **2.2 USP** | Prediksi deterministik yang dijelaskan AI, AI Vision kelayakan makanan, surplus + barcode, diet customer dalam satu platform; fallback agar stabil | Fitur AI |
| **2.3 Target Market** | Pengelola kantin kampus/warung/katering, mahasiswa dan masyarakat, komunitas penerima | Fitur |
| **2.4 Monetisasi** | B2B (langganan outlet, fitur premium laporan), B2C (freemium Cek Gizi), kemitraan food rescue. *Ini rencana pengembangan, bukan fitur MVP.* | Pengembangan Lanjutan |
| **2.5 Metode Pengembangan** | Tech stack, arsitektur, algoritma prediksi, penggunaan AI coding assistant dan library (**wajib sama persis** dengan bagian "Penggunaan AI" di README dan Surat Pernyataan) | Tech Stack, Arsitektur, Penggunaan AI |
| **3.1 Fitur Website** | Daftar fitur + fungsi per peran | Fitur |
| **3.2 Arsitektur & User Flow** | Diagram arsitektur dan alur owner/customer | Arsitektur, Rute, alur video demo |
| **3.3 Wireframe** | Low-fidelity halaman utama (dashboard, input, forecast, AI Vision, surplus, Beranda, Cek Gizi, Pesananku) | Rute |
| **3.4 Tampilan UI** | Screenshot/mockup nyata dari `docs/screenshots` | — |
| **4.1 Kesimpulan** | Rangkum masalah → tujuan → metode → rencana pengembangan | Seluruh README |
| **4.2 Saran** | ML terlatih, POS, multi-outlet, payment gateway, mitra food rescue, mobile native | Pengembangan Lanjutan |

Proposal wajib menyertakan **akun demo** (kedua peran) dan menyatakan bahwa data demo adalah simulasi.

# FoodPrint

**Stop Wasting Food, Start Predicting Demand.**
Web app untuk kantin kampus & UMKM kuliner agar memasak sesuai permintaan, ditambah marketplace makanan surplus untuk customer.

Tim **Techtonic ampe Wisuda** · IT RUSH 2026 (Web Development) · Subtema Lingkungan dan Konservasi

> Data pada akun demo adalah **data simulasi**, bukan data usaha nyata.

---

## Fitur

### Admin restoran (role `owner`)
| Fitur | Keterangan |
|---|---|
| Login per usaha | Satu akun = satu outlet. Data antar akun terpisah lewat Row Level Security (akun A tidak bisa melihat data akun B). |
| Manajemen menu | Foto menu (wajib, dari kamera/galeri, otomatis dikecilkan), harga jual & modal (HPP) per porsi, menu bisa dinonaktifkan (soft delete) tanpa menghapus riwayat. Foto tampil juga di Surplus Food. |
| Catatan harian | Isi diproduksi & terjual per menu per tanggal; **sisa (diproduksi − terjual) dan rugi per menu dihitung otomatis**. |
| AI Vision | Foto satu makanan → Gemini menganalisis komposisi gizi (protein, karbohidrat, lemak, serat dalam %), vitamin & mineral (% AKG), dan kelayakan makan (layak / perlu dicek / tidak layak) beserta tanda yang terlihat dan saran penyimpanan. Foto & hasil tidak disimpan. |
| Prediksi produksi | Algoritma deterministik (rata-rata tertimbang hari yang sama + cadangan 5%), default ke hari operasional berikutnya. Gemini menjelaskan angka (tidak mengubahnya). |
| Kesimpulan harian AI | Ringkasan hari terakhir: waste vs rata-rata 30 hari, menu paling rugi, 2-3 saran untuk besok. |
| Dashboard | Ringkasan per bulan (kalender pilihan bulan), laporan hari ini, porsi terbuang, kerugian Rp (sisa × HPP), % waste, potensi hemat, omzet, laba, grafik untung vs rugi **seluruh menu**, tren waste harian, waste per hari dalam seminggu, tabel menu paling boros, ekspor CSV. |
| Surplus Food | Pasang sisa layak dengan harga miring/gratis + **foto produk sisa hari itu (wajib)** + checklist keamanan pangan wajib. Otomatis hilang setelah batas waktu ambil atau stok habis. |
| Pesanan masuk | Scan barcode / ketik kode pesanan untuk menandai sudah diambil, konfirmasi / batalkan (stok kembali otomatis), tombol WhatsApp ke customer. |

### Customer (role `customer`)
| Fitur | Keterangan |
|---|---|
| Pertanyaan tujuan | Saat login pertama, customer memilih tujuan (turun BB, kurangi gula, naik otot, jaga BB, kurangi garam, seimbang) dan target harian. |
| Beranda progres diet | Fokus tujuan, total hari ini vs target, tren 7 hari vs minggu lalu (naik/turun), hari sesuai target, grafik 14 hari, berat badan & progres menuju target. |
| Surplus Food | Cari & pesan makanan surplus (bayar di tempat saat ambil), barcode pengambilan (Code 128), batalkan pesanan yang masih menunggu. |
| Cek Gizi AI | Nama dan/atau foto makanan → perkiraan kalori, protein, karbohidrat, lemak, serat, gula, natrium + penilaian cocok/tidak untuk tujuan diet, lalu bisa dicatat ke makanan hari ini. |
| Profil | Nomor WhatsApp, tujuan diet, catatan makanan (dipakai Cek Gizi). |

Halaman `/surplus` bisa dibuka **tanpa login** (hanya lihat). Memesan butuh akun customer.

### Akun
- Daftar, masuk, keluar, dan **lupa password** (link reset dikirim ke email lewat Supabase Auth, lalu buat password baru di `/reset-password`).

### Keandalan
- Semua fitur AI punya **fallback berbasis aturan**: penjelasan/kesimpulan template & tabel gizi cadangan, sehingga tidak ada halaman kosong saat Gemini error atau kuota habis.
- Rate limit 30 panggilan AI per user per hari (tabel `ai_usage`), timeout 20 detik, retry 1×.
- Penjelasan AI di-cache di tabel `ai_insights` agar tidak memanggil ulang.

---

## Tech stack
React 19 + Vite + TypeScript · Tailwind CSS v4 · React Router · Recharts · Supabase (PostgreSQL, Auth, RLS) · Vercel Serverless Functions · Gemini API (REST, structured output) · zod · Vitest

```
api/                 Serverless functions (vision, explain, nutrition) + _lib (auth JWT, rate limit, Gemini, schema zod)
src/pages/public     Landing, Login/Register, Surplus publik
src/pages/owner      Dashboard, Catatan & Menu, AI Vision, Prediksi, Surplus, Pesanan, Pengaturan
src/pages/customer   Pesananku, Cek Gizi, Profil
src/lib              forecast.ts (+test), analytics.ts (+test), fallback.ts, supabase.ts, api.ts
supabase/            schema.sql (tabel, RLS, trigger, RPC pesanan, view publik), seed.sql (data demo simulasi)
docs/ai-usage.md     Catatan penggunaan AI (disclosure)
```

---

## Cara menjalankan

### 1. Supabase
1. Buat project di [supabase.com](https://supabase.com).
2. **SQL Editor** → jalankan isi `supabase/schema.sql`.
3. **Authentication → Providers → Email**: untuk lomba, matikan *Confirm email* agar juri bisa langsung daftar & login.
4. **Authentication → Users → Add user** (centang *Auto Confirm User*):
   - `demo@foodprint.id` (admin restoran demo)
   - `pembeli@foodprint.id` (customer demo)
5. **SQL Editor** → jalankan `supabase/seed.sql` (ganti email di baris atas jika berbeda).
   Listing surplus contoh hanya aktif ±4 jam. **Jalankan ulang seed sebelum rekam video dan sebelum penjurian.**

### 2. Gemini
Buat API key di [Google AI Studio](https://aistudio.google.com/apikey). Cek nama model Flash terbaru lalu isi `GEMINI_MODEL`.

### Mode demo lokal (tanpa Supabase)
Jika `.env` masih berisi nilai contoh, web otomatis berjalan dengan data contoh di browser. Login: `demo@foodprint.id` atau `pembeli@foodprint.id`, password `demo123`. Hanya untuk mencoba di laptop sendiri, bukan untuk juri.

### 3. Lokal
```bash
npm install
cp .env.example .env      # isi nilai Supabase, Gemini, akun demo
npm test                  # unit test forecast, analytics, fallback
npx vercel dev            # frontend + /api (butuh Vercel CLI)
# atau: npm run dev (frontend saja, /api diproxy ke localhost:3000)
```

### 4. Deploy ke Vercel
1. Push repo ke GitHub (public), import di Vercel (framework: Vite).
2. Isi **Environment Variables**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `AI_DAILY_LIMIT`, dan (opsional) `VITE_DEMO_*`.
3. Supabase → Authentication → URL Configuration: isi **Site URL** dengan URL Vercel, lalu tambahkan **Redirect URLs** `https://<url-vercel>/reset-password` dan `http://localhost:5173/reset-password` (untuk fitur lupa password).
   Catatan: email bawaan Supabase dibatasi beberapa email per jam; cukup untuk demo.
4. Uji fallback: ganti `GEMINI_API_KEY` dengan nilai salah → halaman Prediksi & Cek Gizi tetap menampilkan hasil cadangan.

> Supabase free tier bisa *pause* jika tidak aktif. Buka project secara berkala sampai 30 November 2026.

---

## Akun demo
| Peran | Email | Password |
|---|---|---|
| Admin restoran | demo@foodprint.id | *(isi)* |
| Customer | pembeli@foodprint.id | *(isi)* |

---

## Keamanan
- RLS aktif di semua tabel; owner hanya mengakses outlet miliknya (`owns_outlet`).
- Kolom `role` tidak bisa diubah user (column-level grant).
- Pesanan hanya lewat RPC `place_order` / `set_order_status` (cek role, stok, batas waktu secara atomik).
- Pengunjung anonim hanya membaca view `public_surplus` (kolom terbatas, listing aktif & lolos checklist).
- API key Gemini hanya di server; setiap endpoint AI memverifikasi JWT Supabase.

## Penggunaan AI & library
Lihat [`docs/ai-usage.md`](docs/ai-usage.md). Library utama: React, React Router, Supabase JS, Recharts, zod, lucide-react, Tailwind CSS, Vite, Vitest.

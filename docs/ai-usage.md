# Catatan Penggunaan AI (Disclosure)

Satu sumber kebenaran untuk README, proposal bagian 2.5, dan Surat Pernyataan. Perbarui setiap kali AI dipakai.

## A. AI di dalam aplikasi
| Fitur | Model | Fungsi | Batasan |
|---|---|---|---|
| AI Vision (`api/vision.ts`) | Google Gemini Flash (env `GEMINI_MODEL`) | Menganalisis satu makanan dari foto: komposisi gizi (%), vitamin & mineral (% AKG), kelayakan makan | Perkiraan; kelayakan hanya dari tanda visual; foto tidak disimpan |
| Penjelasan prediksi (`api/explain.ts`, mode forecast) | Gemini Flash | Menjelaskan angka rekomendasi produksi | Angka dihitung algoritma deterministik; AI dilarang mengubah/menambah angka |
| Kesimpulan harian (`api/explain.ts`, mode daily) | Gemini Flash | Merangkum produksi, sisa, kerugian satu hari + saran | Hanya memakai angka yang diberikan |
| Cek Gizi (`api/nutrition.ts`) | Gemini Flash | Perkiraan gizi & kecocokan dengan tujuan diet | Perkiraan, bukan saran medis (disclaimer di UI) |

## B. AI coding assistant saat development
| Tanggal | Alat | Dipakai untuk | Ditinjau oleh |
|---|---|---|---|
| 13 Nov 2026 | Claude (Anthropic) | Scaffold awal project: skema database & RLS, seed data simulasi, endpoint API AI, halaman frontend, unit test | *(isi nama anggota)* |
| | | | |

## C. Template & aset
- Logo FoodPrint: dibuat tim *(isi alat/sumber pembuatan logo)*.
- Tidak memakai template UI berbayar.

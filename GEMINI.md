# Git Workflow Rule

Setiap kali Anda (AI Agent) selesai melakukan modifikasi, penambahan, atau penghapusan file dalam proyek ini (menyelesaikan suatu tugas/fitur), Anda DIWAJIBKAN untuk secara otomatis:
1. Mengecek status git (`git status`)
2. Melakukan staging pada file yang berubah (`git add .`)
3. Membuat commit dengan pesan yang deskriptif dan sesuai (`git commit -m "..."`)
4. Melakukan push langsung ke branch utama: **`git push origin main`**.

### Catatan:
- Semua pembaruan/fitur langsung diarahkan dan di-push ke branch **`main`**.
- Tidak memerlukan konfirmasi tambahan untuk push ke `main`.

---

# WORKSPACE RULES: STRICT SURGICAL EXECUTION MODE

Kamu adalah Senior Software Engineer yang bertugas sebagai eksekutor bedah kode (surgical code executor). Tugas utamamu adalah mengeksekusi instruksi dengan presisi mutlak, dampak samping nol (zero side-effects), dan ketuntasan menyeluruh hingga ke akar masalah.

---

## 1. PRINSIP MINIMAL DIFF & ISOLASI RUANG LINGKUP (WAJIB)
- **Hanya Ubah yang Diminta:** Modifikasi HANYA baris kode, fungsi, atau blok yang berkaitan langsung dengan instruksi pengguna.
- **Dilarang Refaktor Tanpa Izin:** JANGAN PERNAH merapikan kode di sekitar area kerja, mengubah nama variabel/fungsi, mengubah urutan import, atau memodifikasi logika fitur lain yang sudah berjalan normal.
- **Dilarang Menambah Fitur Siluman:** Jangan menambahkan fitur tambahan, validasi ekstra, animasi, atau elemen baru yang tidak disepakati di dalam prompt.
- **Pertahankan Kode Eksisting:** Dilarang menghapus komentar penting, logika fallback, atau penanganan error yang sudah ada demi mempersingkat penulisan kode.

---

## 2. KUNCI MATI DESAIN & UI/UX (UI FREEZE)
- **Larangan Mengubah Tampilan:** Kecuali diminta secara eksplisit untuk mengubah desain, JANGAN PERNAH mengubah class CSS/Tailwind, struktur layout (Grid/Flexbox), warna, ukuran font, padding/margin, atau ikon yang sudah ada.
- **Ikuti Pola Desain Proyek:** Jika diminta membuat komponen baru, wajib meniru 100% pola desain, struktur class, dan konvensi komponen yang sudah ada di proyek ini—bukan menggunakan gaya bawaan model.
- **Edit In-Place:** Lakukan penyuntingan secara spesifik pada bagian yang rusak tanpa menulis ulang (regenerate) keseluruhan struktur DOM/HTML komponen.

---

## 3. PROTOKOL PERBAIKAN MENYELURUH (ROOT-CAUSE & END-TO-END)
- **Dilarang Tambal Sulam (No Surface Patching):** Jangan pernah menyembunyikan pesan error hanya dengan membungkusnya di level UI atau memberi nilai default palsu.
- **Telusuri Hulu ke Hilir:** Setiap kali memperbaiki bug atau mengubah struktur data, telusuri dan pastikan konsistensi di seluruh lapisan arsitektur:
  1. **Lapisan Data:** Skema Database / Supabase / Google Sheets / Tipe Data.
  2. **Lapisan Logika & API:** Endpoint Backend / Server Actions / Google Apps Script / Query.
  3. **Lapisan State:** State Management, Hooks, Context, atau Payload Request/Response.
  4. **Lapisan Presentasi:** Komponen UI yang merender data tersebut.
- **Cek Ketergantungan (Dependency Check):** Sebelum mengubah sebuah fungsi atau variabel, periksa seluruh file lain yang memanggil fungsi tersebut agar tidak terjadi *breaking changes*.

---

## 4. ALUR KERJA WAJIB SEBELUM MENULIS KODE (PLAN-FIRST PROTOCOL)
Untuk setiap perbaikan bug atau perubahan yang melibatkan lebih dari satu blok kode, WAJIB ikuti urutan ini:
1. **Identifikasi Akar Masalah:** Jelaskan secara singkat (2-3 poin) penyebab utama masalah dari hulu ke hilir.
2. **Daftar Target File:** Sebutkan secara spesifik file dan nama fungsi apa saja yang akan disentuh beserta alasannya.
3. **Konfirmasi Ruang Lingkup:** Pastikan tidak ada file atau fitur di luar daftar tersebut yang akan diubah.
4. **Eksekusi Presisi:** Terapkan perubahan kode sesuai rencana di atas tanpa deviasi.

---

## 5. DAFTAR LARANGAN MUTLAK (NEVER DO THIS)
- JANGAN menebak-nebak kebutuhan di luar spesifikasi prompt.
- JANGAN mengganti library, package, atau metode autentikasi yang sedang digunakan.
- JANGAN memotong kode dengan komentar seperti `// ... kode lainnya tetap sama ...` jika berisiko merusak struktur file saat diterapkan.
- JIKA instruksi pengguna berpotensi merusak fitur lain di luar konteks, BERHENTI dan beri peringatan singkat sebelum mengubah file.

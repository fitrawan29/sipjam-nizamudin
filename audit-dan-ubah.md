---
description: Workflow universal orkestrasi Argon + Hydrogen untuk mengaudit fitur dan mengeksekusi perubahan kode di berbagai jenis proyek menggunakan kolaborasi Superpowers, Ponytail, dan Caveman secara hemat kuota.
---

# Workflow Universal: Audit & Modifikasi Multi-Fitur

Workflow ini bersifat **lintas-proyek (project-agnostic)** dan mengoordinasikan **Orchestrator (Argon)** sebagai perencana/verifier serta **Sub-agen (Hydrogen)** sebagai pekerja eksekusi dengan memadukan tiga kerangka kerja:
1. **Superpowers** (Metodologi & Sub-skill Alur Kerja)
2. **Ponytail** (Minimalisme Kode & Pemanfaatan Ulang Kode Repo)
3. **Caveman** (Kompresi Token Komunikasi & Laporan Sub-agen)

---

## Aturan Pemuatan Skill (Wajib Dipatuhi Agen)
Sebelum memulai tahap apa pun, baca indeks `using-superpowers` di `.agents/skills/` atau `~/.gemini/antigravity/skills/`. Jangan pernah melompati **Titik Henti (Checkpoint)** tanpa persetujuan eksplisit dari pengguna.

---

## Tahap 0: Deteksi Otomatis Profil Proyek (Context Auto-Discovery)

**Konfigurasi Mode Aktif:**
- Aktifkan `/caveman full` dan `/ponytail lite`.

**Instruksi Eksekusi untuk Agen:**
Sebelum memeriksa fitur yang diminta pengguna, pindai struktur *root* repositori secara cepat (maksimal 30 detik oleh 1 pekerja **Hydrogen**) untuk mengenali profil proyek saat ini:
1. **Arsitektur & Tech Stack:** Identifikasi apakah proyek menggunakan *framework* modular (misal: Next.js, React, Vue, Node.js), *Single-File Web App* (HTML + Tailwind + Vanilla JS), *Serverless/Script* (Google Apps Script / `Code.gs`), atau *backend* lainnya.
2. **Lapisan Data & Integrasi:** Identifikasi sumber penyimpanan data (misal: Supabase, PostgreSQL, Firebase, Google Sheets, REST API, atau `localStorage`).
3. **Alat Verifikasi Tersedia:** Cek keberadaan skrip pengujian/build di proyek (misal: `package.json` scripts, *typechecker*, *linter*, *test runner*, atau verifikasi berbasis inspeksi DOM/script).
4. Catat profil ini dalam 3 baris padat di awal laporan agar seluruh tahap berikutnya otomatis menyesuaikan diri dengan teknologi proyek.

---

## Tahap 1: Audit Paralel & Pelacakan Akar Masalah (Read-Only)

**Konfigurasi Mode Aktif:**
- Aktifkan `/caveman full` dan `/cavecrew` (kompres komunikasi antar sub-agen Hydrogen hingga ~65%).
- Pertahankan `/ponytail lite` (evaluasi arsitektur menggunakan prinsip komponen yang sudah ada di repo).

**Sub-Skill Superpowers yang Digunakan:**
- `dispatching-parallel-agents`
- `systematic-debugging`

**Instruksi Eksekusi untuk Agen:**
1. Identifikasi daftar fitur atau modul yang disebutkan pengguna dalam prompt.
2. **DILARANG mengubah file kode apa pun pada tahap ini.**
3. Gunakan `dispatching-parallel-agents` untuk menerjunkan pekerja **Hydrogen** secara paralel guna memeriksa masing-masing fitur sesuai arsitektur yang terdeteksi di Tahap 0 (lacak alur UI/tampilan, logika bisnis/state, hingga pemanggilan API/database).
4. Jika ditemukan bug, ketidaksesuaian logika, atau *bottleneck*, terapkan 4 langkah `systematic-debugging` (lacak aliran data & *root cause*, bukan sekadar menebak gejala).
5. Laporkan hasil pemeriksaan kepada pengguna dalam format ringkas gaya `/caveman full`:
   - **Profil Proyek:** `[Ringkasan 1 baris hasil Tahap 0]`
   - **Status Tiap Fitur:** `[Aman / Perlu Perbaikan / Bottleneck]`
   - **Lokasi File & Baris:** `path/to/file:baris`
   - **Akar Masalah / Kondisi Saat Ini:** (Maksimal 2 poin padat per fitur)
   - **Rekomendasi Singkat (Gaya Ponytail):** (Solusi paling sederhana dengan memanfaatkan ulang fungsi/komponen/pola yang sudah ada di proyek ini).

> **🛑 TITIK HENTI 1 (Konfirmasi Audit):**
> Berhenti di sini dan tanyakan kepada pengguna:
> *"Audit selesai. Fitur mana saja yang ingin langsung kita ubah, dan apakah ada penyesuaian pada detail perubahannya?"*

---

## Tahap 2: Brainstorming & Rencana Implementasi Mikro

**Konfigurasi Mode Aktif:**
- Turunkan Caveman ke `/caveman lite` (Wajib: agar spesifikasi dan rencana implementasi tetap utuh, jelas, dan tidak menjadi fragmen terpotong).
- Pertahankan `/ponytail lite`.

**Sub-Skill Superpowers yang Digunakan:**
- `brainstorming`
- `writing-plans`

**Instruksi Eksekusi untuk Agen:**
1. Jalankan prosedur `brainstorming`: ajukan pertanyaan klarifikasi singkat hanya jika ada aturan bisnis, hak akses, atau alur data yang masih ambigu.
2. Terapkan **7-Rung Decision Ladder dari Ponytail** yang disesuaikan dengan jenis proyek:
   - Manfaatkan *helper*, *custom hook*, komponen UI, fungsi utilitas, atau struktur *query* yang sudah ada di repositori ini.
   - Utamakan fitur *native* bawaan bahasa/platform dan *standard library*.
   - **DILARANG menambahkan library/dependency eksternal baru** tanpa izin eksplisit dari pengguna.
3. Jalankan `writing-plans` untuk menyusun daftar tugas mikro (*bite-sized tasks* berdurasi 2–5 menit) yang mencakup:
   - Target file & baris kode yang akan diubah.
   - Rincian perubahan logika yang paling minimal.
   - Metode verifikasi yang sesuai dengan jenis proyek (berdasarkan temuan Tahap 0).

> **🛑 TITIK HENTI 2 (Persetujuan Rencana & Worktree):**
> Berhenti di sini dan tanyakan kepada pengguna:
> 1. *"Apakah rencana implementasi di atas disetujui?"*
> 2. *"Apakah ingin membuat branch terisolasi dengan `using-git-worktrees` sebelum eksekusi, atau langsung mengeksekusi di workspace saat ini?"*

---

## Tahap 3: Isolasi & Eksekusi Perubahan Terkontrol

**Konfigurasi Mode Aktif:**
- Naikkan ke `/caveman full` dan `/cavecrew` (hemat kuota selama proses penulisan kode).
- Naikkan ke `/ponytail full` (tulis kode ~54% lebih ringkas, tanpa *boilerplate* atau abstraksi prematur, namun tetap jaga keamanan validasi di *trust boundary*).
- *Catatan:* Jangan gunakan `/ponytail ultra` agar tidak berbenturan dengan langkah pengujian.

**Sub-Skill Superpowers yang Digunakan:**
- `using-git-worktrees` *(jika dipilih pengguna pada Titik Henti 2 dan proyek menggunakan Git)*
- Pilih salah satu berdasarkan struktur file proyek:
  - `executing-plans` *(Default Hemat Kuota: gunakan untuk proyek Single-File HTML/Apps Script atau jika fitur yang diubah saling berbagi file yang sama)*.
  - `subagent-driven-development` *(Gunakan untuk proyek multi-modul/framework besar di mana tiap fitur berada di direktori yang terpisah)*.
- `test-driven-development`

**Instruksi Eksekusi untuk Agen:**
1. Jika pengguna meminta isolasi Git, jalankan `using-git-worktrees` terlebih dahulu.
2. Eksekusi setiap tugas mikro dari Tahap 2 secara berurutan mengikuti disiplin `test-driven-development`:
   - *Untuk proyek dengan test runner:* Tulis/perbarui unit test yang gagal terlebih dahulu, lalu terapkan kode minimal hingga lulus.
   - *Untuk proyek tanpa test runner (misal: Apps Script / Single-File HTML):* Buat skenario uji input/output atau pemeriksaan sintaks/logika yang terukur sebelum dan sesudah mengubah kode.
3. Patuhi aturan `/ponytail full`: hapus kode mati yang tergantikan, hindari membuat *wrapper* fungsi yang hanya dipanggil satu kali, dan jaga agar perubahan tidak merusak gaya penulisan kode proyek.

---

## Tahap 4: Review Kode & Pemangkasan Over-Engineering

**Konfigurasi Mode Aktif:**
- Aktifkan `/ponytail-review` dan `/caveman-review`.

**Sub-Skill Superpowers yang Digunakan:**
- `requesting-code-review`
- `receiving-code-review`

**Instruksi Eksekusi untuk Agen:**
1. Jalankan `requesting-code-review` untuk memeriksa seluruh perubahan (`git diff` atau blok kode yang dimodifikasi) terhadap rencana awal di Tahap 2.
2. Gunakan kacamata `/ponytail-review`: sisir apakah ada kode baru yang bertele-tele, duplikasi fungsi, variabel tak terpakai, atau *over-engineering* yang bisa disederhanakan.
3. Laporkan temuan dalam format `/caveman-review` (`L<baris>: <masalah> -> <perbaikan>`) dan langsung rapikan.

---

## Tahap 5: Verifikasi Nyata & Penyelesaian

**Konfigurasi Mode Aktif:**
- Pertahankan `/caveman full` dan `/ponytail full`.

**Sub-Skill Superpowers yang Digunakan:**
- `verification-before-completion`
- `finishing-a-development-branch`

**Instruksi Eksekusi untuk Agen:**
1. Jalankan aturan keras `verification-before-completion` sesuai alat verifikasi yang terdeteksi di Tahap 0:
   - Jalankan perintah *build*, *typecheck*, *linter*, atau *test suite* jika tersedia di proyek, lalu tampilkan bukti keluarannya.
   - Jika proyek berupa *Single-File HTML* atau *Google Apps Script* tanpa *build tool*, lakukan pengecekan integritas sintaks, kecocokan pemanggilan fungsi, serta daftar uji fungsional secara eksplisit.
2. Jika proyek menggunakan Git branch/worktree, jalankan `finishing-a-development-branch` dan tawarkan opsi penyelesaian (Merge ke branch utama, buat Pull Request, atau simpan di branch kerja).
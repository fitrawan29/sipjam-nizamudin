---
name: orchestrator-audit-flow
description: Gunakan skill ini secara otomatis ketika pengguna meminta pemeriksaan (audit) beberapa fitur sekaligus, pelacakan bug lintas-modul, refactoring, atau perubahan/penambahan fitur pada aplikasi. JANGAN gunakan skill ini untuk pertanyaan singkat, penjelasan satu fungsi, atau perbaikan teks/CSS satu baris.
---

# Orchestrator Audit & Modification Flow (Argon + Hydrogen)

Skill ini mengintegrasikan **Superpowers**, **Ponytail**, dan **Caveman** secara otomatis di atas arsitektur **Orchestrator (Argon sebagai Koordinator/Arsitek, Hydrogen sebagai Pekerja Cepat)** serta terhubung dengan memori pembelajaran proyek (`learn`).

---

## 0. Aturan Pemicu & Pengecualian Cepat (Fast-Path Filter)

Sebelum menjalankan tahapan di bawah, evaluasi permintaan pengguna:
* **Aktifkan Alur Penuh (Tahap 0 s/d 6):** Jika permintaan melibatkan $>1$ fitur, investigasi alur data/bug yang belum jelas akarnya, perubahan skema database/state, atau modifikasi lintas komponen/file.
* **Lewati Alur Ini (Fast-Path):** Jika pengguna hanya meminta perubahan kosmetik 1 baris, bertanya fungsi kode tertentu, atau memperbaiki salah ketik (*typo*), kerjakan langsung dengan `/caveman full` dan `/ponytail full` tanpa perlu melewati Checkpoint.

---

## Tahap 0: Pembacaan Memori Proyek atau Deteksi Otomatis (Auto-Discovery)

**Mode Aktif:** `/caveman full` | `/ponytail lite`

1. **Cek Memori Proyek Terlebih Dahulu:**
   Periksa apakah file `.agents/PROJECT_MAP.md` (atau catatan hasil skill `learn` sebelumnya) sudah ada di repositori ini.
   * **Jika ADA:** Baca file tersebut untuk langsung mengenali arsitektur, lokasi *helper/komponen* utama, dan skema data tanpa memindai ulang seluruh folder (hemat kuota pembacaan konteks).
   * **Jika BELUM ADA:** Tugaskan 1 sub-agen **Hydrogen** (maksimal 30 detik) untuk memindai *root* proyek guna mengidentifikasi:
     * *Tech Stack & Arsitektur* (misal: Next.js/React, Single-File HTML + Tailwind + JS, Google Apps Script, dll.).
     * *Lapisan Data* (misal: Supabase, Google Sheets, Firebase, REST API, `localStorage`).
     * *Alat Verifikasi* (misal: `package.json` scripts, *typecheck*, *test runner*, atau inspeksi DOM/sintaks).
   * Simpan ringkasan temuan awal tersebut ke `.agents/PROJECT_MAP.md`.

---

## Tahap 1: Audit Paralel & Pelacakan Akar Masalah (Read-Only)

**Mode Aktif:** `/caveman full` | `/cavecrew` | `/ponytail lite`
**Sub-Skill Superpowers:** `dispatching-parallel-agents`, `systematic-debugging`

1. **DILARANG mengubah file kode aplikasi pada tahap ini.**
2. Gunakan `dispatching-parallel-agents` untuk menerjunkan sub-agen **Hydrogen** secara paralel guna memeriksa tiap fitur yang diminta pengguna.
3. Gunakan `/cavecrew` agar komunikasi balik dari setiap pekerja Hydrogen ke koordinator Argon terkompresi hingga 65%.
4. Jika ditemukan bug atau *bottleneck*, jalankan prosedur `systematic-debugging` (lacak aliran data dari UI hingga database/script untuk menemukan *root cause*, bukan menebak gejala).
5. Tampilkan laporan ke pengguna dalam format padat:
   * **Profil Konteks:** `[1 baris dari PROJECT_MAP.md]`
   * **Status Fitur:** `[Aman / Bug / Bottleneck]` beserta lokasi `path/to/file:baris`
   * **Akar Masalah / Alur Saat Ini:** (Maksimal 2 poin padat per fitur)
   * **Opsi Solusi Ponytail:** (Cara paling ringkas menggunakan fungsi/komponen yang sudah tercatat di proyek).

> **🛑 CHECKPOINT 1 (Konfirmasi Audit):**
> Berhenti dan tanyakan: *"Audit selesai. Fitur mana saja yang lanjut kita ubah, dan apakah ada detail tambahan?"*

---

## Tahap 2: Desain Perubahan & Rencana Implementasi Mikro

**Mode Aktif:** `/caveman lite` *(Wajib diturunkan agar rencana tidak terpotong)* | `/ponytail lite`
**Sub-Skill Superpowers:** `brainstorming`, `writing-plans`

1. Jalankan `brainstorming`: ajukan pertanyaan klarifikasi singkat hanya jika ada aturan bisnis atau hak akses yang belum jelas.
2. Terapkan **7-Rung Decision Ladder (Ponytail)**:
   * Wajib memprioritaskan pemakaian ulang fungsi utilitas, komponen UI, *hook*, atau pola *query* yang sudah ada di repositori.
   * Utamakan fitur bawaan platform (*native/stdlib*).
   * **DILARANG menambah dependency/library baru** tanpa persetujuan eksplisit pengguna.
3. Jalankan `writing-plans` untuk mencetak daftar tugas mikro (*bite-sized tasks*) yang mencantumkan target `file:baris`, perubahan logika minimal, dan langkah verifikasinya.

> **🛑 CHECKPOINT 2 (Persetujuan Rencana & Isolasi):**
> Berhenti dan tanyakan: *"Apakah rencana implementasi ini disetujui? Ingin dieksekusi langsung di workspace ini atau buat branch terisolasi dengan `using-git-worktrees`?"*

---

## Tahap 3: Eksekusi Perubahan Kode & TDD Adaptif

**Mode Aktif:** `/caveman full` | `/cavecrew` | `/ponytail full` *(Jangan gunakan `ultra`)*
**Sub-Skill Superpowers:** `using-git-worktrees` *(opsional)*, `executing-plans` / `subagent-driven-development`, `test-driven-development`

1. Buat *worktree* terlebih dahulu jika diminta pengguna pada Checkpoint 2.
2. Pilih metode eksekusi sesuai struktur proyek:
   * Gunakan **`executing-plans`** jika fitur yang diubah berada di file yang sama (misal: *Single-File HTML* atau *Apps Script*) demi penghematan kuota maksimal.
   * Gunakan **`subagent-driven-development`** jika proyek berskala besar/modular dan tiap fitur berada di folder terpisah.
3. Jalankan disiplin `test-driven-development` secara adaptif:
   * *Proyek dengan test runner:* Tulis tes yang gagal terlebih dahulu, lalu tulis kode minimal hingga lulus.
   * *Proyek tanpa test runner:* Tetapkan skenario uji input/output dan validasi sintaks sebelum dan sesudah pengeditan.
4. Patuhi aturan `/ponytail full`: tulis kode sekitar 50% lebih ringkas, hapus kode mati yang tergantikan, hindari *wrapper* sekali pakai, dan jaga validasi keamanan di *trust boundary*.

---

## Tahap 4: Review Kode & Pemangkasan Over-Engineering

**Mode Aktif:** `/ponytail-review` | `/caveman-review`
**Sub-Skill Superpowers:** `requesting-code-review`, `receiving-code-review`

1. Bandingkan seluruh perubahan (`git diff` atau blok kode yang diubah) dengan rencana Tahap 2 menggunakan `requesting-code-review`.
2. Gunakan `/ponytail-review` untuk memangkas duplikasi, variabel tak terpakai, atau abstraksi berlebih yang tidak sengaja ditulis oleh pekerja Hydrogen.
3. Laporkan perbaikan dalam format `/caveman-review` (`L<baris>: <isu> -> <solusi>`).

---

## Tahap 5: Verifikasi Nyata & Pembaruan Memori (`learn`)

**Mode Aktif:** `/caveman full` | `/ponytail full`
**Sub-Skill Superpowers:** `verification-before-completion`, `finishing-a-development-branch` + Skill `learn`

1. Jalankan `verification-before-completion`: eksekusi perintah *build/typecheck/test* atau pemeriksaan integritas sintaks secara nyata dan tampilkan buktinya.
2. **Pembaruan Memori Otomatis (Integrasi `learn`):**
   Perbarui file `.agents/PROJECT_MAP.md` secara singkat (maksimal 5–10 baris baru) dengan mencatat:
   * Komponen/fungsi *helper* baru atau lokasi file penting yang baru disentuh.
   * Akar masalah bug yang baru diselesaikan agar tidak terulang di sesi berikutnya.
3. Jika menggunakan Git branch/worktree, jalankan `finishing-a-development-branch` untuk membantu pengguna melakukan *merge* atau penyelesaian branch.
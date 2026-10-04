## 2026-10-04T07:15:19Z
You are an Explorer subagent (explorer_survey_2).
Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_2

Read ORIGINAL_REQUEST.md at:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (specifically the latest request at the bottom, 2026-10-04T07:11:46Z).

Your objective is technical survey for:
3. R3: Penyesuaian Format Cetak Dokumen Guru & Hapus "Robot" (Kecuali Watermark)
   - Periksa format cetak (print) dokumen di modul Admin vs Guru (misalnya `DokumenView.tsx`, `RekapJurnalView.tsx`, `PrintHeader.tsx`, `globals.css`, dsb.).
   - Bandingkan layout dokumen Guru dengan dokumen Admin: apa yang berbeda (header, tabel, margin, font, dsb.) dan bagaimana menyamakannya agar persis sama rapinya.
   - Selidiki elemen "robot" (ikon bot AI, AI Assistant floating button di `AIAssistant.tsx`, tombol UI melayang, tombol print, floating action buttons, dsb.).
   - Periksa aturan CSS `@media print` yang ada di `globals.css` atau komponen terkait. Cari tahu mengapa elemen robot atau tombol melayang saat ini ikut tercetak atau bagaimana menyembunyikannya saat print (`display: none !important;`).
   - PERIKSA WATERMARK SEKOLAH: Di mana watermark sekolah didefinisikan/dirender pada cetak dokumen? Pastikan watermark sekolah TIDAK BOLEH dihilangkan dan harus tetap tercetak pada preview print / kertas.

Scope boundaries:
- DO NOT edit or modify source code files. You are an exploratory read-only agent.
- Output your comprehensive findings and implementation recommendation in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_2\handoff.md`.
- Send a message to parent when finished.

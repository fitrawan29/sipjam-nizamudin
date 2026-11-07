## 2026-11-06T23:59:55Z
You are explorer_m3_nov_3.
Your working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m3_nov_3\
Path to ORIGINAL_REQUEST.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Path to PROJECT.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md

You MUST read ORIGINAL_REQUEST.md and PROJECT.md first before analyzing anything.

Your mission is to explore and blueprint Milestone 3 (Requirement R4) focusing on:
1. **Upload Progress Bar & Visual Feedback**:
   - Inspect the upload handling in `src/components/AdminDataView.tsx`, `src/components/AdminKelasView.tsx`, and `src/lib/dataIntegrityGuard.ts`.
   - The user requires:
     * Visual progress indicator (progress bar / indicator) showing real-time progress while uploading.
     * Progress should emit percentage (0% to 100%) and stages (e.g. `Membaca berkas CSV...`, `Memvalidasi skema data...`, `Memeriksa dependensi relasional...`, `Mengunggah baris X dari Y...`, `Selesai`).
     * Blueprint the component state (`uploadProgress: number`, `uploadStage: string`, `isUploading: boolean`) and UI display (clean animated progress bar inside upload modal or modal header).
2. **Granular and Specific Error Diagnostics**:
   - The user requires:
     * Specific and clear error explanations when upload fails, whether from database constraints or application validation.
     * Blueprint error translation:
       - Foreign key violation (`23503`): e.g. "Gagal pada baris [X]: Data '[nilai]' tidak ditemukan pada tabel referensi [tabel_referensi]. Pastikan data master terkait sudah diinput terlebih dahulu."
       - Not-null violation (`23502`): e.g. "Gagal pada baris [X]: Kolom wajib '[kolom]' tidak boleh kosong."
       - Unique constraint violation (`23505`): e.g. "Gagal pada baris [X]: Data '[nilai]' pada kolom '[kolom]' sudah ada dalam sistem (duplikat)."
       - Format/Validation errors: Identify row number, column, received value, and expected format.
     * Blueprint UI error presentation: SweetAlert2 modal with expandable detail list or structured alert banner showing row number, column, and exact remediation advice.

Produce a detailed blueprint in your handoff report:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m3_nov_3\handoff.md`
Maintain `progress.md` in your working directory.
When done, notify orchestrator via send_message.

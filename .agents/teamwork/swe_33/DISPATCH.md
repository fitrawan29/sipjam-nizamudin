# Dispatch Prompt for swe_33 (SWE Light)

You are `teamwork_preview_swe`, operating as the dispatch-only orchestrator for a single self-contained software engineering task in SWE Light mode.

## Your Identity & Workspace
- **Identity**: `swe_33`
- **Working directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_33`
- **Project Root**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app`
- **Authoritative Request File**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md`

## Mission
Hilangkan blok tanda tangan admin dari dokumen cetak di sipjam-app: ketika user yang sedang login memiliki role `admin` (atau `Admin`), komponen `PrintSignature` di `src/components/PrintHeader.tsx` tidak boleh merender blok tanda tangan sisi kiri (kolom admin/guru yang mencetak). Kolom tanda tangan Kepala Sekolah dan Pengawas tetap ditampilkan seperti biasa.

This is a single self-contained fix; keep team small and focused.

## Requirements

### R1. Sembunyikan tanda tangan kiri saat pencetak adalah admin
- Jika `user?.role` (case-insensitive) adalah `'admin'`, `PrintSignature` tidak merender blok tanda tangan kiri (kolom `leftTitle`, `leftName`, `leftNip`, `leftSubtitle`). Kolom tanda tangan kanan (Kepala Sekolah) dan Pengawas tetap dirender normal.
- Ubah hanya `PrintHeader.tsx`. Jangan ubah caller — prop `user` sudah diteruskan dari setiap caller.
- Role check pattern yang sudah ada di codebase: `(user?.role || '').toLowerCase() === 'admin'`.

### R2. Layout tidak rusak saat kolom kiri tidak ada
- Ketika kolom kiri disembunyikan, kolom tanda tangan kanan (Kepala Sekolah) tetap terposisi rapi — tidak ada ruang kosong besar di kiri, tidak ada pergeseran layout yang aneh. Gunakan flag `singleColumn` yang sudah ada jika applicable, atau sesuaikan CSS minimal.

## Acceptance Criteria
- [ ] `user.role === 'admin'` → blok tanda tangan kiri tidak dirender sama sekali (tidak hanya invisible/hidden, benar-benar tidak ada di DOM)
- [ ] `user.role === 'Admin'` (kapital) → sama, tidak dirender
- [ ] `user.role === 'guru'` atau role lain → blok kiri tetap dirender seperti biasa
- [ ] `user` undefined/null → perilaku default tidak berubah (blok kiri tetap ada)
- [ ] Saat role admin, kolom Kepala Sekolah masih terlihat dan posisinya tidak bergeser ekstrem
- [ ] Tidak ada TypeScript error baru (`npx tsc --noEmit`)
- [ ] Hanya `PrintHeader.tsx` yang diubah (ditambah unit test verifikasi)
- [ ] Tidak ada prop baru yang ditambahkan ke caller manapun
- [ ] Test verifikasi dibuat/dijalankan dan lulus 100%
- [ ] Seluruh test yang ada (`npm test`) lulus tanpa regresi
- [ ] Commit dan push ke branch `dev` setelah selesai sesuai Git Workflow Rule (`git push origin dev`, dilarang push ke `main`)

## Protocol Reminder
Execute the SWE Light loop: dispatch one implementer on the whole task, then adversarial reviewer round(s) with an open issues ledger, establishing correctness through automated test execution. Report back to the Sentinel when ready.


## 2026-10-26T06:29:58Z
You are swe_33. Your working directory is `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_33`.
Read your dispatch instructions in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_33\DISPATCH.md` and `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md`.
Execute the SWE Light loop: dispatch one implementer on the whole task, then adversarial reviewer round(s) with an open issues ledger, establishing correctness through automated test execution.
Ensure strict adherence to Git Workflow: commit changes and push to branch `dev` (`git push origin dev`, never `main`).
Report back to the Sentinel via send_message when complete with your final summary.

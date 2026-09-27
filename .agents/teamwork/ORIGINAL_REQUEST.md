# Original User Request

## Initial Request — 2026-09-26T09:46:54Z

Investigate and fix a complex issue where admin and teacher (guru) accounts are unable to read their data following a recent update. This requires checking multiple parts of the application to resolve the issue.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

Requirements:
- R1. Root Cause Analysis: Identify the root cause of the issue preventing admin and teacher roles from retrieving or viewing their data (e.g., missing permissions, broken queries, or routing issues introduced in the recent update).
- R2. Implement Fix: Apply the necessary fixes across the application to restore data access for both admin and teacher accounts.
- R3. Regression Prevention: Ensure that the fix maintains data access security and does not break data retrieval for other existing roles (e.g., students/siswa).

Verification Resources:
No explicit test suite provided. The agent team must construct its own programmatic test or agent-as-judge verification based on the application's login and data retrieval flows.

Acceptance Criteria:
- An automated test or agent-judge verifies successful login as an Admin and subsequent successful data retrieval (e.g., dashboard data or user lists load without errors).
- An automated test or agent-judge verifies successful login as a Teacher (Guru) and subsequent successful data retrieval.
- Verification confirms that data access for other roles remains intact and unaffected by the fix.

Please also strictly respect the Git Workflow Rule defined in GEMINI.md:
Whenever completing file modifications/additions/deletions, check git status, stage changes (git add .), commit with a descriptive message, and push to the active origin branch automatically.

## 2026-09-27T11:26:31Z

This is a single self-contained fix; keep it small and focused.
Identifikasi dan perbaiki bug login untuk akun super admin dan guru, serta perbaiki masalah sinkronisasi data yang tidak update (tidak sesuai dengan database) setelah sesi dibiarkan idle/tidak login dalam waktu lama. Terapkan prinsip Ponytail (pilih solusi paling sederhana dan minimal, utamakan fitur bawaan framework tanpa dependensi baru).

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: demo

## Requirements

### R1. Perbaikan Login (Super Admin & Guru)
Baca dan pahami alur autentikasi yang ada saat ini. Identifikasi penyebab gagal login untuk role 'super admin' dan 'guru', lalu terapkan perbaikan yang paling sederhana dan minimal (Ponytail mode).

### R2. Perbaikan Sinkronisasi Data (Stale Data)
Selidiki akar masalah mengapa data yang ditampilkan tidak sesuai dengan database setelah pengguna dibiarkan idle/tidak login dalam waktu lama. Terapkan mekanisme yang tepat (misalnya pembersihan cache, invalidasi state, atau penanganan token expired) dengan memanfaatkan fitur bawaan framework.

## Acceptance Criteria

### Verifikasi Fungsional (Agent-as-judge)
- [ ] Agen memverifikasi bahwa login sebagai 'super admin' berhasil dilakukan setelah perbaikan.
- [ ] Agen memverifikasi bahwa login sebagai 'guru' berhasil dilakukan setelah perbaikan.
- [ ] Agen memverifikasi bahwa setelah sesi berakhir atau di-simulate idle dalam waktu lama, aplikasi mengambil data terbaru dari database (tidak menampilkan data lama dari cache).
- [ ] Perbaikan dievaluasi berdasarkan kesederhanaan (tidak ada boilerplate berlebihan atau dependensi baru).


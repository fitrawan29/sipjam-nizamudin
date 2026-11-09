## 2026-11-09T05:45:00Z
You are challenger_bk_2, a code-executing adversarial verifier.
Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_bk_2
You MUST read the original user request before starting work:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md

Also read:
- Project Plan: c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md
- Worker Handoff: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_bk\handoff.md

Your Adversarial Mission:
Empirically stress-test Jurnal BK functionality, Universal Student Selector, Admin BK Account Management, and Non-Regression:
1. Stress-test classless counseling & student selector in `src/components/BkJurnalView.tsx`:
   - Verify that students can be selected across all classes without timetable or schedule locks.
   - Test search filtering by Name, NISN, and Class.
   - Verify validation of counseling fields (student, date, time, bidang, layanan, catatan, tindak_lanjut).
   - Test CRUD operations and draft auto-saving resilience.
   - Verify that `isSchemaCacheOrMissingTableError` triggers safe fallback to `localStorage` without crashes.
2. Stress-test Kepala Sekolah Read-Only Mode & Admin Supervision:
   - Verify that when `isReadOnly === true` (Kepala Sekolah), mutative buttons (Simpan, Edit, Hapus) are disabled/hidden, and notice banner `data-testid="readonly-notice"` is rendered.
   - Verify that Admin can view all entries from all counselors and filter by counselor.
3. Stress-test Admin BK Account Management in `src/components/AdminPenggunaView.tsx`:
   - Test "+ Akun BK" form validation: empty NIP, empty name, empty phone, invalid email format, missing fields.
   - Test "Tunjuk BK" / "Ke Guru" toggle.
   - Verify `src/lib/teacherUserSync.ts` preserves assigned BK role.
4. Stress-test Non-Regression:
   - Verify that `src/components/GuruJurnal.tsx` and `src/lib/workflow.ts` are 100% untouched.
   - Run tests: `npx tsx tests/bk_role_and_jurnal_rbac_verification.test.ts`, `npx tsx tests/tata_usaha_role_rbac_and_isolation.test.ts`, `npx tsc --noEmit`.
5. Deliver your verdict: **APPROVE** or **REQUEST_CHANGES** in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_bk_2\handoff.md` and send a message.

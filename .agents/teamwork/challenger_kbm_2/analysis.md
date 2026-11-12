# Adversarial Analysis & Empirical Verification Report (challenger_kbm_2)

**Target Under Review**: Cetak Jurnal KBM (Requirement R2) in `src/components/RekapJurnalView.tsx` (commit `f800a0f`)  
**Evaluator**: challenger_kbm_2 (KBM Challenger 2 - Adversarial Print Verifier)  
**Date**: 2026-11-12  
**Overall Risk Assessment**: **LOW** (All 4 adversarial attack scenarios passed empirically with 0 failures)

---

## Executive Summary

Fitur Cetak Jurnal KBM (Requirement R2) telah diuji secara adversarial dan empiris menggunakan harness pengujian mandiri di `tests/adversarial_kbm_challenger_2.test.ts` serta verifikasi komprehensif di `tests/jurnal_kbm_r1_r2_r3_verification.test.ts`.

Pengujian adversarial berfokus pada 4 skenario stres kritis:
1. **Multi-class teacher stress test**: Guru mengajar di banyak kelas (7A, 7B, 8A) dan sekaligus menjadi wali kelas 7A.
2. **Curriculum naming variations**: Variasi penamaan mata pelajaran di database (prefix kurikulum seperti `"XI Merdeka_Matematika"`, variasi dash/spasi, singkatan umum, case-insensitive, whitespace).
3. **Legacy records compatibility**: Rekaman database historis dengan `sekolah_id IS NULL`.
4. **Table integrity check**: Preservasi tabel cetak 12-kolom `#hasil-rekap-jurnal-guru` dan ketiadaan penimpaan placeholder palsu "Tidak Masuk Kelas" ketika jurnal riil tersedia.

Hasil pengujian membuktikan bahwa seluruh implementasi di commit `f800a0f` berjalan tangguh, akurat, dan memenuhi seluruh kriteria tanpa cacat.

---

## Detailed Adversarial Challenges & Empirical Stress Results

### 1. Challenge 1: Multi-Class Teacher & Wali Kelas Isolation

- **Assumption Challenged**: Guru yang merangkap sebagai wali kelas suatu kelas tertentu (misal 7A) namun mengajar di beberapa kelas lain (7B, 8A) akan tereduksi rekapan cetaknya hanya ke kelas perwaliannya karena auto-select state `kelas`.
- **Attack Scenario**:
  - Inisialisasi komponen `RekapJurnalView` dengan `effectiveMode = 'pribadi'`.
  - Guru memiliki `assignedWalis = ['7A']` dan `assignedKelasList = ['7A', '7B', '8A']`.
  - Jika `setKelas(assignedWalis[0])` dieksekusi tanpa penjagaan mode, state `kelas` terisi `'7A'`, dan query database atau filter in-memory akan memotong data kelas 7B dan 8A.
- **Empirical Findings & Blast Radius**:
  - Pada commit `f800a0f`, baris 286, 290, dan 345 pada `src/components/RekapJurnalView.tsx` telah dijaga secara ketat dengan klausul `&& effectiveMode === 'kelas'`.
  - Pada mode pribadi (`effectiveMode === 'pribadi'`), state `kelas` tetap bernilai string kosong `""` (defaulting ke "Semua Kelas Ditugaskan").
  - Baris 420–427 (`if (activeMode === 'kelas')`) mengisolasi pemfilteran kaku database `.eq('kelas', ...)` dan `.eq('mapel', ...)`. Mode pribadi tidak membatasi query database berdasarkan kelas.
  - Simulasi pemfilteran in-memory membuktikan 100% rekaman guru di kelas 7A, 7B, dan 8A dipertahankan secara utuh tanpa ada yang terpotong.
- **Empirical Test Result**: **PASS** (8/8 sub-checks passed).

---

### 2. Challenge 2: Curriculum Naming Variations & In-Memory Subject Matching

- **Assumption Challenged**: Penamaan mata pelajaran di database dengan format kurikulum baru atau variasi penulisan (seperti `"XI Merdeka_Matematika"`, singkatan `"MTK"`, atau case variations) akan gagal dicocokkan dengan filter mapel di UI (`"Matematika"`), mengakibatkan data tidak tampil saat guru memfilter berdasarkan mapel.
- **Attack Scenario**:
  - Diberikan variasi data riil:
    - Prefix kurikulum bergaris bawah: `"XI Merdeka_Matematika"`, `"VII Kurikulum Merdeka_Matematika"`, `"X-1_Matematika"`, `"XII_IPA_Biologi"`, `"IX-A_Bahasa Indonesia"`.
    - Prefix kurikulum bertanda hubung/spasi: `"X Kurikulum Merdeka - Fisika"`, `"XI Merdeka - Bahasa Inggris"`.
    - Singkatan umum: `"MTK"`, `"Mat"`, `"B. Inggris"`, `"Bhs Inggris"`, `"PJOK"`, `"Penjas"`, `"PAI"`, `"PPKn"`, `"SBK"`, `"IPA"`, `"IPS"`, `"BK"`.
    - Case & whitespace permutations: `"mAtEmAtIkA"`, `"  Matematika  "`.
    - Kontrol negatif (anti-collision): `"Informatika"` vs `"Matematika"`, `"Fisika"` vs `"Kimia"`.
- **Empirical Findings & Blast Radius**:
  - Di `src/components/RekapJurnalView.tsx` baris 479–489, filter in-memory personal mode menggunakan pendekatan bertingkat:
    1. Exact match (`j.mapel === mapel`).
    2. Underscore-split strip clean name (`jClean.toLowerCase() === mClean.toLowerCase()`).
    3. `isJurnalMatchJadwal` dari `src/lib/workflow.ts` yang mengabstraksi singkatan resmi kurikulum dan substring matching.
  - Pengujian empiris terhadap seluruh variasi di atas menunjukkan pencocokan 100% akurat.
  - Catatan Data Integrity: Singkatan `"TIK"` sengaja diblokir oleh sistem melalui `isInvalidMapel` (`src/lib/dataIntegrityGuard.ts`) untuk menegakkan standarisasi kurikulum nasional ke `"Informatika"`, yang merupakan perilaku sistem yang dirancang secara sengaja.
  - Kontrol negatif anti-collision berhasil memblokir false-positive ("Informatika" tidak pernah cocok dengan "Matematika").
- **Empirical Test Result**: **PASS** (26/26 sub-checks passed).

---

### 3. Challenge 3: Legacy Database Records With `sekolah_id IS NULL`

- **Assumption Challenged**: Rekaman jurnal historis yang diinput sebelum migrasi multi-tenant (memiliki `sekolah_id IS NULL`) akan tersembunyi karena query memfilter secara rigid `.eq('sekolah_id', user.sekolah_id)`.
- **Attack Scenario**:
  - Pengguna terdaftar pada tenant sekolah tertentu (`user.sekolah_id = 'sch-alpha-999'`).
  - Database berisi rekaman historis sah dengan `sekolah_id = NULL`, rekaman tenant saat ini, dan rekaman tenant lain.
- **Empirical Findings & Blast Radius**:
  - Pada commit `f800a0f` (baris 405 `RekapJurnalView.tsx`), filter kaku `.eq('sekolah_id', user.sekolah_id)` telah sepenuhnya digantikan oleh sintaks PostgREST toleran:
    ```typescript
    query = query.or(`sekolah_id.eq."${user.sekolah_id}",sekolah_id.is.null`);
    ```
  - Emulasi evaluasi query membuktikan:
    - Rekaman tenant saat ini: **LOLOS**
    - Rekaman historis `NULL`: **LOLOS**
    - Rekaman sekolah/tenant lain: **DITOLAK SECARA AMAN** (tidak bocor antar-tenant).
  - Kasus batas ketika `user.sekolah_id` bernilai `null` atau `undefined` juga tertangani secara aman tanpa runtime exception.
- **Empirical Test Result**: **PASS** (6/6 sub-checks passed).

---

### 4. Challenge 4: 12-Column Table Integrity & Absence of Delinquency Overwrite

- **Assumption Challenged**: Tabel cetak jurnal pribadi `#hasil-rekap-jurnal-guru` kehilangan kolom resmi, atau jurnal riil yang telah diisi oleh guru tertimpa/tersamarkan oleh baris sintetis delinquensi ("Tidak Masuk Kelas").
- **Attack Scenario**:
  - Analisis struktur AST tabel HTML: validasi jumlah elemen `<th>` pada `<thead>` dan `<td>` pada `<tbody>`.
  - Simulasi guru mengisi jurnal KBM untuk tanggal 2026-11-12 pada kelas 7A, mapel Matematika.
  - Terdapat rekaman sintetis auto-generated dengan ID `unfilled-kbm-...` dan status "Tidak Masuk Kelas" untuk jadwal yang sama.
- **Empirical Findings & Blast Radius**:
  - Struktur tabel `#hasil-rekap-jurnal-guru` pada mode pribadi diverifikasi memiliki tepat **12 kolom resmi**:
    1. No
    2. Hari/Tanggal
    3. Tujuan Pembelajaran
    4. KKTP
    5. Konten
    6. Kegiatan Pembelajaran
    7. Kelas
    8. Mata Pelajaran
    9. Absensi Murid (H/I/S/A)
    10. Lokasi KBM
    11. Foto Dokumentasi
    12. Catatan
  - Logika deduplikasi dan penumpasan di `RekapJurnalView.tsx` baris 1160–1182 (`hasRealJournalForClass`) secara otomatis mendeteksi keberadaan jurnal riil yang sah pada tanggal, kelas, dan mapel yang sama. Jika jurnal riil ada, rekaman delinquensi "tidak masuk kelas" **dieliminasi dari tampilan** (`return false`).
  - Jurnal riil tetap terender secara penuh dengan konten asli (`materi`, `kegiatan`, absensi, dan foto kegiatan).
  - Jika guru benar-benar tidak mengisi jadwal KBM lain (misal kelas 8B), rekaman delinquensi untuk kelas 8B tetap dipertahankan secara akurat.
- **Empirical Test Result**: **PASS** (14/14 sub-checks passed).

---

## Complete Test Suite Execution Metrics

| Test Suite | File | Tests Run | Passed | Failed |
|---|---|:---:|:---:|:---:|
| Adversarial Challenger Suite | `tests/adversarial_kbm_challenger_2.test.ts` | 54 | 54 | 0 |
| Baseline Verification Suite | `tests/jurnal_kbm_r1_r2_r3_verification.test.ts` | 32 | 32 | 0 |
| Next.js TypeScript Build | `npm run build` | Full App Build | OK (exit code 0) | 0 |

---

## Verdict

Berdasarkan bukti empiris pengujian stres adversarial, integritas logika in-memory matching, isolasi multi-kelas, penarikan data historis multi-tenant, dan preservasi format tabel 12-kolom:

### **VERDICT: APPROVE**
Commit `f800a0f` sepenuhnya valid, tangguh, dan siap untuk rilis ke lingkungan produksi.

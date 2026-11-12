# Handoff Report — challenger_kbm_2

**Role**: KBM Challenger 2 (Adversarial Print Verifier)  
**Milestone**: M1 — Verification of Cetak Jurnal KBM (R2)  
**Target**: `src/components/RekapJurnalView.tsx` (commit `f800a0f`)  
**Verdict**: **APPROVE**  
**Date**: 2026-11-12

---

## 1. Observation

- **Multi-Class & Wali Kelas Isolation**:
  - `src/components/RekapJurnalView.tsx` baris 286, 290, dan 345:
    ```typescript
    if (validAssignedMapels.length === 1 && effectiveMode === 'kelas') {
      setMapel(prev => prev || validAssignedMapels[0]);
    }
    if (validAssignedKelas.length === 1 && effectiveMode === 'kelas') {
      setKelas(prev => prev || validAssignedKelas[0]);
    }
    ...
    if (!isAdmin && !isKepalaSekolah && assignedWalis.length > 0 && effectiveMode === 'kelas') {
      setKelas(prev => prev || assignedWalis[0]);
    }
    ```
    Auto-select state `kelas` terisolasi ketat hanya saat `effectiveMode === 'kelas'`. Pada mode pribadi, default `kelas` bernilai string kosong `""`.
  - `src/components/RekapJurnalView.tsx` baris 420–427: Pemfilteran database `.eq('kelas', ...)` dan `.eq('mapel', ...)` dibungkus dalam `if (activeMode === 'kelas')`, sehingga query mode pribadi tidak membatasi kelas atau mapel di level database.

- **In-Memory Subject & Curriculum Matching**:
  - `src/components/RekapJurnalView.tsx` baris 479–489:
    ```typescript
    if (mapel) {
      combined = combined.filter((j: any) => {
        if (!j.mapel) return false;
        if (j.mapel === mapel) return true;
        const jClean = j.mapel.includes('_') ? (j.mapel.split('_').pop() || '').trim() : j.mapel;
        const mClean = mapel.includes('_') ? (mapel.split('_').pop() || '').trim() : mapel;
        if (jClean.toLowerCase() === mClean.toLowerCase()) return true;
        return isJurnalMatchJadwal({ mapel: j.mapel, kelas: j.kelas || 'K' }, { mata_pelajaran: mapel, mapel: mapel, kelas: j.kelas || 'K' });
      });
    }
    ```
    Mencakup variasi prefix kurikulum (`"XI Merdeka_Matematika"` -> `"Matematika"`), singkatan (`"MTK"`, `"B. Inggris"`, `"PJOK"`, `"PAI"`, `"PPKn"`, `"IPA"`, `"IPS"`, `"SBK"`), serta case-insensitivity.

- **Multi-Tenant Tolerant Filter**:
  - `src/components/RekapJurnalView.tsx` baris 404–406:
    ```typescript
    if (user?.sekolah_id) {
      query = query.or(`sekolah_id.eq."${user.sekolah_id}",sekolah_id.is.null`);
    }
    ```
    Filter `.eq('sekolah_id', user.sekolah_id)` yang kaku telah digantikan oleh filter toleran PostgREST `.or()` yang menarik rekaman historis dengan `sekolah_id IS NULL`.

- **12-Column Table Integrity & Anti-Overwrite**:
  - Personal table `#hasil-rekap-jurnal-guru` (baris 1742–1863) terverifikasi merender tepat 12 kolom resmi (`No`, `Hari/Tanggal`, `Tujuan Pembelajaran`, `KKTP`, `Konten`, `Kegiatan Pembelajaran`, `Kelas`, `Mata Pelajaran`, `Absensi Murid (H/I/S/A)`, `Lokasi KBM`, `Foto Dokumentasi`, `Catatan`).
  - Baris 1160–1182 (`hasRealJournalForClass`) secara otomatis mendeteksi keberadaan jurnal riil yang sah dan menyingkirkan baris sintetis delinquensi ("Tidak Masuk Kelas"), mencegah penimpaan placeholder palsu pada data guru.

- **Execution Metrics**:
  - Test harness `tests/adversarial_kbm_challenger_2.test.ts`: **54 PASSED, 0 FAILED**.
  - Baseline verification `tests/jurnal_kbm_r1_r2_r3_verification.test.ts`: **32 PASSED, 0 FAILED**.
  - TypeScript build `npm run build`: **Compiled successfully in 2.3s, 13/13 static pages generated, exit code 0**.

---

## 2. Logic Chain

1. Berdasarkan pengamatan terhadap kode `RekapJurnalView.tsx`, auto-select kelas wali hanya dipicu jika `effectiveMode === 'kelas'`. Karena mode pribadi tidak mengeksekusi branch tersebut, state `kelas` tetap string kosong `""`.
2. Ketika state `kelas` kosong pada mode pribadi, query database tidak menerapkan klausul `.eq('kelas', ...)` karena berada dalam blok `if (activeMode === 'kelas')`. Akibatnya, seluruh rekaman jurnal yang diajar oleh guru di kelas mana pun (misal 7A, 7B, 8A) terambil dari database.
3. Setelah data ditarik, pencocokan in-memory menerapkan pembersihan prefix kurikulum dan fallback ke `isJurnalMatchJadwal`. Pengujian empiris terhadap 26 variasi kurikulum dan singkatan membuktikan data tetap terfilter secara akurat tanpa terbuang dan tanpa false-positive collision.
4. Filter query PostgREST `.or('sekolah_id.eq."...",sekolah_id.is.null')` secara presisi meloloskan data tenant aktif sekaligus data warisan (legacy) tanpa membocorkan data tenant lain.
5. Pada saat penyajian tabel `#hasil-rekap-jurnal-guru`, ke-12 kolom resmi ditampilkan secara lengkap. Adanya guard `hasRealJournalForClass` di baris 1160 menjamin bahwa baris delinquensi palsu "Tidak Masuk Kelas" dihilangkan dari hasil render jika jurnal riil tersedia.
6. Dengan lolosnya 54 pengujian adversarial mandiri, 32 pengujian verifikasi baseline, dan build Next.js produksi tanpa kendala, seluruh kriteria penerimaan R2 terbukti terpenuhi secara objektif.

---

## 3. Caveats

- Singkatan `"TIK"` sengaja diblokir oleh sistem melalui pengawal integritas data `isInvalidMapel` (`src/lib/dataIntegrityGuard.ts`) untuk menegakkan kurikulum nasional yang menstandarisasi nama mata pelajaran ke `"Informatika"`. Ini bukan bug, melainkan guard integritas yang disengaja.
- Pengujian dijalankan di lingkungan Node.js dengan runner `tsx` menggunakan emulasi PostgREST logic dan parsing AST komponen.

---

## 4. Conclusion

Seluruh skenario stres adversarial yang ditugaskan kepada `challenger_kbm_2` telah dieksekusi secara empiris dan diverifikasi hasilnya:
1. Guru multi-kelas merangkap wali kelas berhasil menampilkan seluruh kelas secara lengkap pada mode cetak pribadi.
2. Variasi penamaan kurikulum dan singkatan mapel berhasil dicocokkan secara akurat oleh filter in-memory.
3. Rekaman database historis dengan `sekolah_id IS NULL` berhasil ditarik.
4. Tabel cetak 12-kolom `#hasil-rekap-jurnal-guru` merender data guru secara lengkap tanpa tertimpa placeholder palsu "Tidak Masuk Kelas".

**Verdict**: **APPROVE**

---

## 5. Verification Method

Untuk mereproduksi dan memvalidasi temuan ini secara independen, jalankan perintah-perintah berikut:

```bash
# 1. Jalankan test suite adversarial challenger
npx tsx tests/adversarial_kbm_challenger_2.test.ts

# 2. Jalankan test suite verifikasi baseline R1-R2-R3
npx tsx tests/jurnal_kbm_r1_r2_r3_verification.test.ts

# 3. Jalankan build produksi dan validasi TypeScript
npm run build
```

**Kondisi Invalidasi**:
- Hasil cetak jurnal mode pribadi guru yang merangkap wali kelas hanya menampilkan kelas wali dan mengabaikan kelas lain yang diajar.
- Filter mapel "Matematika" gagal menarik baris berlabel `"XI Merdeka_Matematika"`.
- Rekaman jurnal dengan `sekolah_id IS NULL` tidak muncul pada tabel cetak.
- Muncul teks "tidak masuk kelas" pada tanggal dan jam saat guru telah mengisi jurnal secara sah.

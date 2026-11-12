# Handoff Report — explorer_kbm_2: Investigasi Hilangnya Data Jurnal Guru pada Cetak Jurnal KBM

## 1. Observation
1. **Titik Akses & Routing Fitur Cetak Jurnal KBM**:
   - `src/components/AppScreen.tsx:1132–1148`:
     ```tsx
     {/* Menu Cetak Jurnal KBM untuk Akun Role Guru */}
     {!isAdmin && !isSuperadmin && !isTataUsaha && !isBk && !isSiswa && (
       <button
         type="button"
         onClick={() => {
           setSidebarOpen(false);
           handleNavigation('view-guru-jurnal', 'rekap-pribadi');
         }}
     ```
   - `src/components/ClaySidebar.tsx:290–309`:
     ```tsx
     {/* Quick action Cetak Jurnal KBM untuk Akun Role Guru */}
     {!isAdmin && !isSuperadmin && !isTU && !isBkRole && !isDinas && (
       <button
         type="button"
         onClick={() => {
           onClose();
           onNavigate('view-guru-rekap-jurnal');
         }}
     ```
   - `src/components/GuruJurnal.tsx:1971–1978` & `2783–2791`:
     ```tsx
     <RekapJurnalView
       user={user}
       initialMode="pribadi"
       controlledMode="pribadi"
       hideTabSwitch={true}
       isKepalaSekolah={isKepalaSekolah}
       assignments={myAssignments.length > 0 ? myAssignments : assignments}
     />
     ```
   Seluruh akses "Cetak Jurnal KBM" bermuara langsung pada komponen `RekapJurnalView.tsx` dengan mode `pribadi`.

2. **Query SQL Kaku pada `tarikRekap()` di `src/components/RekapJurnalView.tsx`**:
   - Baris 404–406:
     ```tsx
     if (user?.sekolah_id) {
       query = query.eq('sekolah_id', user.sekolah_id);
     }
     ```
   - Baris 425–429:
     ```tsx
     } else if (activeKelas) {
       query = query.eq('kelas', activeKelas);
     }

     if (mapel) query = query.eq('mapel', mapel);
     ```

3. **Format Data Kolom `mapel` dan `kelas` pada Database `jurnal_pembelajaran`**:
   - Berdasarkan rekaman riil pada `csv/SIPJAM NIZAMUDIN - Jurnal_Pembelajaran (1).csv`:
     - Baris 2: `Ade Fitrawan Ibrahim,XI Merdeka_Matematika,XI Merdeka,2026-07-21,...`
     - Baris 3: `Setia Ambar Ningsih Mamonto,XI Merdeka_Kimia,XI Merdeka,2026-07-21,...`
     - Baris 4: `Ade Fitrawan Ibrahim,X Merdeka_Matematika,X Merdeka,2026-07-23,...`
     - Baris 11: `Saskia Agow,X Merdeka_Bahasa Indonesia,X Merdeka,2026-07-28,...`
     Kolom `mapel` memuat string seperti `"XI Merdeka_Matematika"` atau `"X Merdeka_Matematika"`, sedangkan pada `data_mapel` nilainya adalah `"Matematika"`. Kolom `sekolah_id` dan `user_id` bernilai `NULL` pada seluruh entri warisan.

4. **Auto-Select pada `fetchMaster()` di `src/components/RekapJurnalView.tsx`**:
   - Baris 285–292:
     ```tsx
     // Auto-select if teacher only teaches 1 subject or 1 class
     if (validAssignedMapels.length === 1) {
       setMapel(prev => prev || validAssignedMapels[0]);
     }
     if (validAssignedKelas.length === 1) {
       setKelas(prev => prev || validAssignedKelas[0]);
     }
     ```
   Jika guru memiliki 1 mapel penugasan (misal "Matematika"), `setMapel('Matematika')` otomatis terisi dan memicu filter SQL exact `.eq('mapel', 'Matematika')`.

5. **Loop Sintesis Jadwal Kosong Menggantikan Jurnal Riil**:
   - Baris 610–674:
     Jika `combined` kosong (karena filter mapel/kelas/sekolah_id di atas gagal mencocokkan rekaman di database), `hasJournal` bernilai `false`, dan sistem mensintesis baris `unfilled-kbm-...` bertuliskan `"Tidak Masuk Kelas"` atau `"Wajib Hadir KBM (tidak masuk kelas)"`.

6. **Solusi Pembanding yang Sudah Berhasil di Modul Lain**:
   - `src/components/AdminRekapView.tsx:351`: `calLiburQ.or('sekolah_id.eq.${user.sekolah_id},sekolah_id.is.null')`.
   - `src/components/GuruJurnal.tsx:1609–1626`: Fallback query tanpa filter `sekolah_id` jika query ber-sekolah_id kosong.
   - `src/lib/workflow.ts:893–985`: `isJurnalMatchJadwal()` menangani penghilangan prefix `_`, pemetaan kurikulum, dan kesetaraan nama mapel/kelas secara akurat.

---

## 2. Logic Chain
1. Dari **Observasi 1**, pengguna yang membuka menu "Cetak Jurnal KBM" (baik dari sidebar maupun header form jurnal guru) secara langsung menggunakan komponen `RekapJurnalView.tsx` dalam mode `pribadi`.
2. Dari **Observasi 4**, saat komponen dimuat, `fetchMaster()` memeriksa penugasan guru. Apabila guru mengampu satu mata pelajaran (misalnya `"Matematika"`), state `mapel` otomatis diset ke `"Matematika"`.
3. Dari **Observasi 2**, saat fungsi `tarikRekap()` dieksekusi, klausa `if (mapel) query = query.eq('mapel', mapel)` ditambahkan langsung ke query Supabase PostgREST.
4. Dari **Observasi 3**, nilai kolom `mapel` di tabel `jurnal_pembelajaran` untuk guru tersebut tersimpan dengan prefix tingkatan kelas seperti `"XI Merdeka_Matematika"` atau `"X Merdeka_Matematika"`. Karena SQL operator `.eq()` mewajibkan kesamaan string secara eksak, PostgREST mengembalikan `0` baris data.
5. Begitu pula dari **Observasi 2 dan 3**, klausa `if (user?.sekolah_id) query = query.eq('sekolah_id', user.sekolah_id)` mengecualikan seluruh data jurnal historis yang memiliki `sekolah_id IS NULL`, dan `query.eq('kelas', activeKelas)` mengecualikan kelas paralel vs kelas umum.
6. Dari **Observasi 5**, karena data jurnal riil guru gagal terambil (`combined = []`), loop evaluasi jadwal menganggap guru tidak mengajar sama sekali pada rentang tanggal tersebut, lalu mensintesis entri placeholder `"Tidak Masuk Kelas"` yang menimpa tampilan cetak.
7. Oleh karena itu, data jurnal guru hilang bukan karena database kehilangan data, melainkan karena query SQL `tarikRekap()` terlalu restriktif dan tidak toleran terhadap variasi penamaan kolom historis.

---

## 3. Caveats
- Investigasi berfokus pada alur pemanggilan dan pencetakan data jurnal guru (Requirement R2). Alur penyimpanan jurnal KBM (Requirement R1) telah diinvestigasi secara terpisah pada commit `bece4f3` dan test `tests/jurnal_save_setelah_absensi_selesai.test.ts`.
- Analisis mengasumsikan database PostgreSQL Supabase memuat data riil dengan karakteristik seperti yang terdokumentasi pada berkas CSV historis `csv/SIPJAM NIZAMUDIN - Jurnal_Pembelajaran (1).csv` dan migrasi skema `supabase/migrations/`.

---

## 4. Conclusion
Akar masalah hilangnya data jurnal guru pada Cetak Jurnal KBM adalah:
1. **SQL Filter `.eq('mapel', mapel)` dan `.eq('kelas', activeKelas)` yang kaku pada `src/components/RekapJurnalView.tsx:419–430`**: Memblokir data riil yang memiliki format nama mapel dengan prefix kelas (`XI Merdeka_Matematika`) atau variasi penamaan kelas paralel.
2. **Filter Multi-tenant `.eq('sekolah_id', user.sekolah_id)` pada baris 404–406**: Mengeliminasi seluruh jurnal lama yang memiliki `sekolah_id IS NULL`.
3. **Ketiadaan fallback query identitas guru**: Berbeda dari `src/lib/workflow.ts:2054` dan `GuruJurnal.tsx:1609`, `RekapJurnalView.tsx` tidak memiliki fallback query jika query awal menghasilkan 0 baris.

**Rekomendasi Tindakan (/ponytail)**:
Implementasikan pendekatan minimalis:
1. Longgarkan filter `sekolah_id` di `tarikRekap()` menjadi `.or('sekolah_id.eq."${user.sekolah_id}",sekolah_id.is.null')`.
2. Hapus `query.eq('mapel', mapel)` dan `query.eq('kelas', activeKelas)` dari query database; lakukan pemfilteran mapel dan kelas di level JavaScript in-memory menggunakan `isJurnalMatchJadwal()` dan normalisasi substring.
3. Tambahkan fallback query berbasis token nama guru jika query awal mengembalikan 0 baris pada mode pribadi.

---

## 5. Verification Method

### A. Pengujian Perintah Otomatis (Test Suites)
Jalankan perintah berikut pada terminal proyek:
```bash
npx tsx tests/guru_cetak_jurnal_kbm.test.ts
npx tsx tests/jurnal_kbm_r1_r2_r3_verification.test.ts
npx tsx tests/legacy_jurnal_backward_compatibility.test.ts
npx tsx tests/jurnal_save_setelah_absensi_selesai.test.ts
npx tsx tests/jurnal_edit_delete_r2.test.ts
```

### B. Kondisi Validasi Berhasil
- Seluruh 17 assertions pada `tests/guru_cetak_jurnal_kbm.test.ts` tetap PASS tanpa regresi.
- Seluruh 14 assertions pada `tests/jurnal_kbm_r1_r2_r3_verification.test.ts` PASS.
- Seluruh 7 assertions pada `tests/legacy_jurnal_backward_compatibility.test.ts` PASS.
- Data jurnal dengan `mapel = "XI Merdeka_Matematika"`, `kelas = "XI Merdeka"`, dan `sekolah_id = null` berhasil dimuat dan tampil lengkap pada tabel cetak `#hasil-rekap-jurnal-guru`.

### C. Kondisi Invalidasi (Fail Conditions)
- Jika tabel `#hasil-rekap-jurnal-guru` menampilkan "Tidak ada jurnal ditemukan untuk filter tersebut" padahal di database terdapat baris `jurnal_pembelajaran` untuk guru tersebut pada bulan yang dipilih.
- Jika entri riil tertimpa oleh sintetis placeholder `"Tidak Masuk Kelas"`.

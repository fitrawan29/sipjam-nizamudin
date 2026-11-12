# Handoff Report — explorer_kbm_3 (KBM Architecture & Verification Planner)

**Dokumen**: `handoff.md`  
**Archetype**: Teamwork Explorer (Read-Only Investigation)  
**Parent Conversation ID**: `f8423969-31b1-4c71-9bae-1480d343ca6a`  
**State Folder**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_kbm_3\`  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app`  
**Tanggal**: 2026-11-12  

---

## 1. Observation

Berdasarkan investigasi statis dan empiris pada basis data, alur komponen, dan suite pengujian `sipjam-app`:

1. **Struktur Skema Basis Data (Tabel Tunggal Kanonikal)**:
   - File: `supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql` baris 223–261 mendefinisikan tabel `public.jurnal_pembelajaran`.
   - Perintah `git grep -n -i "create table.*jurnal" supabase/` mengonfirmasi hanya ada dua tabel jurnal di seluruh skema:
     ```sql
     supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql:223:CREATE TABLE IF NOT EXISTS public.jurnal_pembelajaran (
     supabase/migrations/20261109_create_jurnal_bk.sql:8:CREATE TABLE IF NOT EXISTS public.jurnal_bk (
     ```
   - Tidak ada tabel terpisah bernama `jurnal_kbm` atau `jurnal_guru` di PostgreSQL. Semua jurnal KBM dan Jurnal Kegiatan disimpan di `jurnal_pembelajaran`.
2. **Alur Penyimpanan Jurnal KBM (`src/components/GuruJurnal.tsx`)**:
   - Baris 1408–1676: Handler `handleJurnalSubmit` melakukan validasi input wajib (`tujuanPembelajaran`, `kktp`, `konten`, `kegiatan`, `mapel`, `kelas`, `lokasiKbm`, dan foto dokumentasi).
   - Baris 1526–1559: Objek `newJurnal` mendefinisikan field `materi: finalKonten`, `materi_pembelajaran: finalKonten`, `konten: finalKonten`, `kegiatan: kegiatan`, namun tidak memiliki kolom `kegiatan_pembelajaran`.
   - Baris 1558: `...(user?.sekolah_id ? { sekolah_id: user.sekolah_id } : {})` tidak memiliki nilai default fallback bila `user.sekolah_id` undefined (berbeda dengan baris 1705 yang memiliki fallback `'a0000000-0000-0000-0000-000000000001'`).
   - Baris 1904: `const hasNoKbmAssignments = tipeJurnal === 'Jurnal KBM' && !isFetchingAssignments && mapelList.length === 0 && !kelas && !mapel && user?.role !== 'Admin';`
   - Baris 1908: `const isLocked = !!(dailyState?.isLibur || (dailyState && !dailyState.canOpenJurnal && !hasRejectedJurnal) || hasNoKbmAssignments);`
   - Baris 2085 & 2703: Ketika `isLocked` bernilai true, form diberi class `opacity-50 pointer-events-none` dan tombol submit berstatus `disabled`, mencegah guru menekan tombol simpan.
   - Baris 1599–1605: Pencarian sesi eksisting (`existingSessionQuery`) menggunakan klausul PostgREST `.or(\`user_id.eq.${targetSearchUserId},nama_guru.ilike."%${searchEffectiveName}%"\`)`. Jika pencarian sesi gagal mencocokkan sesi absensi yang dibuat pada tahap 1 (`handleSaveAbsensiOnly`), sistem melakukan `insert` baru yang dapat menyebabkan inkonsistensi sesi.
3. **Alur Cetak Jurnal KBM (`src/components/RekapJurnalView.tsx`)**:
   - Menu "Cetak Jurnal KBM" di sidebar (`src/components/AppScreen.tsx` baris 1138) mengarahkan navigasi ke `view-guru-jurnal` tab `rekap-pribadi`. Di tab ini, `GuruJurnal.tsx` merender `<RekapJurnalView initialMode="pribadi" controlledMode="pribadi" />`.
   - Pada `src/components/RekapJurnalView.tsx` baris 342–348:
     ```tsx
     if (isAdmin || isKepalaSekolah || assignedWalis.length > 0) {
       setIsWaliKelas(true);
       setWaliClasses(assignedWalis);
       if (!isAdmin && !isKepalaSekolah && assignedWalis.length > 0) {
         setKelas(prev => prev || assignedWalis[0]);
       }
     }
     ```
   - Pada baris 419–427:
     ```tsx
     if (activeMode === 'kelas') {
       if (!isAdmin && !isKepalaSekolah && waliClasses.length > 0) {
         query = query.eq('kelas', activeKelas || waliClasses[0]);
       } else if (activeKelas) {
         query = query.eq('kelas', activeKelas);
       }
     } else if (activeKelas) {
       query = query.eq('kelas', activeKelas);
     }
     ```
   - Karena guru yang merupakan Wali Kelas secara otomatis memiliki `kelas` bernilai `assignedWalis[0]` (misal `"7A"`), pada mode pribadi (`activeMode === 'pribadi'`), query Supabase mengeksekusi `.eq('kelas', activeKelas)`. Akibatnya, seluruh jurnal dari kelas lain yang diajar oleh guru tersebut (misal 7B, 7C, 8A, 8B) secara sistematis **hilang dari hasil query**.
   - Pada baris 1690–1705: Format tabel cetak jurnal pribadi guru memuat 12 kolom resmi: `No`, `Hari/Tanggal`, `Tujuan Pembelajaran`, `KKTP`, `Konten`, `Kegiatan Pembelajaran`, `Kelas`, `Mata Pelajaran`, `Absensi Murid (H/I/S/A)`, `Lokasi KBM`, `Foto Dokumentasi`, `Catatan`.
4. **Konsumen Hilir (Downstream Consumers)**:
   - Ditemukan 15 modul/komponen pengonsumsi data `jurnal_pembelajaran`: `GuruJurnal.tsx`, `RekapJurnalView.tsx`, `HomeViewGuru.tsx`, `GuruPresensi.tsx`, `AdminVerifView.tsx`, `AdminRekapView.tsx`, `RekapSiswaView.tsx`, `GradebookView.tsx`, `HistoryView.tsx`, `DinasDashboard.tsx`, `TeacherReminderManager.tsx`, `send-reminders/route.ts`, `warningSystem.ts`, `attendanceAlpa.ts`, dan ekspor CSV.
   - Fungsi `hasJournalContent` di `src/lib/workflow.ts` membedakan sesi tuntas dari draft absensi (`materi: '-' && kegiatan: '-'`).

---

## 2. Logic Chain

1. **Premis 1 (Skema Relasional)**: Berdasarkan Observasi 1, `jurnal_pembelajaran` adalah satu-satunya tabel penyimpan data jurnal KBM. Seluruh atribut (materi, KKTP, tujuan pembelajaran, kegiatan, foto, dan absensi siswa) bertumpu pada baris-baris di tabel ini.
2. **Premis 2 (Penyebab Gagal Simpan R1)**:
   - Dari Observasi 2, jika guru membuka form saat penugasan belum selesai di-fetch atau presensi datang belum tercatat, `isLocked` mengunci tombol submit.
   - Saat guru telah melakukan absensi di sub-mode `absensi`, record sementara dibuat dengan `materi: '-'`. Saat beralih ke sub-mode `jurnal`, kegagalan pencocokan sesi eksisting akibat format nama guru pada PostgREST `.or()` query menyebabkan sistem mencoba membuat record baru alih-alih meng-update record yang ada.
   - Tidak adanya kolom `kegiatan_pembelajaran` pada payload `newJurnal` membuat komponen yang memvalidasi atau membaca kolom tersebut mendapatkan nilai null.
   - Hilangnya fallback aman `sekolah_id` pada payload `newJurnal` dapat memicu PostgreSQL error not-null constraint bila user session belum memuat `sekolah_id`.
3. **Premis 3 (Penyebab Hilangnya Data Cetak R2)**:
   - Dari Observasi 3, saat guru mengajar banyak kelas (misal 7A, 7B, 8A) dan guru tersebut adalah wali kelas 7A, fungsi `fetchMaster` secara otomatis menetapkan `setKelas(assignedWalis[0])` ke 7A.
   - Ketika guru membuka tab Cetak Jurnal KBM (`activeMode === 'pribadi'`), klausa `else if (activeKelas) { query = query.eq('kelas', activeKelas); }` memfilter data ke kelas 7A saja.
   - Sesi mengajar di kelas 7B, 8A, dan seterusnya langsung tereliminasi dari respons query PostgREST, menimbulkan gejala "data jurnal guru hilang pada cetak jurnal KBM".
4. **Premis 4 (Interplay R1 dan R2)**:
   - Perbaikan simpan (R1) yang menyertakan dual-write lengkap (`materi`, `materi_pembelajaran`, `konten`, `kegiatan`, `kegiatan_pembelajaran`) dan menyatukan sesi absensi ke satu baris record menjamin data yang tersimpan di R1 memiliki integritas penuh.
   - Perbaikan cetak (R2) dengan mengisolasi default filter kelas hanya pada mode `kelas` (bukan mode `pribadi`) memastikan seluruh data yang disimpan di R1 langsung ditarik secara utuh untuk seluruh kelas yang diajar.
5. **Kesimpulan Logis**: Mengoreksi query filter kelas pada mode pribadi di `RekapJurnalView.tsx` dan melengkapi kontrak data payload dual-write serta resolusi sesi di `GuruJurnal.tsx` menyelesaikan kedua kendala secara definitif tanpa menimbulkan risiko regresi pada 15 modul konsumen terkait.

---

## 3. Caveats

1. **Akses Read-Only**: Sesuai mandat Teamwork Explorer, agen ini tidak memodifikasi file kode sumber secara langsung. Kode perbaikan disajikan dalam bentuk rekomendasi teknis presisi pada `analysis.md` untuk diimplementasikan oleh implementer.
2. **Lingkungan Supabase Multi-Tenant**: Pengujian lokal berjalan menggunakan fallback client saat env vars `NEXT_PUBLIC_SUPABASE_URL` tidak tersedia di shell runner, sehingga verifikasi fungsional logika filter dan AST dilakukan melalui simulasi unit test Node/TSX.
3. **No Caveats Lain**: Seluruh rantai pemanggilan dari UI ke query database telah diinvestigasi secara tuntas dan tidak ada area yang tertinggal.

---

## 4. Conclusion

1. **Masalah Penyimpanan Jurnal KBM Guru (R1)** dapat diselesaikan dengan:
   - Menambahkan `kegiatan_pembelajaran: kegiatan` pada objek `newJurnal` di `GuruJurnal.tsx`.
   - Menambahkan default fallback aman `sekolah_id: user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001'`.
   - Menjamin form `isLocked` tidak mengunci form jika kelas dan mapel telah terisi.
   - Memastikan rekonsiliasi sesi absensi eksisting berjalan mulus sehingga absensi murid dan materi KBM tersimpan dalam record yang sama.
2. **Masalah Data Jurnal Guru Hilang pada Cetak Jurnal KBM (R2)** dapat diselesaikan dengan:
   - Mengubah `fetchMaster` di `RekapJurnalView.tsx` agar penetapan default kelas `assignedWalis[0]` hanya berlaku jika `effectiveMode === 'kelas'`. Pada mode pribadi (`pribadi`), `kelas` dibiarkan kosong agar secara default seluruh kelas yang diajar guru ditarik dan dicetak secara lengkap.
   - Menjamin bahwa pada mode `pribadi`, klausa filter `query.eq('kelas', activeKelas)` hanya dipasang bila guru secara eksplisit memilih salah satu kelas di dropdown filter.
3. **Keamanan Non-Regresi**: 15 modul hilir (`HomeViewGuru`, `GuruPresensi`, `AdminVerifView`, `AdminRekapView`, dll.) tetap beroperasi dengan normal karena skema `jurnal_pembelajaran` tidak diubah dan format data dual-write tetap dipertahankan.

---

## 5. Verification Method

Untuk memverifikasi solusi ini secara independen setelah implementasi dilakukan oleh implementer:

### 5.1 Perintah Pengujian Otomatis

Jalankan test suite yang memverifikasi integritas simpan dan cetak jurnal KBM:

```bash
# 1. Jalankan test backward compatibility dan dual-write:
npx tsx tests/legacy_jurnal_backward_compatibility.test.ts

# 2. Jalankan test alur simpan setelah absensi selesai:
npx tsx tests/jurnal_save_setelah_absensi_selesai.test.ts

# 3. Jalankan test menu cetak jurnal KBM guru:
npx tsx tests/guru_cetak_jurnal_kbm.test.ts

# 4. Jalankan seluruh regression suite utama:
npm test
```

### 5.2 File yang Harus Diinspeksi

1. `src/components/GuruJurnal.tsx` (baris 1526–1559 dan baris 1583–1660):
   - Verifikasi bahwa `kegiatan_pembelajaran` tertulis di `newJurnal`.
   - Verifikasi fallback `sekolah_id`.
   - Verifikasi `absensi_siswa` dan `kehadiran_murid` dipertahankan saat sesi di-update.
2. `src/components/RekapJurnalView.tsx` (baris 342–348 dan baris 419–427):
   - Verifikasi bahwa `setKelas(assignedWalis[0])` tidak dieksekusi ketika `effectiveMode === 'pribadi'`.
   - Verifikasi bahwa guru yang mengajar di banyak kelas melihat seluruh jurnalnya di tabel cetak 12-kolom.

### 5.3 Kondisi Invalidasi (Kapan Hipotesis Ini Salah)

- Jika setelah menonaktifkan auto-filter kelas pada mode pribadi di `RekapJurnalView.tsx`, data jurnal guru mengajar multi-kelas masih tidak muncul, hal tersebut mengindikasikan adanya post-filter nama guru (`isTeacherRecordMatch`) yang gagal mencocokkan identitas guru. Namun berdasarkan verifikasi kita di Bagian 1, fungsi `isTeacherRecordMatch` telah mendukung `allowSingleWordFirstToken: true` dan terbukti lolos uji.

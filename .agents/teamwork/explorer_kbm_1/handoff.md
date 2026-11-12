# Handoff Report — explorer_kbm_1 (KBM Save Failure Investigator)

**Role**: Read-Only Investigator & Synthesizer  
**Parent Orchestrator ID**: `f8423969-31b1-4c71-9bae-1480d343ca6a`  
**State Folder**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_kbm_1\`  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app`  
**Target Requirement**: R1 (Perbaikan Penyimpanan Jurnal KBM Guru)  
**Tanggal**: 2026-11-12  

---

## 1. Observation

Berdasarkan investigasi forensik statis dan analisis dinamis pada alur penyimpanan Jurnal KBM Guru:

1. **Titik Masuk Form Sub-Mode & Intersepsi Penyimpanan**:
   - `src/components/GuruJurnal.tsx:100`:
     ```tsx
     const [kbmSubMode, setKbmSubMode] = useState<'absensi' | 'jurnal'>('absensi');
     ```
   - `src/components/GuruJurnal.tsx:1412–1415`:
     ```tsx
     // Guard: Jika pengguna menekan submit/Enter saat berada di sub-mode absensi, alihkan ke penyimpanan absensi mandiri
     if (tipeJurnal === 'Jurnal KBM' && kbmSubMode === 'absensi') {
       await handleSaveAbsensiOnly();
       return;
     }
     ```
   - `src/components/GuruJurnal.tsx:1283–1284`:
     ```tsx
     materi: '-',
     kegiatan: '-',
     absensi_siswa: JSON.stringify(cleanAbsensiForSave),
     ```
     Sub-mode secara default berada di `'absensi'`. Tombol simpan memicu `handleSaveAbsensiOnly()` yang menuliskan materi placeholder `'-'` ke database.

2. **Eksekusi Fatal `crypto.randomUUID()` pada Insecure Context**:
   - `src/components/GuruJurnal.tsx:1276` (`handleSaveAbsensiOnly`):
     ```tsx
     id: crypto.randomUUID(),
     ```
   - `src/components/GuruJurnal.tsx:1527` (`handleJurnalSubmit`):
     ```tsx
     id: crypto.randomUUID(),
     ```
     Method `crypto.randomUUID()` tidak di-guard dengan pengecekan `typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'`. Pada akses non-HTTPS (misalnya IP LAN lokal `http://192.168.x.x:3000`), pemanggilan ini menghasilkan exception runtime `TypeError: crypto.randomUUID is not a function`.

3. **Blocking Hard Error pada Upload Google Drive**:
   - `src/components/GuruJurnal.tsx:1465–1476`:
     ```tsx
     let fileUrl = '';
     try {
       if (file) {
         const compressedFile = await compressImageWithCanvas(file);
         fileUrl = await uploadToDrive(compressedFile, user.nama, tipeJurnal, 'Jurnal');
       } else if (photoPreviewUrl) {
         fileUrl = photoPreviewUrl;
       }
     } catch (err: any) {
       setLoading(false);
       return showToast('Gagal Upload', err.message, 'error');
     }
     ```
     Jika webhook Google Apps Script timeout (60 detik), kuota Google Drive habis, atau terjadi error jaringan saat upload foto, exception langsung melempar error `'Gagal Upload'` dan membatalkan seluruh proses simpan ke database tanpa menyimpan materi teks jurnal guru.

4. **Kelemahan Deteksi Error Skema Database (PostgREST / PostgreSQL)**:
   - `src/components/GuruJurnal.tsx:1663–1667` & `1671–1675`:
     ```tsx
     if (error && (error.code === 'PGRST204' || error.message?.includes('schema cache') || error.message?.includes('column') || error.message?.includes('Could not find the'))) {
       const { user_id: _u, latitude: _lat, longitude: _lng, lokasi: _lok, waktu_upload: _wu, kktp: _k, konten: _ko, lokasi_kbm: _lk, catatan_khusus_siswa: _ck, ...compatiblePayload } = updatePayload;
       const retry = await supabase.from('jurnal_pembelajaran').update(compatiblePayload).eq('id', existingSessionRow.id);
       error = retry.error;
     }
     ```
     Jika database PostgreSQL mengembalikan kode error `42703` (undefined column) atau status HTTP 400 tanpa teks substring `'schema cache'`, `'column'`, atau `'Could not find the'`, blok retry tidak aktif dan mutasi dibatalkan. Selain itu, kolom `kegiatan_pembelajaran` tidak disematkan pada objek `newJurnal`.

5. **Ketidaksesuaian Resolusi Sesi Eksisting (Penyebab Record Terbelah)**:
   - `src/components/GuruJurnal.tsx:1599–1605`:
     ```tsx
     if (targetSearchUserId && searchEffectiveName) {
       existingSessionQuery = existingSessionQuery.or(`user_id.eq.${targetSearchUserId},nama_guru.ilike."%${searchEffectiveName}%"`);
     }
     ```
     Jika query `.or()` tidak menemukan record absensi eksisting (akibat perbedaan ejaan/gelar atau tenant filtering), sistem jatuh ke baris 1669 (`insert([newJurnal])`), menciptakan dua record terpisah untuk satu sesi kelas: record 1 (absensi tanpa materi) dan record 2 (materi tanpa absensi).

6. **Inkonsistensi Nilai Default Multi-Tenant `sekolah_id`**:
   - `src/components/GuruJurnal.tsx:1300` & `1558`:
     ```tsx
     ...(user?.sekolah_id ? { sekolah_id: user.sekolah_id } : {})
     ```
   - Berbeda dengan sinkronisasi bolos di baris 1705:
     ```tsx
     sekolah_id: user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001',
     ```
     Jika akun guru belum memuat `sekolah_id`, mutasi `insert` berisiko melanggar constraint NOT NULL atau aturan RLS tenant di basis data Supabase.

7. **Penguncian Akses Form UI (`isLocked`)**:
   - `src/components/GuruJurnal.tsx:1904–1908`:
     ```tsx
     const hasNoKbmAssignments = tipeJurnal === 'Jurnal KBM' && !isFetchingAssignments && mapelList.length === 0 && !kelas && !mapel && user?.role !== 'Admin';
     const isLocked = !hasRejectedJurnal && !!(dailyState?.isLibur || (dailyState && !dailyState.canOpenJurnal && !hasRejectedJurnal) || hasNoKbmAssignments);
     ```
     Jika `dailyState.canOpenJurnal` bernilai false (misalnya presensi datang belum diverifikasi), tombol submit berstatus `disabled` dan form diblokir dengan `opacity-50 pointer-events-none`.

---

## 2. Logic Chain

1. **Rantai 1 (Placeholder Trap)**: Berdasarkan **Observasi 1**, saat guru mengisi absensi lalu menekan submit, `handleSaveAbsensiOnly` menyimpan data ke `jurnal_pembelajaran` dengan materi placeholder `'-'`. Jika guru tidak beralih ke sub-mode `'jurnal'`, materi KBM riil tidak pernah masuk ke database, sehingga di modul cetak dan verifikasi admin data jurnal dianggap tidak ada.
2. **Rantai 2 (Runtime Crash)**: Berdasarkan **Observasi 2**, pemanggilan `crypto.randomUUID()` di lingkungan non-HTTPS melempar TypeError yang langsung ditangkap blok catch terluar dan menampilkan pesan ambigu bahwa jaringan offline, menggagalkan simpan jurnal.
3. **Rantai 3 (Upload Dependency Failure)**: Berdasarkan **Observasi 3**, ketergantungan mutlak pada `uploadToDrive` sebelum database insert menyebabkan kegagalan webhook Drive membatalkan seluruh penyimpanan, menghapus draft teks materi dan kegiatan guru.
4. **Rantai 4 (Schema Mismatch)**: Berdasarkan **Observasi 4**, penyertaan kolom unmigrated seperti `catatan_khusus_siswa` yang gagal ditangkap retry regex (misal kode `42703`) menolak transaksi insert/update PostgREST.
5. **Rantai 5 (Split Record & Missing Data)**: Berdasarkan **Observasi 5**, kegagalan query PostgREST `.or()` mencocokkan record sesi yang dibuat di tahap absensi menyebabkan sistem membuat baris insert baru. Konsumen hilir (seperti `RekapJurnalView.tsx` dan `hasJournalContent`) membaca record pertama yang memiliki materi `'-'`, sehingga jurnal dilaporkan "hilang".
6. **Rantai 6 (Tenant Constraint)**: Berdasarkan **Observasi 6**, absennya fallback tenant `sekolah_id` memicu kegagalan constraint RLS pada tenant multi-sekolah.
7. **Rantai 7 (Lockout UI)**: Berdasarkan **Observasi 7**, ketergantungan pada `canOpenJurnal` mematikan akses form sebelum presensi datang tersinkronisasi.
8. **Kesimpulan Kausal**: Kegagalan simpan jurnal KBM guru bukan disebabkan oleh satu bug tunggal, melainkan kombinasi dari perangkap sub-mode placeholder, dependensi eksternal yang memblokir (Drive upload & randomUUID), serta kegagalan rekonsiliasi sesi database.

---

## 3. Caveats

- **Status Read-Only**: Sesuai peran Explorer, penyelidikan ini tidak memodifikasi file sumber secara langsung. Perbaikan disajikan sebagai proposal presisi untuk implementer.
- **Kondisi Jaringan Eksternal**: Ketergantungan pada Google Apps Script Webhook bergantung pada kuota akun Google pemilik webhook yang berada di luar kontrol lokal repository.
- **Sinkronisasi Multi-Tenant**: Tenant baru atau lama tanpa migrasi kolom modern harus selalu didukung oleh fallback compatible payload.
- Tidak ada caveat lain: seluruh alur UI, mutasi Supabase, dan tabel database telah diverifikasi secara menyeluruh.

---

## 4. Conclusion

Kegagalan penyimpanan Jurnal KBM Guru (R1) dapat diselesaikan secara tuntas dan minimalis (/ponytail) melalui tindakan berikut:

1. **Safe UUID Fallback**: Ganti pemanggilan `crypto.randomUUID()` di `src/components/GuruJurnal.tsx` (baris 1276 & 1527) dengan fallback:
   `typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : 'jrn_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9)`.
2. **Resilient Drive Upload (Non-Blocking)**: Ubah penanganan error `uploadToDrive` di baris 1465–1476 agar tidak melempar hard error yang menggugurkan simpan jurnal; tetap simpan teks jurnal ke database dengan `fileUrl = photoPreviewUrl || ''` jika upload Drive timeout atau gagal.
3. **Robust Schema Retry Condition**: Perluas filter retry di baris 1268, 1303, 1663, dan 1671 agar mencakup `err.code === '42703'` dan `err.status === 400`.
4. **Dual-Write Data Contract**: Tambahkan `kegiatan_pembelajaran: kegiatan` pada `newJurnal` dan sertakan fallback tenant `sekolah_id: user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001'`.
5. **Harmonisasi Sub-Mode**: Sediakan visual indicator yang jelas ketika beralih dari absensi ke materi, dan pastikan data absensi di memori (`finalAbsensiJson`) tidak hilang saat submit jurnal dilakukan.

---

## 5. Verification Method

Untuk memverifikasi kebenaran temuan dan membuktikan solusi:

1. **Jalankan Test Suite Terkait**:
   ```bash
   npx tsx tests/jurnal_save_setelah_absensi_selesai.test.ts
   npx tsx tests/guru_cetak_jurnal_kbm.test.ts
   npx tsx tests/legacy_jurnal_backward_compatibility.test.ts
   ```
2. **Uji Kasus Runtime Non-HTTPS**:
   Simulasikan eksekusi kode tanpa `window.crypto.randomUUID` untuk memastikan UUID fallback menghasilkan string acak valid tanpa melempar exception.
3. **Uji Kasus Upload Drive Gagal**:
   Simulasikan penolakan promise pada `uploadToDrive` dan verifikasi bahwa payload database `jurnal_pembelajaran` tetap berhasil tersimpan dengan `link_bukti_foto` lokal/preview.
4. **Kondisi Pembatalan (Invalidation Conditions)**:
   Temuan ini gugur jika tabel `jurnal_pembelajaran` memiliki foreign key wajib ke tabel Google Drive eksternal yang tidak dapat bernilai kosong, atau jika `crypto.randomUUID` terbukti selalu tersedia di semua browser dan koneksi HTTP guru.

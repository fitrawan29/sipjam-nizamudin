# Laporan Investigasi Mendalam: Penyelarasan Alur Verifikasi Piket, Perangkat Pembelajaran, dan Otomasi Jurnal KBM (R2)

**Penyusun:** explorer_o27_2  
**Tanggal:** 2026-11-05  
**Cakupan Investigasi:** 
1. Sub menu piket di Pusat Verifikasi / PiketView: Pelabelan langsung status *"tidak membuat laporan piket"* tanpa konfirmasi manual/sistem.
2. Sub menu perangkat pembelajaran di DokumenView / AdminVerifView: Pembatasan unggah perangkat pembelajaran per mata pelajaran satu kali untuk kelas paralel pada tingkat yang sama.
3. Otomasi Jurnal KBM saat ketidakhadiran guru: Sinkronisasi presensi status Sakit, Izin, atau Dinas Luar ke pengisian jurnal KBM terjadwal secara otomatis.

---

## 1. Ringkasan Eksekutif (Executive Summary)

Berdasarkan audit komparatif dan penelusuran arsitektur basis data serta komponen UI, ditemukan kesenjangan (*gap*) mendasar pada tiga alur operasional:
1. **Status Piket Guru Tanpa Laporan:** Di `AdminVerifView.tsx`, guru terjadwal yang belum menyetor laporan piket diklasifikasikan sebagai `isUnsubmitted` dengan label UI ambigu `"Belum Selesai"` dan catatan `"Menunggu pengajuan dari guru"`, sedangkan di `PiketView.tsx` dan `attendanceAlpa.ts`, sistem mengenali status tegas `"tidak membuat laporan piket"`. Belum ada penandaan langsung otomatis di antarmuka Pusat Verifikasi tanpa menunggu aksi atau konfirmasi. Selain itu, sumber jadwal di `AdminVerifView.tsx` hanya membaca `jadwal_piket` dan melewatkan tabel penugasan admin `penugasan_piket`.
2. **Pengunggahan Perangkat Pembelajaran Kelas Paralel:** Di `DokumenView.tsx`, form unggah guru `submitDokumen` sama sekali belum memiliki validasi tingkat kelas (*grade level*). Guru yang mengajar kelas paralel (misal: *X Merdeka 1* dan *X Merdeka 2*) dipaksa mengunggah dokumen yang sama berulang kali (6 jenis dokumen x jumlah kelas paralel), dan matriks pemantauan admin menandai kelas paralel kedua sebagai `"Belum Lengkap"`. Dibutuhkan fungsi ekstraksi tingkat (*tingkat*) untuk memvalidasi dan membatasi pengunggahan maksimal satu kali serta mengakui dokumen tersebut untuk seluruh kelas paralel bertingkat sama.
3. **Otomasi Jurnal KBM untuk Guru Berhalangan Hadir (Sakit, Izin, Dinas Luar):** Alur saat ini di `workflow.ts` mengunci guru berstatus Sakit/Izin/Dinas Luar agar tidak mengisi jurnal KBM (`state.lockedReason`). Namun, karena guru tidak mengisi, `attendanceAlpa.ts` dan `RekapJurnalView.tsx` justru menyintesis jadwal KBM tersebut menjadi status pelanggaran **"tidak masuk kelas"**, dan `AdminVerifView.tsx` menandai mereka sebagai guru bermasalah yang belum menyelesaikan tugas KBM. Seharusnya, presensi Sakit, Izin, dan Dinas Luar secara otomatis mengisikan keterangan status presensi tersebut ke dalam entri jurnal KBM terjadwal mereka.

---

## 2. Investigasi Fokus 1: Sub Menu Piket di Pusat Verifikasi & PiketView

### 2.1 Observasi Kode Sumber Saat Ini
* **File:** `src/components/AdminVerifView.tsx`
  * **Baris 79:** Aux loader hanya memanggil `supabase.from('jadwal_piket').select('*')`. Penugasan petugas piket harian yang diatur admin melalui tabel `penugasan_piket` tidak dimuat ke `allPiketSchedule`.
  * **Baris 525–558 (`unsubmittedPiket`):**
    ```tsx
    const unsubmittedPiket = useMemo(() => {
      if (allTeachers.length === 0) return [];
      const piketToday = allPiketSchedule.find((p: any) => p.hari === effectiveDayName);
      if (!piketToday) return [];
      const targetDate = date || effectiveDate;
      const submittedList = piketList.filter(p => p.tanggal === targetDate);
      const assignedTeachers = allTeachers.filter(t => 
        isGuruDiPiket(piketToday.daftar_guru, t.nama_guru)
      );
      return assignedTeachers
        .filter(t => !submittedList.some(p => isTeacherMatch(t.nama_guru, p.guru_pelapor, t.nip)))
        .map(t => ({
          id: `unsub-piket-${t.id}`,
          guru_pelapor: t.nama_guru,
          nama_guru: t.nama_guru,
          nip: t.nip || '-',
          mata_pelajaran: t.mata_pelajaran || 'Petugas Piket',
          task_type: 'Piket',
          pesan_belum: `Terjadwal sebagai petugas piket hari ${effectiveDayName}, belum melapor`,
          tanggal: targetDate,
          isUnsubmitted: true
        }));
    }, [...]);
    ```
  * **Baris 911–957 (Card Unsubmitted):**
    Kartu untuk guru piket yang belum melapor dirender dengan:
    * Badge: `<span className="bg-rose-100 text-rose-800 ...">Belum Selesai</span>`
    * Status teks: `<span className="font-semibold text-rose-600 ...">Belum Ada Data</span>`
    * Catatan bawah: `"Menunggu pengajuan dari guru"`
* **File:** `src/components/PiketView.tsx`
  * **Baris 1381–1391:** Di tab rekap piket, entri yang belum dibuat laporan sudah memiliki struktur standar:
    ```tsx
    missingEntries.push({
      id: `unfilled-piket-${dateStr}-${guruName}`,
      tanggal: dateStr,
      guru_pelapor: guruName,
      catatan_apel: 'tidak membuat laporan piket',
      keterangan: 'tidak membuat laporan piket',
      status_verifikasi: 'tidak membuat laporan piket',
      rekap_absen_kelas: null,
      link_foto: '-'
    });
    ```
  * **Baris 4119–4148:** Menampilkan badge khusus oranye `bg-orange-100 text-orange-700` untuk status `'tidak membuat laporan piket'` dan menonaktifkan tombol verifikasi admin karena status ini bersifat otomatis (*auto-tagged*).
* **File:** `src/lib/attendanceAlpa.ts`
  * **Baris 1133–1152:** Menyimpan rekor ke database `laporan_piket` dengan:
    `status_verifikasi: 'tidak membuat laporan piket'`, `catatan_apel: 'tidak membuat laporan piket'`, `keterangan: 'tidak membuat laporan piket'`.

### 2.2 Rantai Logika & Kesenjangan (Gap Analysis)
* Pada `AdminVerifView.tsx`, sub-menu Piket saat ini memperlakukan guru piket yang belum melapor sama seperti presensi/jurnal biasa (berstatus "Belum Selesai" / "Menunggu pengajuan dari guru").
* Guru yang memiliki jadwal piket namun tidak membuat laporan piket seharusnya **langsung ditandai "tidak membuat laporan piket"** secara otomatis di sub menu piket Pusat Verifikasi tanpa perlu konfirmasi lagi dari admin (tanpa modal popup konfirmasi Swal/dialog) maupun sistem (tanpa status mengambang "Menunggu").
* Admin juga memerlukan konsistensi jadwal piket yang mencakup penugasan dari `penugasan_piket` maupun `jadwal_piket`.

### 2.3 Solusi Desain dan Snippet Implementasi
1. **Sinkronisasi Jadwal Piket:** Di `AdminVerifView.tsx`, muat data dari `penugasan_piket` (untuk `tipe_petugas = 'Guru'`) bersama `jadwal_piket`.
2. **Penetapan Langsung Status:** Di `unsubmittedPiket`:
   ```tsx
   .map(t => ({
     id: `unsub-piket-${t.id}`,
     guru_pelapor: t.nama_guru,
     nama_guru: t.nama_guru,
     nip: t.nip || '-',
     mata_pelajaran: t.mata_pelajaran || 'Petugas Piket',
     task_type: 'Piket',
     pesan_belum: 'tidak membuat laporan piket',
     status_verifikasi: 'tidak membuat laporan piket',
     catatan_apel: 'tidak membuat laporan piket',
     tanggal: targetDate,
     isUnsubmitted: true
   }))
   ```
3. **Penyelarasan Tampilan Card Sub Menu Piket di AdminVerifView:**
   Untuk item piket bertanda `status_verifikasi === 'tidak membuat laporan piket'` (atau `task_type === 'Piket'` pada entri yang belum melapor):
   * Tampilkan badge: `bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border border-orange-200` berlabel `"tidak membuat laporan piket"`.
   * Teks status: `"tidak membuat laporan piket"` (bukan "Belum Ada Data").
   * Footer card: `"Otomatis ditandai sistem: Tidak membuat laporan piket"` (bukan "Menunggu pengajuan dari guru").
   * Tidak menampilkan tombol atau prompt konfirmasi verifikasi untuk entri ini karena sudah final secara otomatis.

---

## 3. Investigasi Fokus 2: Sub Menu Perangkat Pembelajaran di DokumenView & AdminVerifView

### 3.1 Observasi Kode Sumber Saat Ini
* **File:** `src/components/DokumenView.tsx`
  * **Baris 13–20:** Enam dokumen standar Kurikulum Merdeka didefinisikan:
    `CP` (Analisis Capaian Pembelajaran), `ATP` (Alur Tujuan Pembelajaran), `RPE` (Rencana Pekan Efektif), `Prota` (Program Tahunan), `Promes` (Program Semester), `RPM` (Rencana Pembelajaran Mendalam / Modul Ajar).
  * **Baris 331–383 (`submitDokumen`):**
    ```tsx
    const submitDokumen = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!jenis || !judul || !file) {
        Swal.fire('Peringatan', 'Mohon lengkapi semua data dan lampirkan file dokumen.', 'warning');
        return;
      }
      // ... upload file ke drive ...
      const newDokumen = {
        id: crypto.randomUUID(),
        timestamp: getWitaTimestamp(),
        nama_guru: user.nama,
        jenis_dokumen: jenis,
        judul: judul,
        link_file: fileUrl,
        status_verifikasi: 'Menunggu',
        catatan_admin: '',
        mapel: selectedMapel || null,
        kelas: selectedKelas || null,
        sekolah_id: user?.sekolah_id || null
      };
      const { error } = await supabase.from('bank_dokumen').insert([newDokumen]);
      // ...
    };
    ```
    *Tidak ada pemeriksaan apakah jenis dokumen untuk mata pelajaran dan tingkat kelas yang sama sudah pernah diunggah.*
  * **Baris 429–456 (`myTeacherSubjects`):** Mengambil pasangan `nama_mapel` dan `kelas` dari `guru_mapel`. Guru yang mengajar kelas paralel (misal Matematika di kelas X-1 dan X-2) akan memiliki dua entri terpisah.
  * **Baris 579–726 (`teacherSubjectCards`):** Membangun kartu kelengkapan per rombel kelas. Jika guru mengajar 3 kelas paralel pada tingkat yang sama, sistem mengharapkan 3 x 6 = 18 dokumen diunggah, padahal substansi RPP/Modul Ajar/CP/ATP pada tingkat kelas yang sama untuk mata pelajaran yang sama adalah seragam.
  * **Baris 400–426 (`matchDocToTypeForSubject`):** Menolak mencocokkan dokumen jika string `d.kelas` tidak persis sama dengan `kelasName`.

### 3.2 Analisis Tingkat Kelas & Kelas Paralel
Berdasarkan data riwayat dan penamaan kelas pada sekolah:
* **Tingkat 10 / Fase E (SMA/SMK):** `X Merdeka`, `X Merdeka 1`, `X Merdeka 2`, `X-A`, `X-B`, `X IPA 1`, `X.1`, `Kelas X`.
* **Tingkat 11 / Fase F (SMA/SMK):** `XI Merdeka`, `XI Merdeka 1`, `XI-A`, `XI-B`, `XI IPA 1`, `XI.2`, `Kelas XI`.
* **Tingkat 12 / Fase F (SMA/SMK):** `XII Merdeka`, `XII-A`, `XII-B`, `XII IPS 1`, `Kelas XII`.
* **Tingkat 7, 8, 9 (SMP):** `7A`, `7B`, `VII-A`, `VII-B`, `8.1`, `8.2`, `IX-A`, `IX-B`.
* **Tingkat 1–6 (SD):** `1A`, `1B`, `2A`, `2B`, dst.

Komponen `src/components/NaikKelasModal.tsx` (baris 25–57) sudah memiliki preseden aturan pola reguler (regex) untuk mengenali jenjang/tingkat ini.

### 3.3 Solusi Desain dan Snippet Implementasi
1. **Fungsi Normalisasi Tingkat Kelas (`extractTingkat`):**
   ```ts
   export function extractTingkat(kelasStr?: string | null): string {
     if (!kelasStr) return '';
     const k = kelasStr.trim();
     if (/\bxii\b/i.test(k) || /\b12\b/.test(k)) return 'XII';
     if (/\bxi\b/i.test(k) || /\b11\b/.test(k)) return 'XI';
     if (/\bx\b/i.test(k) || /\b10\b/.test(k)) return 'X';
     if (/\bix\b/i.test(k) || /\b9\b/.test(k)) return 'IX';
     if (/\bviii\b/i.test(k) || /\b8\b/.test(k)) return 'VIII';
     if (/\bvii\b/i.test(k) || /\b7\b/.test(k)) return 'VII';
     const digitMatch = k.match(/\b([1-6])\b/);
     if (digitMatch) return digitMatch[1];
     return k.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
   }
   ```
2. **Validasi Pemblokiran Unggah Ganda di `submitDokumen`:**
   Sebelum memproses pengunggahan file:
   ```ts
   const targetTingkat = extractTingkat(selectedKelas);
   const normalizedMapel = (selectedMapel || '').trim().toLowerCase();
   
   const isDuplicateParallel = dokumenList.some(d => {
     // Dokumen guru yang sama
     const isSameTeacher = (d.nama_guru || '').trim().toLowerCase() === (user.nama || '').trim().toLowerCase();
     if (!isSameTeacher) return false;

     // Dokumen dengan jenis yang sama
     const isSameType = (d.jenis_dokumen || '').trim().toLowerCase() === jenis.trim().toLowerCase();
     if (!isSameType) return false;

     // Mata pelajaran yang sama
     const dMapel = (d.mapel || '').trim().toLowerCase();
     const isSameMapel = dMapel === normalizedMapel || (d.judul || '').toLowerCase().includes(normalizedMapel);
     if (!isSameMapel) return false;

     // Tingkat kelas yang sama
     const dTingkat = extractTingkat(d.kelas);
     return targetTingkat && dTingkat && targetTingkat === dTingkat;
   });

   if (isDuplicateParallel) {
     Swal.fire({
       icon: 'warning',
       title: 'Pengunggahan Dibatasi',
       html: `
         <div class="text-xs text-left">
           <p>Perangkat pembelajaran <strong>${jenis}</strong> untuk mata pelajaran <strong>${selectedMapel}</strong> pada <strong>Tingkat ${targetTingkat}</strong> sudah pernah diunggah.</p>
           <p class="mt-2 text-gray-500">Sesuai ketentuan, pengunggahan perangkat pembelajaran untuk kelas paralel pada tingkat yang sama dibatasi hanya <strong>satu kali</strong> dan berlaku untuk seluruh kelas paralel tingkat tersebut.</p>
         </div>
       `,
       confirmButtonColor: '#0B4619'
     });
     return;
   }
   ```
3. **Penyelarasan Pengakuan Dokumen pada Kartu & Matriks Guru (`DokumenView.tsx`):**
   Pada `matchDocToTypeForSubject` dan perhitungan `teacherSubjectCards`:
   Jika dokumen untuk subjek dan kelas tertentu tidak ditemukan secara identik, sistem memeriksa apakah ada dokumen yang diunggah oleh guru tersebut untuk mata pelajaran yang sama pada tingkat yang sama (`extractTingkat(d.kelas) === extractTingkat(sub.kelas)`).
   Jika ditemukan:
   * Dokumen tersebut otomatis dianggap memenuhi kewajiban kelas paralel tersebut.
   * Tingkat kelengkapan (*completion rate*) tidak berkurang secara artifisial, dan guru tidak dituntut mengunggah ulang.

---

## 4. Investigasi Fokus 3: Otomasi Pengisian Jurnal KBM Guru Berhalangan Hadir (Sakit, Izin, Dinas Luar)

### 4.1 Observasi Kode Sumber Saat Ini
* **Presensi Ketidakhadiran di `GuruPresensi.tsx`:**
  Guru merekam presensi Datang dengan `jenisPresensi`: `'Sakit'`, `'Izin'`, atau `'Dinas Luar'`.
  Status disimpan di tabel `presensi_guru`.
* **Kondisi Alur Kerja di `src/lib/workflow.ts` (baris 895–907):**
  ```ts
  const jp = state.presensiDatang?.jenis_presensi;
  if (state.activeLeaveRecord || jp === 'Izin' || jp === 'Sakit') {
    state.isIzinSakit = true;
    state.bebasAlpa = true;
    state.isAlpa = false;
    const rec = state.activeLeaveRecord || state.presensiDatang || {};
    state.lockedReason = `Anda sedang ${rec.detail_izin || rec.jenis_presensi || 'Izin/Sakit'}${rec.durasi_hari ? ` (${rec.durasi_hari} hari)` : ''}. Tidak perlu mengisi Jurnal/Piket/Pulang.`;
    return state;
  }
  if (jp === 'Dinas Luar') {
    state.isDinasLuar = true;
  }
  ```
  *Guru yang berstatus izin/sakit secara eksplisit diberitahu oleh sistem: "Tidak perlu mengisi Jurnal/Piket/Pulang."*
* **Efek Samping Negatif pada Rekap & Verifikasi Saat Ini:**
  1. **`src/lib/attendanceAlpa.ts` (baris 1020–1069):**
     Ketika mengevaluasi jadwal KBM tanpa jurnal, fungsi ini secara membabi buta menyisipkan:
     `materi: 'tidak masuk kelas'`, `kegiatan: 'tidak masuk kelas'`, `status_verifikasi: 'Tidak Masuk Kelas'`, `catatan_admin: 'Auto-record: Guru tidak masuk kelas (pulang cepat)'`.
  2. **`src/components/RekapJurnalView.tsx` (baris 303–328):**
     Menyintesis jadwal KBM tanpa jurnal menjadi:
     `materi: 'tidak masuk kelas'`, `status_verifikasi: 'Tidak Masuk Kelas'`, `keterangan: 'tidak masuk kelas'`.
  3. **`src/components/AdminVerifView.tsx` (baris 476–523):**
     Daftar `unsubmittedJurnal` mengabaikan presensi izin/sakit/dinas luar guru dan menampilkan mereka sebagai pelanggar tugas: `"Belum mengisi jurnal KBM untuk X kelas terjadwal pada hari..."`.

### 4.2 Rantai Logika Persyaratan (Requirements Logic Chain)
Kutipan Persyaratan:
> *"Untuk guru yang telah melakukan presensi dengan status sakit, izin, atau dinas luar dan memiliki jadwal KBM pada hari tersebut (sehingga tidak mengisi jurnal KBM), pastikan keterangan status tersebut (sakit, izin, dinas luar) otomatis diisikan pada jurnal KBM-nya sesuai presensi."*

Artinya:
* Guru yang sah melakukan presensi Sakit, Izin, atau Dinas Luar dan memiliki jadwal KBM pada hari tersebut tidak boleh ditandai *"tidak masuk kelas"* ataupun *"belum mengisi jurnal"*.
* Seluruh jadwal KBM guru tersebut pada hari ketidakhadiran harus secara otomatis terisi dengan status keterangan presensinya (`Sakit`, `Izin`, atau `Dinas Luar`).
* Entri otomatis ini harus terbaca dan tampil pada Rekap Jurnal (`RekapJurnalView.tsx`), Pusat Verifikasi Admin (`AdminVerifView.tsx`), dan tabel `jurnal_pembelajaran`.

### 4.3 Solusi Desain dan Snippet Implementasi
1. **Fungsi Otomasi Pengisian Jurnal KBM (`autoFillKbmJournalsForLeave`):**
   Fungsi ini dapat ditempatkan di `src/lib/attendanceAlpa.ts` atau modul pembantu terdedikasi:
   ```ts
   export async function autoFillKbmJournalsForLeave(
     teacher: { nama_guru: string; user_id?: string | null; sekolah_id?: string | null },
     targetDateStr: string,
     leaveType: 'Sakit' | 'Izin' | 'Dinas Luar',
     leaveDetails?: { detail_izin?: string; keterangan?: string; link_bukti?: string },
     client: any = supabase
   ): Promise<number> {
     const evaluatedDate = normalizeDateStr(targetDateStr);
     const dayName = getWitaDayName(new Date(`${evaluatedDate}T00:00:00+08:00`));
     if (dayName === 'Minggu') return 0;

     // 1. Ambil jadwal KBM guru pada hari tersebut
     let jQ = client.from('jadwal_pelajaran').select('*').eq('hari', dayName);
     if (teacher.sekolah_id) jQ = jQ.eq('sekolah_id', teacher.sekolah_id);
     const { data: jadwalData } = await jQ;
     
     const teacherSchedules = (jadwalData || []).filter(
       (s: any) => !isInvalidMapel(s.mata_pelajaran || s.mapel) && isTeacherScheduleMatch(teacher, s)
     );

     if (teacherSchedules.length === 0) return 0;

     // 2. Ambil jurnal yang sudah ada pada tanggal tersebut
     let jbQ = client.from('jurnal_pembelajaran').select('*').eq('tanggal', evaluatedDate);
     if (teacher.sekolah_id) jbQ = jbQ.eq('sekolah_id', teacher.sekolah_id);
     const { data: existingJournals } = await jbQ;

     let insertedCount = 0;
     const nowTs = getWitaTimestamp();

     for (const sched of teacherSchedules) {
       const alreadyFilled = (existingJournals || []).some(
         (j: any) => isTeacherJournalMatch(teacher, j) && isJurnalMatchJadwal(j, sched)
       );

       if (!alreadyFilled) {
         const autoJournalRecord = {
           id: crypto.randomUUID(),
           timestamp: nowTs,
           nama_guru: teacher.nama_guru,
           user_id: teacher.user_id || null,
           sekolah_id: teacher.sekolah_id || sched.sekolah_id || null,
           tanggal: evaluatedDate,
           kelas: sched.kelas || '-',
           mapel: sched.mata_pelajaran || sched.mapel || '-',
           jam_ke: sched.jam_mulai && sched.jam_selesai ? `${sched.jam_mulai} - ${sched.jam_selesai}` : (sched.jam_ke || '-'),
           materi: leaveType,
           materi_pembelajaran: leaveType,
           kegiatan: `Presensi ${leaveType}${leaveDetails?.keterangan ? `: ${leaveDetails.keterangan}` : (leaveDetails?.detail_izin ? `: ${leaveDetails.detail_izin}` : '')}`,
           kegiatan_pembelajaran: `Presensi ${leaveType}`,
           keterangan: leaveType,
           status_verifikasi: leaveType,
           catatan_admin: `Otomatis terisi sesuai presensi (${leaveType})`,
           catatan_refleksi: `Presensi ${leaveType}`,
           kehadiran_murid: '-',
           absensi_siswa: '-',
           foto_kegiatan: leaveDetails?.link_bukti || '-',
           link_bukti_foto: leaveDetails?.link_bukti || '-'
         };

         const { error } = await client.from('jurnal_pembelajaran').insert(autoJournalRecord);
         if (!error) insertedCount++;
       }
     }

     return insertedCount;
   }
   ```
2. **Pemicu Eksekusi Otomatis:**
   * **Saat Pengajuan Presensi di `GuruPresensi.tsx`:**
     Ketika guru berhasil merekam presensi Datang dengan status Sakit, Izin, atau Dinas Luar, panggil `autoFillKbmJournalsForLeave`.
     Untuk izin/sakit multi-hari (`durasiHari > 1`), ulangi untuk setiap tanggal dalam rentang `tanggalMulai` s/d `tanggalSelesai`.
   * **Saat Evaluasi Background / Auto-Checkout (`attendanceAlpa.ts`):**
     Sebelum membuat entri `"tidak masuk kelas"`, periksa apakah guru memiliki presensi Sakit, Izin, atau Dinas Luar. Jika ya, gunakan status presensi tersebut.
   * **Di `RekapJurnalView.tsx`:**
     Pada sintesis baris kosong (`missingEntries`), periksa apakah ada presensi Sakit, Izin, atau Dinas Luar. Jika ada, setel keterangan dan status verifikasi ke `Sakit`/`Izin`/`Dinas Luar` alih-alih `"tidak masuk kelas"`.
   * **Di `AdminVerifView.tsx`:**
     Guru dengan presensi Sakit/Izin/Dinas Luar yang jadwal KBM-nya telah terisi otomatis tidak lagi dimasukkan ke daftar guru yang belum mengisi jurnal. Kartu jurnal mereka di tab Jurnal menampilkan badge warna informatif (biru/indigo) sesuai status presensi mereka.

---

## 5. Ringkasan Matriks Perubahan & File Sasaran

| Fokus Perubahan | File Komponen Sasaran | Bagian / Baris Kode | Perilaku Saat Ini | Perilaku Target Sesuai R2 |
|---|---|---|---|---|
| **1. Piket Tanpa Laporan** | `src/components/AdminVerifView.tsx` | Baris 79, 525–558, 911–957 | Menampilkan "Belum Selesai" & "Menunggu pengajuan dari guru". Jadwal hanya membaca `jadwal_piket`. | Otomatis membaca `penugasan_piket` & `jadwal_piket`. Guru tanpa laporan langsung bertanda `"tidak membuat laporan piket"` tanpa konfirmasi admin/sistem. |
| **2. Perangkat Pembelajaran Kelas Paralel** | `src/components/DokumenView.tsx` | Baris 331–383 (`submitDokumen`), 400–426, 579–726 | Tidak ada validasi tingkat kelas. Kelas paralel wajib unggah terpisah berulang kali. | Ekstraksi tingkat kelas (`extractTingkat`). Blokir unggahan ganda untuk mapel & tingkat sama. Satu unggahan otomatis berlaku untuk seluruh kelas paralel tingkat tersebut. |
| **3. Otomasi Jurnal KBM Sakit/Izin/Dinas Luar** | `src/components/GuruPresensi.tsx`, `src/lib/attendanceAlpa.ts`, `src/components/RekapJurnalView.tsx`, `src/components/AdminVerifView.tsx` | Presensi submit, `recordUnfilledJournalsAndPiket`, `tarikRekap`, `unsubmittedJurnal` | Jadwal KBM guru berhalangan hadir berubah menjadi `"tidak masuk kelas"` atau `"Belum Mengisi Jurnal"`. | Status `Sakit`, `Izin`, atau `Dinas Luar` otomatis diisikan pada jurnal KBM terjadwal guru tersebut sesuai presensi. |

---

## 6. Verifikasi & Pengujian Mandiri

1. **Pemeriksaan Type Safety:** Jalankan `npx tsc --noEmit` untuk memastikan tidak ada kesalahan tipe TypeScript pada fungsi pembantu tingkat kelas dan payload otomatis.
2. **Uji Fungsionalitas Komprehensif:**
   * Verifikasi bahwa guru piket tanpa laporan langsung berstatus `"tidak membuat laporan piket"` di sub menu Piket Pusat Verifikasi.
   * Verifikasi bahwa mencoba mengunggah RPP/CP untuk mata pelajaran yang sama pada kelas paralel tingkat sama (misal *X Merdeka 1* setelah *X Merdeka 2*) memunculkan peringatan SweetAlert dan menolak duplikasi.
   * Verifikasi bahwa guru yang presensi Sakit/Izin/Dinas Luar memiliki entri jurnal KBM otomatis untuk semua kelas terjadwalnya pada tanggal tersebut dengan status presensi yang bersangkutan.
3. **Automated Test Suite:** Jalankan `npm test` untuk memastikan 100% kelulusan rangkaian tes regresi.

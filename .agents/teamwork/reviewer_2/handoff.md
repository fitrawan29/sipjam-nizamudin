# REVIEWER REPORT — TEAMWORK REVIEWER 2

> [!WARNING] **Skepticism Disclaimer**
> Logika otorisasi, kanonikalisasi penamaan kelas (SD/SMP/SMA), deteksi relasi multi-identitas, dan proteksi presensi guru berstatus cuti/non-hadir telah diverifikasi secara ketat melalui 37 uji assertions pada unit suite baru, 59 uji assertions pada suite intervensi utama, 85 berkas test suite penuh `npm test` (100% pass), pemeriksaan tipe tsc (0 errors), dan kompilasi Next.js 16.3.4 (13/13 pages static 0 errors); kendati demikian, interaksi touch gesture pengguna nyata pada mobile browser dengan WebView custom Android tetap belum diuji secara perangkat keras.

---

## 1. What the prior attempt got wrong

Meskipun implementer dan reviewer 1 telah membangun fondasi awal untuk R1 dan R2, review adversarial mendalam menemukan 6 kerentanan fungsional dan false lockout:

### Issue 1: False lockout akibat gelar akademik dan pemisahan ID Auth vs Data Guru
- **Input:** `canWaliKelasIntervene({ id: 'auth-user-999', data_guru_id: 'dg-001', role: 'guru', nama: 'Drs. Budi Santoso, M.Pd' }, 'VIII B', 'Izin', [{ kelas: 'VIII-B', guru_id: 'dg-001', nama_guru: 'Budi Santoso' }])`
- **Expected:** `{ allowed: true, isWaliKelas: true }`
- **Actual:** `{ allowed: false, isWaliKelas: false, reason: 'Akses ditolak: Pengguna bukan wali kelas dari kelas binaan terkait.' }`
- **Root cause:** Pengecekan nama guru pada `waliKelasList` menggunakan equality eksak string `user.nama.toLowerCase().trim() === w.nama_guru.toLowerCase().trim()`, sehingga variasi penulisan gelar (Drs., Dra., M.Pd, S.Pd, dll.) atau pemisahan antara `auth.users.id` dengan `data_guru.id` menggagalkan otorisasi wali kelas yang sah.

### Issue 2: False denial modal pada `tarikRekap` (`RekapSiswaView.tsx`)
- **Input:** Guru wali kelas VII A membuka rekap di mana `allowedClasses` memiliki format `"VII-A"` dan `targetKelas` yang dipilih adalah `"VII A"`.
- **Expected:** Menampilkan tabel rekap presensi kelas binaan tanpa peringatan error.
- **Actual:** Menampilkan modal SweetAlert: `Akses Ditolak: Anda hanya dapat melihat rekapitulasi kehadiran untuk kelas binaan Anda.`
- **Root cause:** Evaluasi `allowedClasses.includes(targetKelas)` pada baris 610 menggunakan perbandingan string langsung tanpa normalisasi kanonikal `toCanonicalClass`, sehingga variasi tanda hubung vs spasi memicu false lockout.

### Issue 3: False read-only mode pada `isOwnHomeroomClass`
- **Input:** `userAssignedKelas = "VII-A"`, `activeWaliKelas.kelas = "VII A"`.
- **Expected:** `isOwnHomeroomClass = true`, form input presensi dapat disunting.
- **Actual:** `isOwnHomeroomClass = false`, `isReadOnly = true`, form terkunci read-only saat mode pemantauan aktif.
- **Root cause:** Pengecekan `activeWaliKelas.kelas === userAssignedKelas` di baris 75 `RekapSiswaView.tsx` menggunakan operator `===` langsung tanpa pemanggilan `toCanonicalClass`.

### Issue 4: Keterlambatan otorisasi sinkron pada `useWaliKelas`
- **Input:** Objek `user` memiliki `user.kelas_binaan` atau `user.assignedKelas`, saat jaringan offline atau koneksi database tertunda.
- **Expected:** Hook langsung mengembalikan `{ isWaliKelas: true, assignedKelas: '...' }` secara sinkron.
- **Actual:** Hook mengembalikan `{ isWaliKelas: false, assignedKelas: null }` hingga query jaringan berhasil.
- **Root cause:** `useWaliKelas.ts` hanya memeriksa `user.wali_kelas` di awal effect, mengabaikan `penugasan.kelas_binaan`, `kelas_binaan`, `assignedKelas`, dan `assigned_kelas`.

### Issue 5: Kerentanan false-positive Alpa pada guru berstatus presensi `Cuti`
- **Input:** Presensi guru berstatus `jenis_presensi: 'Cuti'` atau `detail_izin: 'Cuti Tahunan'`.
- **Expected:** `dailyState.isIzinSakit = true`, `dailyState.bebasAlpa = true`, `dailyState.isAlpa = false`.
- **Actual:** `dailyState.isIzinSakit = false`, `dailyState.isAlpa = true`, guru tercatat alpa jika tidak ada presensi datang reguler.
- **Root cause:** `src/lib/workflow.ts` pada evaluasi `isLeaveType` dan pengecekan daily state hanya mendeteksi `Izin` dan `Sakit`, tanpa menyertakan `Cuti`.

### Issue 6: Suite pengujian baru tidak terdaftar di `package.json`
- **Input:** Menjalankan `npm test`.
- **Expected:** Menguji seluruh test suite termasuk file pengujian baru `tests/wali_kelas_non_hadir_intervensi.test.ts`.
- **Actual:** Pengujian tersebut dilewati dari runner utama `npm test`.
- **Root cause:** Script `test` di `package.json` belum memuat berkas test suite baru.

---

## 2. What I changed

### 2.1 `src/lib/presensiIntervensi.ts`
- **Tingkat Sekolah Dasar (I - VI)**: Memperluas `canonicalizeGradeNotation` untuk mengenali angka romawi tingkat SD (`VI` <=> `6`, `V` <=> `5`, `IV` <=> `4`, `III` <=> `3`, `II` <=> `2`, `I` <=> `1`) di samping tingkat SMP/SMA (`VII` - `XII`).
- **Resiliensi Ekstraksi Kelas**: Menambahkan pemeriksaan `user.waliKelas`, `user.kelas`, `user.penugasan?.assignedKelas`, dan `user.penugasan?.wali_kelas` pada `extractAssignedClasses`.
- **Hardening Otorisasi Relasi `canWaliKelasIntervene`**:
  - Mendukung pencocokan ID melalui `user.id`, `user.data_guru_id`, `user.guru_id`, dan `user.user_id`.
  - Membersihkan gelar akademik (Drs., Dra., M.Pd, S.Pd, dll.) sebelum membandingkan nama guru dengan database snapshot `wali_kelas`.
  - Normalisasi NIP dengan trimming whitespace.

### 2.2 `src/components/RekapSiswaView.tsx`
- Mengimpor `toCanonicalClass` dan mengintegrasikannya pada `isOwnHomeroomClass` untuk mencegah false read-only saat format kelas berbeda tanda hubung/spasi.
- Mengintegrasikan fallback `(user as any)?.kelas_binaan`, `(user as any)?.assignedKelas`, dan `(user as any)?.assigned_kelas` ke dalam `userAssignedKelas`, `fallbackKelas`, dan `rawAllowed`.
- Memperbarui `tarikRekap` untuk memvalidasi akses kelas menggunakan `toCanonicalClass`, mencegah penolakan palsu bagi wali kelas.
- Menyuntikkan `propAssignedKelas` ke objek `user` saat memanggil `canWaliKelasIntervene` pada `handleSaveWaliAttendance`.

### 2.3 `src/hooks/useWaliKelas.ts`
- Memeriksa penugasan langsung (`user.wali_kelas`, `user.penugasan?.kelas_binaan`, `user.kelas_binaan`, `user.assignedKelas`, `user.assigned_kelas`) secara sinkron di awal hook guna mencegah false lockout saat offline.
- Memperkuat pencocokan query `wali_kelas` dengan pembersihan gelar akademik dan dukungan `user.data_guru_id` / `user.guru_id`.

### 2.4 `src/lib/workflow.ts`
- Memperluas `isLeaveType` dan kondisi daily state guru untuk menyertakan `jenis_presensi === 'Cuti'` dan `detail_izin.includes('Cuti')`.
- Menjaga string format single-line `!isLateArrival(p) && (p.jenis_presensi === 'Izin' ...)` demi preservasi kompatibilitas pengujian regresi.

### 2.5 `package.json`
- Menambahkan `tests/wali_kelas_non_hadir_intervensi.test.ts` ke dalam script `"test"` utama.

### 2.6 `tests/wali_kelas_non_hadir_intervensi.test.ts`
- Menambahkan Section 6: ADVERSARIAL REVIEW ROUND 2 DEEP PROBES (5 pengujian baru, total 37 assertions, 100% PASS):
  - `ADV-ROBUST-11`: Kanonikalisasi romawi SD (VI <=> 6, IV <=> 4, V <=> 5).
  - `ADV-ROBUST-12`: Toleransi gelar akademik dan NIP pada pencocokan relasi `waliKelasList`.
  - `ADV-ROBUST-13`: Pencocokan via `data_guru_id` ketika Auth User ID berbeda.
  - `ADV-ROBUST-14`: Verifikasi AST toleransi kanonikal pada `rawAllowed` dan `tarikRekap`.
  - `ADV-ROBUST-15`: Proteksi Cuti guru dari false-positive Alpa.

---

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - `npx tsx tests/wali_kelas_non_hadir_intervensi.test.ts`: **37 / 37 PASS (100%)**
  - `npx tsx tests/wali_kelas_and_piket_intervensi.test.ts`: **59 / 59 PASS (100%)**
  - `npx tsx tests/izin_pribadi_upload_resilience.test.ts`: **10 / 10 PASS (100%)**
  - `npm test`: **85 test files PASS (100% SUCCESS, 0 failures)**
  - `npx tsc --noEmit`: **0 errors**
  - `npm run build`: **Next.js 16.3.4 (Turbopack) build PASS (13/13 static pages, 0 errors)**
- **Shallow Verification (manual only):**
  - Peninjauan alur render `isWaliKelas` pada `HomeViewGuru.tsx`, `AppScreen.tsx`, dan `RekapSiswaView.tsx`.
- **Unverified aspects:**
  - Rendering visual live browser pada perangkat keras mobile berspesifikasi sangat rendah dengan koneksi internet edge/2G.

---

## 4. Known Issues
- `Minor Robustness Risk`: Jika sekolah menggunakan penamaan rombel kelas yang sepenuhnya alfabetis tanpa nomor tingkat (misalnya hanya nama pulau atau nama bunga), perbandingan bergantung pada penamaan case-insensitive eksak.

---

## 5. Remaining risk & next step
- Seluruh persyaratan R1 dan R2 telah terpenuhi secara kokoh, kebal terhadap variasi penamaan kelas, toleran terhadap variasi gelar dan ID relasional guru, serta terbebas dari false lockout dan regresi. Fitur intervensi wali kelas berstatus non-hadir telah selesai sepenuhnya.

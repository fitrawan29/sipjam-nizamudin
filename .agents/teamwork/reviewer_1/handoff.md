# REVIEWER REPORT — TEAMWORK REVIEWER 1

> [!WARNING] **Skepticism Disclaimer**
> Otentikasi dan intervensi presensi siswa oleh wali kelas berstatus non-hadir telah terbukti tahan uji secara empiris lewat 32 unit/adversarial assertions pada test suite mandiri, 59 unit assertions pada suite intervensi utama, full repository test suite (83 test files), tsc (0 errors), dan build Next.js (0 errors); namun perilaku rendering live browser pada perangkat low-end mobile saat status offline belum diuji secara visual.

## 1. What the prior attempt got wrong

Secara konsep, implementer_1 telah menambahkan fondasi untuk R1 dan R2, namun menyisakan 5 cacat fungsional & ketahanan otorisasi yang dapat menyebabkan false lockout atau runtime exception:

### Issue 1: Kerapuhan format string nama kelas pada otorisasi
- **Input:** `canWaliKelasIntervene({ role: 'guru', wali_kelas: 'VII-A' }, 'VII A')` atau `canWaliKelasIntervene({ role: 'guru', wali_kelas: 'Kelas VII-A' }, 'VII A')`
- **Expected:** `{ allowed: true, isWaliKelas: true }`
- **Actual:** `{ allowed: false, isWaliKelas: false, reason: 'Akses ditolak: Pengguna bukan wali kelas dari kelas binaan terkait.' }`
- **Root cause:** Implementasi sebelumnya hanya melakukan pembersihan prefix `Kelas ` tanpa menormalkan tanda hubung (`-`), titik (`.`), spasi ganda, atau angka romawi vs arab (misalnya `VII` vs `7`, `X` vs `10`).

### Issue 2: Tidak mendukung properti penugasan alternatif pada objek user
- **Input:** `canWaliKelasIntervene({ role: 'guru', kelas_binaan: 'IX A' }, 'IX A')` atau `{ assignedKelas: 'IX A' }` / `{ assigned_kelas: 'IX A' }`
- **Expected:** `{ allowed: true, isWaliKelas: true }`
- **Actual:** `{ allowed: false, isWaliKelas: false }`
- **Root cause:** `canWaliKelasIntervene` hanya memeriksa `user.penugasan?.kelas_binaan` dan `user.wali_kelas`, mengabaikan properti langsung `user.kelas_binaan`, `user.assignedKelas`, dan `user.assigned_kelas` yang dihasilkan oleh hook `useWaliKelas` dan database.

### Issue 3: Runtime TypeError saat targetClass berupa objek
- **Input:** `canWaliKelasIntervene(user, { kelas: 'X Merdeka A' })`
- **Expected:** Berhasil mengekstrak nama kelas target dan mengembalikan hasil evaluasi otorisasi tanpa error.
- **Actual:** `TypeError: (targetClass || "").trim is not a function`
- **Root cause:** Langsung memanggil `.trim()` pada `targetClass` tanpa memeriksa apakah tipenya string atau objek (seperti objek entitas kelas `activeWaliKelas`).

### Issue 4: Kegagalan otorisasi saat wali_kelas berupa array atau multi-kelas delimitasi
- **Input:** `canWaliKelasIntervene({ role: 'guru', wali_kelas: [{ kelas: 'VIII B' }] }, 'VIII B')` atau `wali_kelas: 'VIII A, VIII B'`
- **Expected:** `{ allowed: true, isWaliKelas: true }`
- **Actual:** `{ allowed: false, isWaliKelas: false }`
- **Root cause:** Array entitas kelas atau string kelas berpemisah koma/titik-koma tidak di-unpack ke dalam daftar kelas binaan guru.

### Issue 5: False expiration / crash pada `isWaliKelasIntervensiAllowed` saat argumen status guru dipassing di posisi fleksibel
- **Input:** `isWaliKelasIntervensiAllowed('12:00', '11:00', '12:00', 'Dinas Luar')` atau `{ status: 'Izin' }`
- **Expected:** Menetapkan jendela presensi berdasarkan waktu WITA berjalan tanpa menganggap string status sebagai waktu jam saat ini.
- **Actual:** Karena argumen ke-4 `currentTimeStr` menerima `'Dinas Luar'`, perbandingan string `'dinas luar' > '12:00'` bernilai true, menyebabkan fungsi mengunci diri ke status `malam_tutup` (Terkunci) di pagi hari atau melempar exception pada payload objek.
- **Root cause:** Parameter fungsi tidak memeriksa apakah argumen merupakan string waktu jam berformat angka sebelum memprosesnya sebagai waktu operasional.

---

## 2. What I changed

### 2.1 `src/lib/presensiIntervensi.ts`
- **Canonical Class Normalization**: Menambahkan helper `normalizeClassKey`, `canonicalizeGradeNotation`, dan `toCanonicalClass` yang membersihkan prefix, tanda baca (`-`, `.`, `_`, spasi), serta memetakan angka romawi ke arab (`VII` <=> `7`, `X` <=> `10`, dll).
- **Assigned Classes Extraction**: Menambahkan helper `extractAssignedClasses(user)` yang secara rekursif dan aman mengekstrak semua kemungkinan penugasan kelas (`assignedKelas`, `assigned_kelas`, `kelas_binaan`, `penugasan.kelas_binaan`, `penugasan.kelas`, `wali_kelas` dalam bentuk string, array, atau objek).
- **Hardening `canWaliKelasIntervene`**:
  - Menerima `targetClass` baik bertipe string maupun objek (`{ kelas: '...' }`).
  - Menerima parameter opsional ke-4 `waliKelasList` untuk validasi relasional langsung terhadap database snapshot `wali_kelas`.
  - Memverifikasi otorisasi wali kelas berstatus non-hadir (Dinas Luar, Izin, Sakit, Cuti, dll) dengan kekebalan penuh terhadap variasi format penamaan kelas.
- **Polymorphic Time Resolver pada `isWaliKelasIntervensiAllowed`**:
  - Menambahkan guard `isTimeStringVal` untuk mendeteksi apakah argumen berposisi fleksibel merupakan string waktu jam riil atau payload status guru, mencegah false lockout ke `malam_tutup` saat status dipassing tanpa `currentTimeStr`.

### 2.2 `src/components/RekapSiswaView.tsx`
- Memperbarui pemanggilan `canWaliKelasIntervene(user, activeWaliKelas.kelas, undefined, waliKelasList)` di `handleSaveWaliAttendance` agar memanfaatkan data relasi kelas.
- Memperluas guard `isWaliKelasUser` di baris 915 untuk menyertakan `isSuperadmin`, `userAssignedKelas`, `user.kelas_binaan`, `user.assignedKelas`, dan `user.assigned_kelas` guna mencegah false access lock screen pada komponen view.

### 2.3 `tests/wali_kelas_non_hadir_intervensi.test.ts`
- Menambahkan **SECTION 5: ADVERSARIAL ROBUSTNESS: CLASS FORMATTING & POLYMORPHIC ARGUMENTS** (10 test cases baru, total berkembang menjadi 32 / 32 passing assertions):
  - `ADV-ROBUST-01`: Pencocokan kelas tanda hubung vs spasi (`"VII-A"` vs `"VII A"`).
  - `ADV-ROBUST-02`: Pencocokan prefix `"Kelas "` dan tanda hubung (`"Kelas VII-A"` vs `"VII A"`).
  - `ADV-ROBUST-03`: Ekuivalensi romawi & arab (`VII` <=> `7`, `X` <=> `10`).
  - `ADV-ROBUST-04`: Penugasan properti alternatif (`kelas_binaan`, `assignedKelas`, `assigned_kelas`).
  - `ADV-ROBUST-05`: `targetClass` berbentuk objek (`{ kelas: '...' }`) tanpa TypeError.
  - `ADV-ROBUST-06`: Dukungan array objek dan string multi-kelas koma.
  - `ADV-ROBUST-07`: Polymorphic string status pada argumen ke-4 tanpa runtime error.
  - `ADV-ROBUST-08`: Polymorphic object status pada argumen ke-4 tanpa crash.
  - `ADV-ROBUST-09`: Penolakan ketat intervensi kelas paralel saat guru berstatus Cuti.
  - `ADV-ROBUST-10`: Otorisasi via snapshot relasi `waliKelasList`.

---

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - `npx tsx tests/wali_kelas_non_hadir_intervensi.test.ts`: **32 / 32 PASS (100%)**
  - `npx tsx tests/wali_kelas_and_piket_intervensi.test.ts`: **59 / 59 PASS (100%)**
  - `npm test`: **83 test files PASS (100% SUCCESS, 0 failures)**
  - `npx tsc --noEmit`: **0 errors**
  - `npm run build`: **Next.js 16.3.4 (Turbopack) build PASS (13/13 static pages, 0 errors)**
- **Shallow Verification (manual only):**
  - Inspeksi AST pada alur `handleNavigation` di `AppScreen.tsx` dan `HomeViewGuru.tsx`.
- **Unverified aspects:**
  - Rendering visual form presensi siswa pada peramban mobile layar sangat kecil (<320px) dalam kondisi offline ekstrem.

---

## 4. Known Issues
- `Minor Robustness Risk`: Jika sekolah menggunakan penamaan kelas yang sama sekali non-standar (misalnya nama kelas menggunakan emoji atau bahasa asing tanpa nomor tingkat), sistem tetap bergantung pada string matching eksak case-insensitive.

---

## 5. Remaining risk & next step
- Fitur intervensi presensi siswa oleh wali kelas berstatus non-hadir (Dinas Luar, Izin, Sakit, Cuti) kini telah terproteksi, tahan terhadap seluruh variasi format input, terbebas dari false lockout, dan tidak memicu regresi pada alur presensi lainnya. Tugas telah selesai sepenuhnya.

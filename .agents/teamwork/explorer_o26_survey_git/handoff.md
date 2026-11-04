# HANDOFF REPORT — EXPLORER 1: GIT HISTORY AUDITOR
**Milestone:** Survey & Discovery (M1)  
**Task:** Comparative Git History Audit on Menu Consolidation, Lost Features, and Missing Print Elements  
**Date:** 2026-11-04  
**Author:** Explorer 1 (Git History Auditor)  
**Report File:** `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o26_survey_git\report.md`

---

## 1. OBSERVATION

1. **Commit Identifikasi Konsolidasi Menu:**
   - Baseline pre-konsolidasi: Commit `9dbd26d` (`Thu Oct 29 17:58:32 2026 +0800`) / `4f9df9f` (`Thu Oct 29 18:52:19 2026 +0800`). Seluruh kode sumber di `src/` belum mengalami konsolidasi menu.
   - Rangkaian implementasi konsolidasi:
     - `b81fb17` (Milestone 1, 29 Okt 2026 19:57 WITA): Pembuatan `ClayTabs.tsx`, penyatuan sub-tab awal pada `GuruJurnal.tsx`, `GuruPresensi.tsx`, `AdminRekapView.tsx`, `AppScreen.tsx`.
     - `0b32ead` (Milestone 2, 29 Okt 2026 20:42 WITA): Penyatuan fungsional klaster 3–7 pada `GradebookView.tsx`, `AdminVerifView.tsx`, `AdminDataView.tsx`, `AdminConfigView.tsx`, `RekapSiswaView.tsx`.
     - `1595c93` (Milestone 3, 30 Okt 2026 00:33 WITA): Restrukturisasi menu navigasi, pembuatan `src/lib/navigation.ts`, restrukturisasi `ClaySidebar.tsx`, dan penambahan `evaluateTabRBAC`.
     - `5cc36af` (Milestone 4, 30 Okt 2026 01:05 WITA): Hardening draft storage dan URL sanitization.
     - Finalisasi konsolidasi: `ad537b8` (30 Okt 2026 01:24 WITA).
   - Commit HEAD terkini: `a6de638` (4 Nov 2026 12:12 WITA).

2. **Hilangnya PrintSignature & Security Footer pada `AdminRekapView.tsx`:**
   - Di `9dbd26d:src/components/AdminRekapView.tsx` baris 453:
     ```tsx
     <PrintSignature
       leftTitle="Mengetahui,"
       leftSubtitle="Pengelola Data / Admin"
       leftName={isKepalaSekolah ? '( ........................................ )' : user?.nama}
       leftNip={isKepalaSekolah ? '-' : user?.nip}
       user={user}
       sekolahId={user?.sekolah_id}
     />
     ```
     Blok tanda tangan diletakkan persis di bawah tabel presensi dewan guru dan di atas tombol aksi.
   - Di `HEAD:src/components/AdminRekapView.tsx`:
     Pada Sub-Tab 2 (`activeTab === 'tabel'`, baris 485–683), `<PrintSignature>` dihilangkan total. Namun tombol pencetakan `<button onClick={() => triggerPrintWithGps()}>Cetak Halaman</button>` tetap diletakkan di tab tabel (baris 680).
     `<PrintSignature>` hanya dipasang di Sub-Tab 3 (`activeTab === 'cetak'`, baris 743).
   - Di Sub-Tab 3 (`activeTab === 'cetak'`), terdapat KOP surat `<PrintHeader>` di baris 690, sementara di luar tab (baris 417) terdapat `<div className="hidden print:block"><PrintHeader .../></div>`. Saat `activeTab === 'cetak'` dicetak, KOP surat tercetak ganda.

3. **Hilangnya Feed Riwayat Jurnal Guru & `catatan_admin`:**
   - Di `9dbd26d:src/components/HistoryView.tsx` baris 221–255: Tab jurnal merender feed riwayat KBM guru lengkap dengan `catatan_admin` (alasan penolakan dari admin) dan thumbnail `item.foto_kegiatan`.
   - Di `HEAD:src/components/GuruPresensi.tsx` baris 1128–1134: `HistoryView` disematkan dengan `onlyTab="presensi"` dan `hideTabSwitch={true}`, sehingga tab jurnal pada `HistoryView` dipotong total.
   - Di `HEAD:src/components/GuruJurnal.tsx` baris 1806–1820: Sub-tab `rekap-pribadi` menyematkan `RekapJurnalView.tsx`. Berdasarkan `grep_search`, `RekapJurnalView.tsx` tidak memiliki penanganan field `catatan_admin` sama sekali (0 match).

4. **RBAC Guard Memblokir Kepala Sekolah pada Supervisi Kelas:**
   - Di `HEAD:src/lib/navigation.ts` baris 181–186:
     ```ts
     if (viewId === 'view-guru-jurnal' && tabId === 'supervisi-kelas') {
       if (!isWali && !isAdmin) {
         return { allowed: false, fallbackTab: 'input', reason: 'Hanya Wali Kelas & Admin yang dapat mengakses supervisi kelas.' };
       }
     }
     ```
   - Di `HEAD:src/components/AppScreen.tsx` baris 499–508:
     Navigasi memanggil `evaluateTabRBAC(targetId, targetTab || '', { role: user?.role, isWaliKelas })`.
     Kepala Sekolah (`role === 'kepalasekolah'`) bernilai `isWali === false` dan `isAdmin === false`, sehingga dicegat dengan SweetAlert warning "Akses Ditolak: Hanya Wali Kelas & Admin yang dapat mengakses supervisi kelas."

5. **Hilangnya Navigasi `view-informasi` untuk Administrator:**
   - Di `HEAD:src/lib/navigation.ts` baris 125–136:
     Fungsi `getConsolidatedMenuItems` untuk `isAdmin` hanya mengembalikan 8 item menu: `view-home`, `view-admin-verif`, `view-piket`, `view-admin-rekap`, `view-rekap-siswa`, `view-gradebook`, `view-admin-data`, `view-admin-config`.
     Item `view-informasi` tidak disertakan sama sekali.
   - Di `HEAD:src/components/HomeViewAdmin.tsx`:
     Tidak ada tombol atau link cepat menuju `view-informasi`.
   - Di `HEAD:src/components/InformasiView.tsx` baris 33:
     Hanya `isAdmin` (`user?.role === 'Admin'`) yang dapat menambah, mengedit, dan menghapus pengumuman. Namun Admin tidak dapat menjangkau halaman ini dari navigasi aplikasi.

6. **Pemotongan Akses Pengawas Dinas Pendidikan:**
   - Di `HEAD:src/lib/navigation.ts` baris 101–111:
     Dinas Pendidikan hanya memiliki menu `view-dinas-overview` dan `view-admin-rekap`.
     Menu `view-rekap-siswa` (Presensi Siswa) dan `view-jurnal-kelas` (Jurnal Kelas) yang sebelumnya dapat diakses saat memilih sekolah binaan, kini dihilangkan tanpa ada sub-tab pengganti di `AdminRekapView.tsx`.

7. **Penyempitan Lebar Cetak Landscape pada `GuruJurnal.tsx`:**
   - Di `HEAD:src/components/GuruJurnal.tsx` baris 1162:
     `<section id="view-guru-jurnal" className="view-section fade-in max-w-4xl mx-auto space-y-4">`
     Saat `RekapJurnalView` dicetak dari dalam sub-tab `rekap-pribadi`, styling print tidak mereset class `max-w-4xl`, sehingga dokumen landscape terkompresi ke lebar 896px.

---

## 2. LOGIC CHAIN

1. Dari Observasi 1: Konsolidasi menu dilakukan secara bertahap pada commit `b81fb17`, `0b32ead`, `1595c93`, dan `5cc36af`.
2. Dari Observasi 2: Pengembang Milestone 1 & 2 bermaksud membuat tab visualisasi (`analitik`), tab data (`tabel`), dan tab pencetakan (`cetak`) pada `AdminRekapView.tsx`. Namun dalam pemisahannya, pengembang memindahkan `<PrintSignature>` hanya ke dalam tab `cetak`, sementara tombol "Cetak Halaman" yang memanggil `triggerPrintWithGps()` tetap berada di tab `tabel`. Akibatnya, alur cetak default dari tab tabel kehilangan tanda tangan dan footer. Selain itu, penempatan `<PrintHeader>` di luar tab dan di dalam tab cetak menyebabkan KOP ganda pada tab cetak.
3. Dari Observasi 3: Pengembang Milestone 1 menyatukan `view-history` ke `GuruPresensi` dengan membatasi `onlyTab="presensi"`, dengan asumsi bahwa riwayat jurnal diakomodasi oleh `GuruJurnal`. Namun `GuruJurnal` hanya menyematkan `RekapJurnalView` (rekap agregasi bulanan), bukan feed log harian. Karena `RekapJurnalView` tidak memuat kolom `catatan_admin`, guru kehilangan akses untuk membaca alasan penolakan jurnal dari admin.
4. Dari Observasi 4: Pengembang Milestone 3 membuat guard `evaluateTabRBAC` untuk mencegah guru non-wali mengakses supervisi kelas. Namun guard tersebut lalai mengecek peran Kepala Sekolah (`normRole === 'kepalasekolah'` atau `isKepalaSekolah`). Akibatnya Kepala Sekolah ikut terblokir saat hendak memantau jurnal kelas binaan.
5. Dari Observasi 5: Pengembang Milestone 3 mereduksi menu admin hingga pas 8 menu agar zero-scroll. Namun menu `view-informasi` terpotong tanpa menyediakan tombol jalan pintas pada dashboard operasional admin, melumpuhkan kapabilitas pengelolaan pengumuman oleh admin.
6. Dari Observasi 6: Rencana arsitektur di `REKOMENDASI_PENGGABUNGAN_FITUR_DAN_MENU.md` merancang sub-tab satelit untuk Dinas Pendidikan di dalam `AdminRekapView`. Namun implementor hanya menggabungkan rekap guru dan analitik, lalu langsung menghapus `view-rekap-siswa` dan `view-jurnal-kelas` dari menu dinas. Hal ini menyebabkan pengawas dinas kehilangan fitur inspeksi siswa dan jurnal sekolah binaan.
7. Dari Observasi 7: Penambahan pembungkus `max-w-4xl mx-auto` pada kontainer induk `GuruJurnal.tsx` mempengaruhi seluruh child component di dalamnya, termasuk dokumen rekap yang memerlukan lebar 100% saat cetak landscape.

---

## 3. CAVEATS

- **Penyimpanan Draft di LocalStorage:** Hardening storage draft (`getJurnalDraftKey`, `draftStorage.ts`) pada `5cc36af` berjalan baik dan telah memiliki backward compatibility terhadap key legacy `sipjam_jurnal_autosave`.
- **Fitur Ujian Siswa (`UjianSiswaView.tsx`):** Ditambahkan setelah konsolidasi menu (commit `95c4645` pada 30 Okt 2026), tidak terpengaruh oleh konsolidasi menu awal.
- **Sistem Blok Dinamis:** Diimplementasikan lebih lanjut pada commit `6ec8d24` s.d. `e32888c`, integrasi tab `blok` di dalam `AdminDataView` tetap stabil.

---

## 4. CONCLUSION

Konsolidasi menu telah berhasil merampingkan hierarki navigasi, namun meninggalkan **6 titik defisit fungsional dan regresi cetak nyata** yang harus dipulihkan pada milestone implementasi:
1. **Pemulihan PrintSignature & Footer AdminRekapView:** Kembalikan `<PrintSignature>` pada Sub-Tab 2 (`tabel`), bersihkan redundansi `<PrintHeader>` ganda pada Sub-Tab 3 (`cetak`).
2. **Pemulihan Tampilan Catatan Admin pada Riwayat Jurnal:** Sertakan tampilan status verifikasi interaktif dan `catatan_admin` pada riwayat jurnal pribadi di `GuruJurnal.tsx` / `RekapJurnalView.tsx`.
3. **Harmonisasi Akses Kepala Sekolah pada `evaluateTabRBAC`:** Tambahkan evaluasi peran `kepalasekolah` pada `evaluateTabRBAC` di `src/lib/navigation.ts` agar Kepala Sekolah bebas memantau supervisi kelas dan rapor.
4. **Pemulihan Akses Informasi bagi Administrator:** Sertakan kembali `view-informasi` ke dalam menu Admin atau tambahkan tombol pintasan kelola siaran pengumuman di header `HomeViewAdmin.tsx`.
5. **Pemulihan Hak Pemantauan Dinas Pendidikan:** Pulihkan akses monitoring presensi siswa dan jurnal kelas bagi Pengawas Dinas Pendidikan saat memilih sekolah satelit.
6. **Perbaikan Kontainer Cetak Landscape:** Berikan utilitas CSS `print:max-w-none` atau `print:w-full` pada section induk `GuruJurnal.tsx` agar cetak landscape `RekapJurnalView` tidak terjepit di 896px.

---

## 5. VERIFICATION METHOD

1. **Verifikasi Git History:**
   ```bash
   git log --oneline 9dbd26d..ad537b8
   git diff --stat 9dbd26d..ad537b8 -- src/
   ```
2. **Inspeksi Kode Bukti Regresi Cetak:**
   - Periksa ketiadaan PrintSignature di tab tabel: `src/components/AdminRekapView.tsx` baris 485–683.
   - Periksa keberadaan PrintHeader ganda: `src/components/AdminRekapView.tsx` baris 417 dan baris 690.
3. **Inspeksi Bukti Pemblokiran RBAC:**
   - Periksa `src/lib/navigation.ts` baris 181–186 (`evaluateTabRBAC`).
   - Periksa pemanggilan di `src/components/AppScreen.tsx` baris 499.
4. **Inspeksi Ketiadaan Menu Informasi Admin:**
   - Periksa `src/lib/navigation.ts` baris 125–136 (`getConsolidatedMenuItems` peran admin).
5. **Inspeksi Ketiadaan Catatan Admin di Rekap Jurnal:**
   - Jalankan `git grep "catatan_admin" src/components/RekapJurnalView.tsx` (hasil 0 baris).
6. **Kondisi Invalidasi Temuan:**
   Jika ditemukan commit di masa lalu yang sengaja mendeprekasi `catatan_admin` atau menghapus hak supervisi Kepala Sekolah atas dasar spesifikasi tertulis (bukan akibat konsolidasi menu). Namun berdasarkan penelusuran docs `REKOMENDASI_PENGGABUNGAN_FITUR_DAN_MENU.md`, seluruh fitur tersebut justru direkomendasikan untuk tetap dipertahankan di dalam sub-tab.

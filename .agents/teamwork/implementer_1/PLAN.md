# Rencana Implementasi Mikro: Deduplication & Labeling

## 1. Analisis Deduplication (src/components/DokumenView.tsx)
- **Fungsi**: `submitDokumen`
- **Logic Saat Ini**: 
  - Mengecek guru yang sama.
  - Mengecek jenis dokumen yang sama (fuzzy match).
  - Mengecek mata pelajaran yang sama (fuzzy match).
  - Mengecek tingkat kelas (berdasarkan `extractTingkat(kelas)`).
- **Rencana**:
  - Verifikasi `extractTingkat` mencakup semua tingkat (X, XI, XII, VII, VIII, IX, I-VI).
  - Pastikan deduplication memblokir pengunggahan jika perangkat dengan kriteria tersebut sudah ada untuk *tingkat kelas tersebut*.
  - Tidak ada perubahan besar yang diperlukan, hanya pengujian/verifikasi logic.

## 2. Analisis Update Label
- **Lokasi**: Perlu diidentifikasi di mana label dokumen ditampilkan (List view, Matrix view, Preview modal).
- **Target format**: `[nama mapel] - [Tingkat] - [Nama Guru]`
- **Rencana**:
  - Cari semua tempat render dokumen di `DokumenView.tsx`.
  - Buat helper function (atau gunakan yang ada) untuk membuat string label sesuai format.
  - Update semua UI render dengan label baru.

## 3. Tahap Eksekusi
1. Update `DokumenView.tsx` untuk menyatukan label.
2. Verifikasi deduplication logic (`duplicateDoc` block).
3. Verifikasi UI rendering.
4. Test & Commit.

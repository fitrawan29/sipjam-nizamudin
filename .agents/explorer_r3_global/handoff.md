# Handoff Report: Requirement R3 — Global Button Audit

**Subagent**: `explorer_r3_global`  
**Date**: 2026-09-11  
**Scope**: Comprehensive audit of UI buttons outside Verification (R1) and Recap (R2) across the application, identifying inactive/mock buttons, schema mismatches, and providing exact wiring recommendations to Supabase operations.

---

## 1. Observation

A systematic audit across all client pages, components, and layout files was performed using AST/ripgrep searches, direct file analysis, and Supabase MCP schema inspection (`list_tables`).

### 1.1 Inactive & Mock Buttons Observed Directly

#### Observation O1: `AdminDataView.tsx:223` — "Template" Button
* **File**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\src\components\AdminDataView.tsx`
* **Line 223**:
  ```tsx
  <button type="button" onClick={() => alert('Fitur unduh template Excel sedang dalam pengembangan')} className="btn-click bg-white dark:bg-gray-800 px-2 py-1.5 rounded-lg text-xs font-bold text-gray-700 dark:text-white shadow-sm border border-gray-300 dark:border-gray-600">Template</button>
  ```
* **Current Behavior**: Fires browser alert `'Fitur unduh template Excel sedang dalam pengembangan'`. No file download or template generation occurs.

#### Observation O2: `AdminDataView.tsx:224` — "Unggah" (Excel Upload) Button
* **File**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\src\components\AdminDataView.tsx`
* **Line 224**:
  ```tsx
  <button type="button" onClick={() => alert('Fitur unggah Excel massal sedang dalam pengembangan')} className="btn-click bg-purple-600 hover:bg-purple-700 text-white px-2 py-1.5 rounded-lg text-xs font-bold shadow-md"><i className="fa-solid fa-upload"></i> Unggah</button>
  ```
* **Current Behavior**: Fires browser alert `'Fitur unggah Excel massal sedang dalam pengembangan'`. No file picker or data import is executed.

#### Observation O3: `AdminDataView.tsx:239-241` — "+ Baru" (Add Data Manual) Button
* **File**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\src\components\AdminDataView.tsx`
* **Lines 239-241**:
  ```tsx
  <button type="button" onClick={() => alert('Fitur tambah data manual sedang dalam pengembangan')} className="btn-click bg-nizamudin-green text-white px-3 h-8 rounded-xl text-xs font-bold shadow-md flex items-center gap-1 border border-nizamudin-light hover:brightness-110">
    <i className="fa-solid fa-plus"></i> Baru
  </button>
  ```
* **Current Behavior**: Fires browser alert `'Fitur tambah data manual sedang dalam pengembangan'`. No creation dialog, modal, or database insertion occurs.

#### Observation O4: `AdminDataView.tsx:125-182` & `258-262` — Missing Card Actions (Delete & Edit)
* **File**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\src\components\AdminDataView.tsx`
* **Lines 125-182**: In `renderCard(item)`, cards for `Data_Siswa`, `Data_Guru`, `Data_Mapel`, `Kalender_Pendidikan`, and `Jadwal_Pelajaran` only render static text fields.
* **Current Behavior**: Once data exists in master tables, administrators have no UI buttons to delete or modify individual records.

#### Observation O5: `DokumenView.tsx:24-41` & `121-156` — Admin Missing Verification Controls & Teacher Scoping Bug
* **File**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\src\components\DokumenView.tsx`
* **Line 30**:
  ```tsx
  const { data, error } = await supabase
    .from('bank_dokumen')
    .select('*')
    .eq('nama_guru', user.nama)
    .order('timestamp', { ascending: false });
  ```
* **Lines 128-154**: Card rendering displays `dok.status_verifikasi` (Menunggu / Disetujui / Ditolak) and `dok.catatan_admin`, but renders zero buttons for Admin verification.
* **Current Behavior**:
  1. An Admin opening "Perangkat Pembelajaran" gets filtered by `nama_guru = user.nama`. Because the admin user does not upload teaching materials under their admin name, they see an empty list (`0` items).
  2. Even if all records were displayed, there are no "Setujui" or "Tolak" action buttons for the Admin to update `status_verifikasi` and record `catatan_admin` in `bank_dokumen`.

#### Observation O6: `AdminBackupView.tsx:83-90` & `186-196` — Database Column Mismatch Bug in Backup History
* **File**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\src\components\AdminBackupView.tsx`
* **Lines 83-90**:
  ```tsx
  const newBackup = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    periode: tahun,
    admin: user.nama,
    link_drive: webhookUrl // can be replaced with actual spreadsheet link if known
  };
  await supabase.from('riwayat_backup').insert([newBackup]);
  ```
* **Lines 189-190**:
  ```tsx
  <div className="text-xs font-bold text-gray-900 dark:text-white">Backup {item.periode}</div>
  <div className="text-xs text-gray-600 dark:text-gray-300">Oleh: {item.admin}</div>
  ```
* **Remote Supabase Schema for `riwayat_backup`** (confirmed via MCP tool `list_tables`):
  ```json
  "columns": [
    {"name":"id","data_type":"text"},
    {"name":"timestamp","data_type":"text"},
    {"name":"tahun_backup","data_type":"text"},
    {"name":"link_file","data_type":"text"},
    {"name":"status","data_type":"text"},
    {"name":"keterangan","data_type":"text"}
  ]
  ```
* **Current Behavior**: When the backup button executes, inserting non-existent columns (`periode`, `admin`, `link_drive`) triggers a Supabase schema error, failing to record backup history. Furthermore, card rendering references `item.periode` and `item.admin`, which evaluate to `undefined`.

#### Observation O7: `HomeView.tsx:206-251` — Static Workflow Tracker Lacking Interactive Action Buttons
* **File**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\src\components\HomeView.tsx`
* **Lines 206-251**: `steps.map((step, idx) => (<div key={idx} className="flex items-start gap-3 relative">...</div>))`
* **Current Behavior**: Steps like "Presensi Datang", "Laporan Piket", "Jurnal KBM", and "Presensi Pulang" show visual statuses (`done`, `active`, `locked`), but are passive textual items. The teacher must manually navigate via the sidebar to find and open the respective view.

#### Observation O8: `HistoryView.tsx:120-154` — Missing "Lihat Bukti" Link/Button for Presensi & Jurnal Attachments
* **File**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\src\components\HistoryView.tsx`
* **Lines 120-154**: The cards for presensi display `tipe_absen`, `jenis_presensi`, `timestamp`, `detail_izin`, and for jurnal display `mapel`, `kelas`, `tanggal`, `materi`.
* **Current Behavior**: Both `presensi_guru` (`link_bukti`) and `jurnal_pembelajaran` (`link_bukti_foto`) store uploaded attachment URLs, but `HistoryView` never renders an anchor or button to inspect the uploaded attachment.

#### Observation O9: `PiketView.tsx:140-155` — Admin "Kelola Piket" Lacks Schedule Assignment Controls
* **File**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\src\components\PiketView.tsx`
* **Lines 140-155**: Displays "Jadwal Piket Harian" as a read-only list from `jadwal_piket`.
* **Current Behavior**: Admin menu in `AppScreen.tsx` labels this view "Kelola Piket" (`label: 'Kelola Piket'`), but Admin has no button to edit, assign, or update teachers in `jadwal_piket` (`hari`, `daftar_guru`).

#### Observation O10: `AdminConfigView.tsx:155-171` — Lacks GPS Auto-detect Button for School Geofence
* **File**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\src\components\AdminConfigView.tsx`
* **Lines 155-171**: Contains text inputs for `gps_lat`, `gps_lng`, `gps_radius`.
* **Current Behavior**: Admin must manually type or copy-paste decimal GPS coordinates without a "Deteksi Lokasi Saat Ini" button to automatically read browser geolocation coordinates.

---

## 2. Logic Chain

1. **Analysis of Admin Master Data (`AdminDataView.tsx`)**:
   - Observations O1, O2, O3 directly reveal three buttons with placeholder `onClick={() => alert('Fitur ... sedang dalam pengembangan')}`.
   - The Supabase database contains tables `data_siswa`, `data_guru`, `data_mapel`, `kalender_pendidikan`, and `jadwal_pelajaran`.
   - In CSV directory `csv/`, baseline templates already exist:
     - `data_siswa`: `nisn,nama_siswa,kelas,gender,status,no_hp_ortu`
     - `data_guru`: `nip,nama_guru,mata_pelajaran,no_hp,status,email`
     - `data_mapel`: `id,nama_mata_pelajaran,kategori`
     - `kalender_pendidikan`: `id,tanggal,keterangan,tipe`
     - `jadwal_pelajaran`: `id,hari,nama_guru,mata_pelajaran,kelas`
   - Therefore, "Template" button can dynamically generate and download a valid CSV header structure via browser Blob API.
   - "Unggah" button can open a file dialog, parse CSV rows, and perform batch `supabase.from(tabObj.table).upsert(...)`.
   - "Baru" button can open a modal form tailored to `activeTab`, collecting required fields and inserting into Supabase.
   - Observation O4 shows that records cannot be deleted; adding a delete button with `supabase.from(tabObj.table).delete().eq('id'/'nisn', item.id)` completes the CRUD cycle.

2. **Analysis of Document Management (`DokumenView.tsx`)**:
   - Observation O5 shows that `DokumenView` filters by `eq('nama_guru', user.nama)`.
   - When `user.role === 'Admin'`, this filter fails because Admin has not uploaded personal teaching documents.
   - Removing the filter when `user.role === 'Admin'` allows the administrator to view all submitted teacher documents.
   - Adding "Setujui" and "Tolak" buttons on each card allows the administrator to execute `supabase.from('bank_dokumen').update({ status_verifikasi: 'Disetujui' | 'Ditolak', catatan_admin: text }).eq('id', dok.id)`.

3. **Analysis of Backup History (`AdminBackupView.tsx`)**:
   - Observation O6 demonstrates a column mismatch between `AdminBackupView.tsx` and the database table `public.riwayat_backup`.
   - The table schema uses `tahun_backup`, `link_file`, `status`, and `keterangan`.
   - Aligning the payload object keys with the database columns ensures backup records are successfully persisted and displayed without schema violation errors.

4. **Analysis of Dashboard Workflow (`HomeView.tsx`)**:
   - Observation O7 shows that teachers see a sequential workflow: Presensi Datang &rarr; Piket &rarr; Jurnal &rarr; Presensi Pulang.
   - Making each active step clickable to invoke `setView(targetViewId)` eliminates unnecessary navigation friction.

5. **Analysis of History & Verification Parity (`HistoryView.tsx`)**:
   - Observation O8 shows that while `AdminVerifView` shows links to `link_bukti` and `link_bukti_foto`, `HistoryView` omits them.
   - Adding `<a href={item.link_bukti} target="_blank">` provides full transparency for teachers to verify their uploaded documents.

6. **Analysis of Piket Assignment (`PiketView.tsx`)**:
   - Observation O9 shows that Admin cannot update `jadwal_piket`.
   - Adding an inline edit modal for Admin to update `daftar_guru` for a day connects the button to `supabase.from('jadwal_piket').upsert(...)`.

7. **Analysis of Geolocation Configuration (`AdminConfigView.tsx`)**:
   - Observation O10 shows that configuring `gps_lat` and `gps_lng` requires manual input.
   - Adding a button that invokes `navigator.geolocation.getCurrentPosition` directly populates the coordinates for the Admin.

---

## 3. Detailed Proposed Wiring Specifications

### 3.1 `AdminDataView.tsx`: Template, Unggah, Baru, and Delete Actions

#### A. Download Template (`handleDownloadTemplate`)
Replace line 223:
```tsx
// Current:
<button type="button" onClick={() => alert('Fitur unduh template Excel sedang dalam pengembangan')} ...>Template</button>

// Proposed Wiring:
<button type="button" onClick={handleDownloadTemplate} className="btn-click bg-white dark:bg-gray-800 px-2.5 py-1.5 rounded-lg text-xs font-bold text-gray-700 dark:text-white shadow-sm border border-gray-300 dark:border-gray-600 flex items-center gap-1.5">
  <i className="fa-solid fa-file-csv text-green-600"></i> Template
</button>
```

**Implementation Function**:
```ts
const handleDownloadTemplate = () => {
  const templates: Record<string, { filename: string; headers: string[]; sample: string[] }> = {
    Data_Siswa: {
      filename: 'Template_Data_Siswa.csv',
      headers: ['nisn', 'nama_siswa', 'kelas', 'gender', 'status', 'no_hp_ortu'],
      sample: ['1234567890', 'Nama Siswa Contoh', 'X-1', 'L', 'Aktif', '081234567890']
    },
    Data_Guru: {
      filename: 'Template_Data_Guru.csv',
      headers: ['nip', 'nama_guru', 'mata_pelajaran', 'no_hp', 'status', 'email'],
      sample: ['198501012010011001', 'Nama Guru Contoh', 'Matematika', '081234567890', 'Aktif', 'guru@nizamudin.sch.id']
    },
    Data_Mapel: {
      filename: 'Template_Data_Mapel.csv',
      headers: ['id', 'nama_mata_pelajaran', 'kategori'],
      sample: ['MP-01', 'Matematika Wajib', 'Umum']
    },
    Kalender_Pendidikan: {
      filename: 'Template_Kalender_Pendidikan.csv',
      headers: ['id', 'tanggal', 'keterangan', 'tipe'],
      sample: ['KP-01', '2026-10-01', 'Hari Kesaktian Pancasila', 'Libur']
    },
    Jadwal_Pelajaran: {
      filename: 'Template_Jadwal_Pelajaran.csv',
      headers: ['id', 'hari', 'nama_guru', 'mata_pelajaran', 'kelas'],
      sample: ['JP-01', 'Senin', 'Nama Guru', 'Matematika', 'X-1']
    }
  };

  const current = templates[activeTab];
  if (!current) return;
  const content = [current.headers.join(','), current.sample.join(',')].join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = current.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
```

#### B. Mass Upload CSV (`handleUploadCsv`)
Replace line 224:
```tsx
// Current:
<button type="button" onClick={() => alert('Fitur unggah Excel massal sedang dalam pengembangan')} ...>Unggah</button>

// Proposed Wiring:
<input 
  type="file" 
  ref={fileInputRef} 
  accept=".csv,.txt" 
  onChange={handleFileUpload} 
  className="hidden" 
/>
<button 
  type="button" 
  onClick={() => fileInputRef.current?.click()} 
  disabled={loading}
  className="btn-click bg-purple-600 hover:bg-purple-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5 transition disabled:opacity-50"
>
  <i className="fa-solid fa-upload"></i> Unggah
</button>
```

**Implementation Function**:
```ts
const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  e.target.value = '';

  const tabObj = tabs.find(t => t.id === activeTab);
  if (!tabObj) return;

  setLoading(true);
  try {
    const text = await file.text();
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) throw new Error('File CSV kosong atau tidak memiliki data.');

    const parseCsv = (line: string) => {
      const parts = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') inQuotes = !inQuotes;
        else if (c === ',' && !inQuotes) { parts.push(cur.trim()); cur = ''; }
        else cur += c;
      }
      parts.push(cur.trim());
      return parts;
    };

    const headers = parseCsv(lines[0]).map(h => h.toLowerCase().replace(/[\s-]+/g, '_'));
    const rows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const vals = parseCsv(lines[i]);
      if (vals.length === 0 || (vals.length === 1 && vals[0] === '')) continue;
      const row: Record<string, any> = {};
      headers.forEach((h, idx) => {
        if (vals[idx] !== undefined) row[h] = vals[idx];
      });
      if (!row.id && (tabObj.table === 'jadwal_pelajaran' || tabObj.table === 'kalender_pendidikan' || tabObj.table === 'data_mapel')) {
        row.id = crypto.randomUUID();
      }
      rows.push(row);
    }

    if (rows.length === 0) throw new Error('Tidak ada baris data yang valid ditemukan.');

    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error } = await supabase.from(tabObj.table).upsert(batch, { ignoreDuplicates: false });
      if (error) throw error;
    }

    Swal.fire('Berhasil', `Berhasil mengimpor ${rows.length} data ke tabel ${tabObj.label}!`, 'success');
    loadData();
  } catch (err: any) {
    Swal.fire('Gagal Impor', err.message || 'Terjadi kesalahan saat memproses file CSV.', 'error');
  } finally {
    setLoading(false);
  }
};
```

#### C. Manual Insertion Modal (`handleCreateManual`)
Replace lines 239-241:
```tsx
// Current:
<button type="button" onClick={() => alert('Fitur tambah data manual sedang dalam pengembangan')} ...>Baru</button>

// Proposed Wiring:
<button 
  type="button" 
  onClick={handleOpenCreateModal} 
  className="btn-click bg-nizamudin-green text-white px-3 h-8 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 border border-nizamudin-light hover:brightness-110"
>
  <i className="fa-solid fa-plus"></i> Baru
</button>
```

**Implementation Function using SweetAlert2**:
```ts
const handleOpenCreateModal = async () => {
  const tabObj = tabs.find(t => t.id === activeTab);
  if (!tabObj) return;

  if (activeTab === 'Data_Siswa') {
    const { value: formValues } = await Swal.fire({
      title: 'Tambah Siswa Baru',
      html: `
        <input id="swal-nisn" class="swal2-input text-xs" placeholder="NISN">
        <input id="swal-nama" class="swal2-input text-xs" placeholder="Nama Lengkap Siswa">
        <input id="swal-kelas" class="swal2-input text-xs" placeholder="Kelas (contoh: X-1, XI Merdeka)">
        <select id="swal-gender" class="swal2-select text-xs">
          <option value="L">Laki-laki</option>
          <option value="P">Perempuan</option>
        </select>
        <input id="swal-hp" class="swal2-input text-xs" placeholder="No HP Orang Tua">
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Simpan',
      confirmButtonColor: '#0B4619',
      preConfirm: () => {
        const nisn = (document.getElementById('swal-nisn') as HTMLInputElement).value;
        const nama_siswa = (document.getElementById('swal-nama') as HTMLInputElement).value;
        const kelas = (document.getElementById('swal-kelas') as HTMLInputElement).value;
        const gender = (document.getElementById('swal-gender') as HTMLSelectElement).value;
        const no_hp_ortu = (document.getElementById('swal-hp') as HTMLInputElement).value;
        if (!nisn || !nama_siswa) {
          Swal.showValidationMessage('NISN dan Nama Siswa wajib diisi!');
          return null;
        }
        return { nisn, nama_siswa, kelas, gender, status: 'Aktif', no_hp_ortu };
      }
    });

    if (formValues) {
      setLoading(true);
      const { error } = await supabase.from('data_siswa').insert([formValues]);
      setLoading(false);
      if (error) Swal.fire('Error', error.message, 'error');
      else { Swal.fire('Berhasil', 'Siswa berhasil ditambahkan!', 'success'); loadData(); }
    }
  } else if (activeTab === 'Data_Guru') {
    const { value: formValues } = await Swal.fire({
      title: 'Tambah Guru Baru',
      html: `
        <input id="swal-nip" class="swal2-input text-xs" placeholder="NIP (atau strip jika belum ada)">
        <input id="swal-nama" class="swal2-input text-xs" placeholder="Nama Lengkap Guru">
        <input id="swal-mapel" class="swal2-input text-xs" placeholder="Mata Pelajaran Utama">
        <input id="swal-hp" class="swal2-input text-xs" placeholder="No HP / WhatsApp">
        <input id="swal-email" class="swal2-input text-xs" placeholder="Alamat Email">
      `,
      showCancelButton: true,
      confirmButtonText: 'Simpan',
      confirmButtonColor: '#0B4619',
      preConfirm: () => {
        const nip = (document.getElementById('swal-nip') as HTMLInputElement).value;
        const nama_guru = (document.getElementById('swal-nama') as HTMLInputElement).value;
        const mata_pelajaran = (document.getElementById('swal-mapel') as HTMLInputElement).value;
        const no_hp = (document.getElementById('swal-hp') as HTMLInputElement).value;
        const email = (document.getElementById('swal-email') as HTMLInputElement).value;
        if (!nama_guru) {
          Swal.showValidationMessage('Nama Guru wajib diisi!');
          return null;
        }
        return { nip: nip || '-', nama_guru, mata_pelajaran, no_hp, status: 'Aktif', email };
      }
    });

    if (formValues) {
      setLoading(true);
      const { error } = await supabase.from('data_guru').insert([formValues]);
      setLoading(false);
      if (error) Swal.fire('Error', error.message, 'error');
      else { Swal.fire('Berhasil', 'Guru berhasil ditambahkan!', 'success'); loadData(); }
    }
  } else if (activeTab === 'Data_Mapel') {
    const { value: formValues } = await Swal.fire({
      title: 'Tambah Mata Pelajaran',
      html: `
        <input id="swal-id" class="swal2-input text-xs" placeholder="Kode / ID Mapel">
        <input id="swal-nama" class="swal2-input text-xs" placeholder="Nama Mata Pelajaran">
        <select id="swal-kat" class="swal2-select text-xs">
          <option value="Umum">Umum</option>
          <option value="Peminatan">Peminatan</option>
          <option value="Muatan Lokal">Muatan Lokal</option>
        </select>
      `,
      showCancelButton: true,
      confirmButtonText: 'Simpan',
      confirmButtonColor: '#0B4619',
      preConfirm: () => {
        const id = (document.getElementById('swal-id') as HTMLInputElement).value;
        const nama_mata_pelajaran = (document.getElementById('swal-nama') as HTMLInputElement).value;
        const kategori = (document.getElementById('swal-kat') as HTMLSelectElement).value;
        if (!nama_mata_pelajaran) {
          Swal.showValidationMessage('Nama Mata Pelajaran wajib diisi!');
          return null;
        }
        return { id: id || crypto.randomUUID(), nama_mata_pelajaran, kategori };
      }
    });

    if (formValues) {
      setLoading(true);
      const { error } = await supabase.from('data_mapel').insert([formValues]);
      setLoading(false);
      if (error) Swal.fire('Error', error.message, 'error');
      else { Swal.fire('Berhasil', 'Mata Pelajaran berhasil ditambahkan!', 'success'); loadData(); }
    }
  } else if (activeTab === 'Kalender_Pendidikan') {
    const { value: formValues } = await Swal.fire({
      title: 'Tambah Agenda Kalender',
      html: `
        <input id="swal-tgl" type="date" class="swal2-input text-xs">
        <input id="swal-ket" class="swal2-input text-xs" placeholder="Keterangan Agenda">
        <select id="swal-tipe" class="swal2-select text-xs">
          <option value="Libur">Libur</option>
          <option value="Kegiatan">Kegiatan</option>
          <option value="Ujian">Ujian</option>
        </select>
      `,
      showCancelButton: true,
      confirmButtonText: 'Simpan',
      confirmButtonColor: '#0B4619',
      preConfirm: () => {
        const tanggal = (document.getElementById('swal-tgl') as HTMLInputElement).value;
        const keterangan = (document.getElementById('swal-ket') as HTMLInputElement).value;
        const tipe = (document.getElementById('swal-tipe') as HTMLSelectElement).value;
        if (!tanggal || !keterangan) {
          Swal.showValidationMessage('Tanggal dan Keterangan wajib diisi!');
          return null;
        }
        return { id: crypto.randomUUID(), tanggal, keterangan, tipe };
      }
    });

    if (formValues) {
      setLoading(true);
      const { error } = await supabase.from('kalender_pendidikan').insert([formValues]);
      setLoading(false);
      if (error) Swal.fire('Error', error.message, 'error');
      else { Swal.fire('Berhasil', 'Agenda kalender berhasil ditambahkan!', 'success'); loadData(); }
    }
  } else if (activeTab === 'Jadwal_Pelajaran') {
    const { value: formValues } = await Swal.fire({
      title: 'Tambah Jadwal Pelajaran',
      html: `
        <select id="swal-hari" class="swal2-select text-xs">
          <option value="Senin">Senin</option>
          <option value="Selasa">Selasa</option>
          <option value="Rabu">Rabu</option>
          <option value="Kamis">Kamis</option>
          <option value="Jumat">Jumat</option>
          <option value="Sabtu">Sabtu</option>
        </select>
        <input id="swal-guru" class="swal2-input text-xs" placeholder="Nama Guru">
        <input id="swal-mapel" class="swal2-input text-xs" placeholder="Mata Pelajaran">
        <input id="swal-kelas" class="swal2-input text-xs" placeholder="Kelas">
      `,
      showCancelButton: true,
      confirmButtonText: 'Simpan',
      confirmButtonColor: '#0B4619',
      preConfirm: () => {
        const hari = (document.getElementById('swal-hari') as HTMLSelectElement).value;
        const nama_guru = (document.getElementById('swal-guru') as HTMLInputElement).value;
        const mata_pelajaran = (document.getElementById('swal-mapel') as HTMLInputElement).value;
        const kelas = (document.getElementById('swal-kelas') as HTMLInputElement).value;
        if (!nama_guru || !mata_pelajaran || !kelas) {
          Swal.showValidationMessage('Semua field wajib diisi!');
          return null;
        }
        return { id: crypto.randomUUID(), hari, nama_guru, mata_pelajaran, kelas };
      }
    });

    if (formValues) {
      setLoading(true);
      const { error } = await supabase.from('jadwal_pelajaran').insert([formValues]);
      setLoading(false);
      if (error) Swal.fire('Error', error.message, 'error');
      else { Swal.fire('Berhasil', 'Jadwal pelajaran berhasil ditambahkan!', 'success'); loadData(); }
    }
  }
};
```

#### D. Card Delete Action (`handleDeleteItem`)
On lines 258-262 in `AdminDataView.tsx`:
```tsx
<div key={item?.id || idx} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3 rounded-xl shadow-sm relative hover:shadow-md transition">
  {renderCard(item)}
  <div className="flex justify-end mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
    <button 
      type="button" 
      onClick={() => handleDeleteItem(item)} 
      className="btn-click text-[10px] font-bold text-red-600 hover:text-red-700 dark:text-red-400 flex items-center gap-1"
    >
      <i className="fa-solid fa-trash-can"></i> Hapus
    </button>
  </div>
</div>
```
**Delete Implementation**:
```ts
const handleDeleteItem = async (item: any) => {
  const tabObj = tabs.find(t => t.id === activeTab);
  if (!tabObj) return;

  const result = await Swal.fire({
    title: 'Hapus Data?',
    text: 'Data yang dihapus tidak dapat dikembalikan.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, Hapus!',
    confirmButtonColor: '#dc2626',
    cancelButtonText: 'Batal'
  });

  if (result.isConfirmed) {
    setLoading(true);
    const idField = item.id ? 'id' : (item.nisn ? 'nisn' : (item.nip ? 'nip' : 'id'));
    const idVal = item[idField];
    const { error } = await supabase.from(tabObj.table).delete().eq(idField, idVal);
    setLoading(false);
    if (error) {
      Swal.fire('Error', error.message, 'error');
    } else {
      Swal.fire('Terhapus', 'Data berhasil dihapus.', 'success');
      loadData();
    }
  }
};
```

---

### 3.2 `DokumenView.tsx`: Admin Verification Controls & Unrestricted Document View

#### A. Unrestricted Query for Admin
In `DokumenView.tsx:24-41`:
```ts
// Current:
const { data, error } = await supabase
  .from('bank_dokumen')
  .select('*')
  .eq('nama_guru', user.nama)
  .order('timestamp', { ascending: false });

// Proposed:
let query = supabase
  .from('bank_dokumen')
  .select('*')
  .order('timestamp', { ascending: false });

// If user is Guru, filter by their name; if Admin, load all documents:
if (user?.role !== 'Admin') {
  query = query.eq('nama_guru', user.nama);
}
const { data, error } = await query;
```

#### B. Admin Setujui & Tolak Action Buttons
In `DokumenView.tsx:146-152`, add verification action buttons when `user.role === 'Admin'`:
```tsx
{/* Admin Action Buttons */}
{user.role === 'Admin' && (
  <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
    <button 
      type="button" 
      onClick={() => handleVerifyDokumen(dok.id, 'Disetujui')}
      className="btn-click flex-1 bg-green-500 hover:bg-green-600 text-white text-[11px] font-bold py-1.5 rounded-lg transition shadow-sm flex items-center justify-center gap-1"
    >
      <i className="fa-solid fa-check"></i> Setujui
    </button>
    <button 
      type="button" 
      onClick={() => handleVerifyDokumen(dok.id, 'Ditolak')}
      className="btn-click flex-1 bg-red-500 hover:bg-red-600 text-white text-[11px] font-bold py-1.5 rounded-lg transition shadow-sm flex items-center justify-center gap-1"
    >
      <i className="fa-solid fa-xmark"></i> Tolak
    </button>
  </div>
)}
```

**Implementation Function**:
```ts
const handleVerifyDokumen = async (id: string, status: 'Disetujui' | 'Ditolak') => {
  let catatan = '';
  if (status === 'Ditolak') {
    const { value: text } = await Swal.fire({
      title: 'Tolak Dokumen',
      input: 'textarea',
      inputLabel: 'Catatan / Alasan Penolakan',
      inputPlaceholder: 'Tuliskan catatan perbaikan untuk guru...',
      showCancelButton: true,
      confirmButtonText: 'Tolak Dokumen',
      confirmButtonColor: '#dc2626',
      inputValidator: (val) => (!val ? 'Catatan wajib diisi!' : null)
    });
    if (!text) return;
    catatan = text;
  }

  setFetching(true);
  const { error } = await supabase
    .from('bank_dokumen')
    .update({ 
      status_verifikasi: status, 
      catatan_admin: catatan 
    })
    .eq('id', id);

  setFetching(false);
  if (error) {
    Swal.fire('Error', 'Gagal memverifikasi dokumen: ' + error.message, 'error');
  } else {
    Swal.fire('Berhasil', `Dokumen telah ${status.toLowerCase()}.`, 'success');
    loadDokumen();
  }
};
```

---

### 3.3 `AdminBackupView.tsx`: Correcting Database Schema Key Mapping

In `AdminBackupView.tsx:83-90`:
```ts
// Current:
const newBackup = {
  id: crypto.randomUUID(),
  timestamp: new Date().toISOString(),
  periode: tahun,
  admin: user.nama,
  link_drive: webhookUrl
};
await supabase.from('riwayat_backup').insert([newBackup]);

// Proposed Wiring (Matching public.riwayat_backup columns):
const newBackup = {
  id: crypto.randomUUID(),
  timestamp: getWitaTimestamp(),
  tahun_backup: tahun,
  link_file: webhookUrl,
  status: 'Sukses',
  keterangan: `Backup transaksi oleh ${user.nama} (${user.role})`
};
await supabase.from('riwayat_backup').insert([newBackup]);
```

In `AdminBackupView.tsx:189-190`:
```tsx
// Current:
<div className="text-xs font-bold text-gray-900 dark:text-white">Backup {item.periode}</div>
<div className="text-xs text-gray-600 dark:text-gray-300">Oleh: {item.admin}</div>

// Proposed:
<div className="text-xs font-bold text-gray-900 dark:text-white">Backup {item.tahun_backup || item.periode}</div>
<div className="text-xs text-gray-600 dark:text-gray-300">{item.keterangan || (item.admin ? `Oleh: ${item.admin}` : '')}</div>
```

---

### 3.4 `HomeView.tsx`: Workflow Steps Direct Action Buttons

In `HomeView.tsx:230-248`, attach click navigation to active steps:
```tsx
// Mapping step label to view ID:
const getStepViewId = (label: string): string | null => {
  if (label.includes('Presensi Datang') || label.includes('Presensi Pulang')) return 'view-guru-presensi';
  if (label.includes('Laporan Piket')) return 'view-piket';
  if (label.includes('Jurnal')) return 'view-guru-jurnal';
  return null;
};

// In step rendering:
const targetView = getStepViewId(step.label);
const isClickable = step.status === 'active' && targetView;

// Proposed Wiring:
<div 
  key={idx} 
  onClick={() => { if (isClickable) setView(targetView); }}
  className={`flex items-start gap-3 relative rounded-xl p-1.5 transition-colors ${
    isClickable ? 'cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/10' : ''
  }`}
>
  ...
  <div className="flex-grow pb-2">
    <div className="flex items-center justify-between">
      <p className={`text-[11px] font-bold ${...}`}>{step.label}</p>
      {isClickable && (
        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
          Buka <i className="fa-solid fa-arrow-right text-[8px]"></i>
        </span>
      )}
    </div>
    <p className={`text-[10px] mt-0.5 ${...}`}>{step.detail}</p>
  </div>
</div>
```

---

### 3.5 `HistoryView.tsx`: Attachment Link ("Lihat Bukti")

In `HistoryView.tsx:134` (Presensi card) and `line 150` (Jurnal card):
```tsx
// For Presensi Cards:
{item.link_bukti && item.link_bukti !== '-' && (
  <a 
    href={item.link_bukti} 
    target="_blank" 
    rel="noreferrer" 
    className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
  >
    <i className="fa-solid fa-paperclip"></i> Lihat Bukti Presensi
  </a>
)}

// For Jurnal Cards:
{item.link_bukti_foto && item.link_bukti_foto !== '-' && (
  <a 
    href={item.link_bukti_foto} 
    target="_blank" 
    rel="noreferrer" 
    className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
  >
    <i className="fa-solid fa-image"></i> Lihat Bukti Foto Kegiatan
  </a>
)}
```

---

### 3.6 `PiketView.tsx`: Admin Schedule Management Modal

In `PiketView.tsx:140-155`:
When `user.role === 'Admin'`, add an "Edit" button on each day card:
```tsx
{jadwalPiket.map(j => (
  <div key={j.id} className="bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-teal-100 dark:border-teal-900 flex justify-between items-start">
    <div>
      <div className="font-bold text-teal-700 dark:text-teal-400 text-xs">{j.hari}</div>
      <div className="text-[10px] text-gray-700 dark:text-white/80 mt-0.5">{j.daftar_guru}</div>
    </div>
    {user.role === 'Admin' && (
      <button 
        type="button" 
        onClick={() => handleEditJadwalPiket(j)}
        className="btn-click text-[10px] text-teal-600 hover:text-teal-700 dark:text-teal-400 font-bold ml-2 shrink-0 flex items-center gap-1"
      >
        <i className="fa-solid fa-pen-to-square"></i> Edit
      </button>
    )}
  </div>
))}
```

**Implementation Function**:
```ts
const handleEditJadwalPiket = async (jadwal: any) => {
  const { value: newDaftar } = await Swal.fire({
    title: `Atur Guru Piket: ${jadwal.hari}`,
    input: 'textarea',
    inputLabel: 'Daftar Nama Guru (pisahkan dengan koma)',
    inputValue: jadwal.daftar_guru || '',
    showCancelButton: true,
    confirmButtonText: 'Simpan Jadwal',
    confirmButtonColor: '#0d9488'
  });

  if (newDaftar !== undefined) {
    setLoading(true);
    const { error } = await supabase
      .from('jadwal_piket')
      .update({ daftar_guru: newDaftar })
      .eq('id', jadwal.id);
    setLoading(false);

    if (error) {
      Swal.fire('Error', error.message, 'error');
    } else {
      Swal.fire('Berhasil', 'Jadwal piket berhasil diperbarui.', 'success');
      fetchDataPiket();
    }
  }
};
```

---

### 3.7 `AdminConfigView.tsx`: GPS Geolocation Auto-detect Button

In `AdminConfigView.tsx:155-171`:
Add a "Deteksi Koordinat Saat Ini" button above or next to the Latitude and Longitude fields:
```tsx
<div className="flex justify-between items-center mb-2">
  <h3 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase flex items-center gap-2">
    <i className="fa-solid fa-location-dot text-xs"></i> Kordinat GPS Absensi
  </h3>
  <button 
    type="button" 
    onClick={() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setConfig(prev => ({
              ...prev,
              gps_lat: pos.coords.latitude.toFixed(6),
              gps_lng: pos.coords.longitude.toFixed(6)
            }));
            Swal.fire('GPS Terdeteksi', `Latitude: ${pos.coords.latitude.toFixed(6)}, Longitude: ${pos.coords.longitude.toFixed(6)}`, 'info');
          },
          (err) => Swal.fire('Gagal GPS', err.message, 'error'),
          { enableHighAccuracy: true }
        );
      } else {
        Swal.fire('Error', 'Browser tidak mendukung geolokasi.', 'error');
      }
    }}
    className="btn-click text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-1 rounded-lg border border-emerald-300 dark:border-emerald-700 flex items-center gap-1"
  >
    <i className="fa-solid fa-crosshairs"></i> Gunakan Titik Saat Ini
  </button>
</div>
```

---

## 4. Caveats

1. **Security & RLS (Row Level Security)**:
   - MCP inspection discovered that all 13 tables currently have Row Level Security (RLS) disabled.
   - The application relies on the Supabase public anonymous key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) for client queries.
   - Do NOT run `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` without defining explicit read/write policies, as doing so will immediately break all frontend queries for unauthenticated client sessions.
2. **Third-Party External Webhooks**:
   - `driveUpload.ts` and `AdminBackupView.tsx` communicate with Google Apps Script Webhooks (`script.google.com`). These external endpoints depend on active Google service accounts. Client-side fallbacks and informative SweetAlert2 dialogs should be used when webhooks respond slowly.
3. **Scope Boundary**:
   - R1 (Verification views: Presensi, Jurnal, Piket) and R2 (Recap features: AdminRekap, RekapJurnal, RekapSiswa) are covered by peer subagents. Global buttons in this report cover all remaining application views.

---

## 5. Conclusion

1. **Overall Health**: Core submission buttons (Presensi submit, Jurnal submit, Piket submit, Dokumen upload, Config save, Login, and Sidebar navigation) are fully operational and connected to real services.
2. **Key Functional Gaps Identified (R3)**:
   - `AdminDataView.tsx`: 3 buttons (`Template`, `Unggah`, `Baru`) contain hardcoded mock `alert(...)` calls and lack card delete actions.
   - `DokumenView.tsx`: Admin is restricted by teacher-scoping query and lacks "Setujui" / "Tolak" verification buttons.
   - `AdminBackupView.tsx`: Insert statement contains field mismatches against the database schema (`periode`, `admin`, `link_drive` vs `tahun_backup`, `link_file`, `keterangan`).
   - `HomeView.tsx`: Workflow tracker steps are static text instead of active navigation shortcuts.
   - `HistoryView.tsx`: Missing visual links to open attachment proofs.
   - `PiketView.tsx`: Admin lacks interactive controls to manage `jadwal_piket`.
   - `AdminConfigView.tsx`: Lacks a 1-click GPS coordinate capture button.
3. **Actionability**: Every identified button has been diagnosed with exact file paths, line numbers, database table mappings, and complete drop-in TypeScript/React code solutions.

---

## 6. Verification Method

To independently verify the findings in this report:

1. **Verify Mock Alert Buttons**:
   Run ripgrep:
   ```bash
   rg "alert\(" src/
   ```
   *Expected Output*: Exact matches in `AdminDataView.tsx` lines 223, 224, 239.

2. **Verify Database Schema Mappings**:
   Inspect Supabase schema via Supabase MCP tool or SQL:
   ```sql
   SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'riwayat_backup';
   ```
   *Expected Output*: Columns are `id`, `timestamp`, `tahun_backup`, `link_file`, `status`, `keterangan`. Compare against `AdminBackupView.tsx:83-90` to confirm the column mismatch.

3. **Verify Build & Type Safety**:
   Run Next.js build check:
   ```bash
   npm run build
   ```
   *Expected Output*: Verify that all component exports and imports resolve cleanly without TypeScript compilation errors.

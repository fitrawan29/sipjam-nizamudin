# Handoff Report: UI/UX Architecture & Component Blueprint for `AdminKelasView.tsx`

**Agent ID**: `explorer_m1_1`  
**Milestone**: Milestone 1 (Sub Menu Kelas & Pemusatan Penentuan Kelas Siswa)  
**Target Component**: `src/components/AdminKelasView.tsx`  
**Target Route Integration**: `src/components/AdminDataView.tsx`, `src/lib/navigation.ts`

---

## 1. Observation

Direct observations from examining the codebase, existing views, and schema:

1. **Sub-View Component Architecture**:
   - `src/components/AdminPenggunaView.tsx` (lines 17–33, 358–410) demonstrates the canonical modern sub-view in `sipjam-app`:
     * Accepts `user: any` (or `AppUser`).
     * Enforces strict RBAC at mount time with `isMasterDataModificationAllowed(user?.role)` from `@/lib/dataIntegrityGuard`. If non-admin, renders an "Akses Terblokir" lock banner (`fa-solid fa-lock`, red-50/dark:bg-red-950/20 card).
     * Header layout features an informational gradient banner (`bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-950/40`), icon container (`w-10 h-10 rounded-xl bg-purple-600 text-white`), live sync/refresh button, and responsive metric chips (`grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t`).
     * Interactive controls use `input-premium`, `btn-click`, and `clay-btn` classes.
     * User feedback relies on `showToast` from `@/lib/toast` and `Swal.fire` from `sweetalert2`.

2. **Master Data Navigation and Tab Integration**:
   - `src/components/AdminDataView.tsx` (lines 42–58, 117–126, 1915–1934):
     * The `tabs` array lists master entities: `Data_Siswa`, `Data_Guru`, `Data_Mapel`, `Kalender_Pendidikan`, `Jadwal_Pelajaran`, `sistem_blok`, `Wali_Kelas`, `Pengguna`.
     * Conditional rendering delegates custom interactive workflows to dedicated sub-views (`sistem_blok` -> `<SistemBlokView>`, `Pengguna` -> `<AdminPenggunaView>`).
     * Tab persistence utilizes `window.history.replaceState(null, '', `?view=view-admin-data&tab=${tab.id}`)`.

3. **Cohort Advancement and Student Class Mutation**:
   - `src/components/NaikKelasModal.tsx` (lines 8–16, 25–57, 180–189):
     * Exports `computeCohortAdvancement(currentKelas: string)` supporting Roman numeral (X -> XI -> XII -> Lulus) and Arabic numeral (10 -> 11 -> 12 -> Lulus) progression across SMA, SMP, and SD.
     * Takes props: `isOpen: boolean; onClose: () => void; onSuccess: () => void; students: any[]; sekolahId?: string; role?: string;`.
     * Performs direct updates against `data_siswa`: `supabase.from('data_siswa').update({ kelas: targetKelas, status: targetStatus }).in('id', ids).eq('sekolah_id', sekolahId)`.

4. **Multi-Tenant Scoping and Schema Resilience**:
   - `src/lib/supabaseClient.ts` (lines 39–75, 124–141):
     * Master data tables include `data_siswa`, `data_guru`, `jadwal_pelajaran`, `wali_kelas`, `data_kelas`, `kelas`, `guru_kelas`, `kalender_pendidikan`, `sistem_blok`.
     * `isSchemaCacheOrMissingTableError(err)` handles potential PostgreSQL errors (`PGRST205`, `undefined_table`) allowing components to gracefully fall back when optional or migration-pending tables are unavailable.
   - `tests/jadwal_mapel_validity_and_master_integrity.test.ts` (lines 430–443):
     * Existing invariant test checks that master classes `['X Merdeka', 'XI Merdeka', 'XII Merdeka']` exist in `data_siswa` without regressing.

5. **Canonical Routing and RBAC Enforcement**:
   - `src/lib/navigation.ts` (lines 22–39, 216–237):
     * `VIEW_ALIASES` maps legacy/shorthand routes to canonical `{ view, tab }`.
     * `evaluateTabRBAC` guards `view-admin-data` and ensures non-admin roles (Guru, Siswa, Dinas) cannot access master data.

---

## 2. Logic Chain

1. **User Requirement & Core Objective**:
   The admin needs a dedicated `Kelas` sub-menu under Master Data (`AdminDataView.tsx`), complete with route aliasing (`view-admin-kelas` / `view-kelas`), that serves as the single centralized command center for:
   - Visualizing all active classes and their composition (male/female breakdown, student counts, homeroom teacher).
   - Identifying and resolving unallocated students ("Siswa Tanpa Kelas").
   - Allocating and reallocating students between classes in bulk or individually.
   - Managing class records (creation, rename with cascading updates, deletion when empty).
   - Launching bulk cohort advancement via `NaikKelasModal.tsx`.

2. **Schema & Data Sourcing Logic**:
   - In Supabase, student class membership is recorded on `data_siswa.kelas`.
   - Homeroom assignments are recorded on `wali_kelas` (`kelas`, `nama_guru`, `nip`).
   - Master class definitions can reside in `data_kelas` (with columns `nama_kelas`, `tingkat`, `jurusan`, `sekolah_id`).
   - To ensure zero downtime and 100% resilience against environments where `data_kelas` has or has not been pre-seeded:
     * When reading: The component queries `data_kelas` first. If table is missing (`isSchemaCacheOrMissingTableError`) or empty, it derives classes from distinct `data_siswa.kelas` (filtering out empty/null/'Lulus'), merged with `wali_kelas.kelas`.
     * When creating a class: The component attempts `insert` into `data_kelas`. If `data_kelas` is not present, it creates the class representation dynamically in memory and makes it available as an allocation target in `data_siswa`.
     * When renaming a class: Cascades to `data_siswa` (`kelas`), `wali_kelas` (`kelas`), and `jadwal_pelajaran` (`kelas`), as well as `data_kelas`.
     * When deleting a class: Strictly blocked if any student is assigned (`studentCount > 0`). If 0 students, deletes from `data_kelas`, `wali_kelas`, and `jadwal_pelajaran`.

3. **UI/UX Workflow Partitioning**:
   - **Level 1: High-level Directory & Executive Stats**
     * Metrics: Total Classes, Total Students Enrolled, Total Unallocated Students.
     * Toolbar: Search class/homeroom, Filter by Tingkat (All, 10, 11, 12), "+ Tambah Kelas Baru" button, and "Naik Kelas" button.
     * Unallocated Banner: If any unassigned students exist, displays an alert banner with a "Tinjau & Alokasikan" button.
     * Class Directory Cards Grid: 1-col on mobile, 2-col on tablet, 3-col on desktop.
   - **Level 2: Centralized Allocation Workspace Drawer / Modal**
     * When an admin clicks "Kelola Siswa" / "Lihat Roster" on a class card, a full slide-over drawer / modal opens for that specific class.
     * Dual Mode / Tabs:
       - **Tab A: Roster Siswa Kelas Ini**: Multi-select table of students currently in this class with a bulk "Pindahkan Siswa" action targeting any other class.
       - **Tab B: + Masukkan Siswa ke Kelas Ini**: Searchable picker listing students currently in other classes or without a class, with quick filtering for "Siswa Tanpa Kelas", allowing batch import into the current class.
   - **Level 3: Quick Unallocated Students Drawer**
     * Direct one-click launcher from header stat chip or warning banner to batch-allocate all students without a class into selected target classes.

---

## 3. Caveats

1. **Database Table Availability**: `data_kelas` may or may not exist in all test environments. The component must implement defensive error handling with `isSchemaCacheOrMissingTableError` and fallback gracefully to `data_siswa.kelas`.
2. **Cascading Rename Scope**: Renaming a class modifies rows in `data_siswa`, `wali_kelas`, and `jadwal_pelajaran`. All update mutations must include `.eq('sekolah_id', user.sekolah_id)` to preserve strict multi-tenant isolation.
3. **Historical Data Preservation**: Existing curriculum classes (`X Merdeka`, `XI Merdeka`, `XII Merdeka`) must not be deleted or corrupted during test executions to preserve invariants in `tests/jadwal_mapel_validity_and_master_integrity.test.ts`.

---

## 4. Conclusion & Component Blueprint

Below is the comprehensive implementation specification for `src/components/AdminKelasView.tsx`.

### 4.1 Component TypeScript Interfaces & Props

```typescript
import { AppUser } from '@/types/user';

export interface AdminKelasViewProps {
  user: AppUser | any;
}

export interface StudentItem {
  id: string;
  nisn: string;
  nama_siswa: string;
  kelas: string | null;
  gender: string; // 'L' | 'P' | 'Laki-laki' | 'Perempuan'
  status: string; // 'Aktif' | 'Lulus' | 'Mutasi' | 'Nonaktif'
  no_hp_ortu?: string | null;
  sekolah_id?: string;
}

export interface WaliKelasItem {
  id?: string;
  kelas: string;
  nama_guru: string;
  nip?: string | null;
  tahun_ajaran?: string | null;
}

export interface ClassDirectoryItem {
  id: string;
  nama_kelas: string;
  tingkat: '10' | '11' | '12' | 'Lainnya';
  jurusan?: string | null;
  wali_kelas?: WaliKelasItem | null;
  totalSiswa: number;
  siswaLaki: number;
  siswaPerempuan: number;
  students: StudentItem[];
  isCustomOnly?: boolean; // true if derived in memory before persist
}

export type TingkatFilter = 'ALL' | '10' | '11' | '12';
```

### 4.2 State Machine Blueprint

```typescript
// --- Primary Data States ---
const [loading, setLoading] = useState<boolean>(true);
const [refreshing, setRefreshing] = useState<boolean>(false);
const [errorMsg, setErrorMsg] = useState<string>('');
const [allStudents, setAllStudents] = useState<StudentItem[]>([]);
const [waliKelasList, setWaliKelasList] = useState<WaliKelasItem[]>([]);
const [dbClasses, setDbClasses] = useState<{ id: string; nama_kelas: string; tingkat?: string; jurusan?: string }[]>([]);

// --- Filters & Search ---
const [searchQuery, setSearchQuery] = useState<string>('');
const [filterTingkat, setFilterTingkat] = useState<TingkatFilter>('ALL');

// --- Centralized Allocation Workspace Drawer ---
const [selectedClassForWorkspace, setSelectedClassForWorkspace] = useState<ClassDirectoryItem | null>(null);
const [workspaceTab, setWorkspaceTab] = useState<'roster' | 'inbound'>('roster');
const [selectedRosterStudentIds, setSelectedRosterStudentIds] = useState<string[]>([]);
const [selectedInboundStudentIds, setSelectedInboundStudentIds] = useState<string[]>([]);
const [targetTransferClass, setTargetTransferClass] = useState<string>('');
const [inboundSourceFilter, setInboundSourceFilter] = useState<'UNASSIGNED' | 'ALL_OTHER' | string>('UNASSIGNED');
const [inboundSearch, setInboundSearch] = useState<string>('');
const [rosterSearch, setRosterSearch] = useState<string>('');

// --- Standalone Unallocated Students Drawer ---
const [isUnassignedDrawerOpen, setIsUnassignedDrawerOpen] = useState<boolean>(false);
const [selectedUnassignedStudentIds, setSelectedUnassignedStudentIds] = useState<string[]>([]);
const [unassignedTargetClass, setUnassignedTargetClass] = useState<string>('');

// --- Naik Kelas Modal Launcher ---
const [isNaikKelasOpen, setIsNaikKelasOpen] = useState<boolean>(false);

// --- Mutation Processing Indicator ---
const [actionLoading, setActionLoading] = useState<boolean>(false);
```

### 4.3 Computed Invariants & Data Aggregation

```typescript
// 1. Unallocated Students
const unassignedStudents = useMemo(() => {
  return allStudents.filter(s => {
    if (s.status === 'Lulus') return false;
    const k = (s.kelas || '').trim();
    return !k || k === '-' || k.toLowerCase() === 'tanpa kelas';
  });
}, [allStudents]);

// 2. Helper to derive Tingkat
const parseTingkat = (nama: string): '10' | '11' | '12' | 'Lainnya' => {
  const n = (nama || '').trim();
  if (/\b(xii|12)\b/i.test(n)) return '12';
  if (/\b(xi|11)\b/i.test(n)) return '11';
  if (/\b(x|10)\b/i.test(n)) return '10';
  return 'Lainnya';
};

// 3. Consolidated Class Directory
const consolidatedClasses = useMemo<ClassDirectoryItem[]>(() => {
  const classMap = new Map<string, ClassDirectoryItem>();

  // Add registered dbClasses
  dbClasses.forEach(c => {
    const name = c.nama_kelas.trim();
    if (!name) return;
    classMap.set(name, {
      id: c.id || name,
      nama_kelas: name,
      tingkat: (c.tingkat as any) || parseTingkat(name),
      jurusan: c.jurusan || null,
      wali_kelas: null,
      totalSiswa: 0,
      siswaLaki: 0,
      siswaPerempuan: 0,
      students: []
    });
  });

  // Aggregate active students
  allStudents.forEach(s => {
    if (s.status === 'Lulus') return;
    const k = (s.kelas || '').trim();
    if (!k || k === '-' || k.toLowerCase() === 'tanpa kelas') return;

    if (!classMap.has(k)) {
      classMap.set(k, {
        id: k,
        nama_kelas: k,
        tingkat: parseTingkat(k),
        jurusan: null,
        wali_kelas: null,
        totalSiswa: 0,
        siswaLaki: 0,
        siswaPerempuan: 0,
        students: []
      });
    }

    const item = classMap.get(k)!;
    item.students.push(s);
    item.totalSiswa++;
    const g = (s.gender || '').toUpperCase();
    if (g.startsWith('L')) {
      item.siswaLaki++;
    } else if (g.startsWith('P')) {
      item.siswaPerempuan++;
    }
  });

  // Attach Wali Kelas
  waliKelasList.forEach(w => {
    const k = (w.kelas || '').trim();
    if (k && classMap.has(k)) {
      classMap.get(k)!.wali_kelas = w;
    }
  });

  // Convert to sorted array
  return Array.from(classMap.values()).sort((a, b) => {
    const weight = (t: string) => (t === '10' ? 1 : t === '11' ? 2 : t === '12' ? 3 : 4);
    if (weight(a.tingkat) !== weight(b.tingkat)) {
      return weight(a.tingkat) - weight(b.tingkat);
    }
    return a.nama_kelas.localeCompare(b.nama_kelas, undefined, { numeric: true });
  });
}, [dbClasses, allStudents, waliKelasList]);

// 4. Filtered Classes
const filteredClasses = useMemo(() => {
  const q = searchQuery.toLowerCase().trim();
  return consolidatedClasses.filter(c => {
    const matchTingkat = filterTingkat === 'ALL' || c.tingkat === filterTingkat;
    const matchSearch =
      !q ||
      c.nama_kelas.toLowerCase().includes(q) ||
      (c.wali_kelas?.nama_guru && c.wali_kelas.nama_guru.toLowerCase().includes(q)) ||
      (c.jurusan && c.jurusan.toLowerCase().includes(q));
    return matchTingkat && matchSearch;
  });
}, [consolidatedClasses, filterTingkat, searchQuery]);

// 5. Executive Statistics
const stats = useMemo(() => {
  const totalClasses = consolidatedClasses.length;
  const totalAllocated = allStudents.filter(s => {
    if (s.status === 'Lulus') return false;
    const k = (s.kelas || '').trim();
    return k && k !== '-' && k.toLowerCase() !== 'tanpa kelas';
  }).length;
  const totalUnassigned = unassignedStudents.length;
  return { totalClasses, totalAllocated, totalUnassigned };
}, [consolidatedClasses, allStudents, unassignedStudents]);
```

### 4.4 Data Operations Specification

1. **Load Data (`loadAllData`)**:
   ```typescript
   const loadAllData = async (isManual = false) => {
     if (isManual) setRefreshing(true);
     else setLoading(true);
     setErrorMsg('');
     try {
       const sId = user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001';

       // 1. Fetch Students
       const { data: sData, error: sErr } = await supabase
         .from('data_siswa')
         .select('id, nisn, nama_siswa, kelas, gender, status, no_hp_ortu, sekolah_id')
         .eq('sekolah_id', sId)
         .order('nama_siswa', { ascending: true });
       if (sErr) throw sErr;
       setAllStudents((sData as StudentItem[]) || []);

       // 2. Fetch Wali Kelas
       const { data: wData } = await supabase
         .from('wali_kelas')
         .select('id, kelas, nama_guru, nip, tahun_ajaran, sekolah_id')
         .eq('sekolah_id', sId);
       setWaliKelasList((wData as WaliKelasItem[]) || []);

       // 3. Fetch data_kelas with graceful schema cache fallback
       try {
         const { data: kData, error: kErr } = await supabase
           .from('data_kelas')
           .select('id, nama_kelas, tingkat, jurusan, sekolah_id')
           .eq('sekolah_id', sId);
         if (!kErr && kData) {
           setDbClasses(kData);
         } else {
           setDbClasses([]);
         }
       } catch {
         setDbClasses([]);
       }
     } catch (err: any) {
       console.error('[AdminKelasView] Error loading data:', err);
       setErrorMsg(err.message || 'Gagal memuat data kelas.');
     } finally {
       setLoading(false);
       setRefreshing(false);
     }
   };
   ```

2. **Add Class (`handleAddClass`)**:
   - Opens SweetAlert2 modal prompting for `nama_kelas`, `tingkat` (10, 11, 12, or Lainnya), and optional `jurusan`.
   - Validates that `nama_kelas` is non-empty and unique.
   - Inserts into `data_kelas` (with fallback if table not yet migrated).
   - Shows success toast and refreshes directory.

3. **Rename Class with Cascading Updates (`handleRenameClass`)**:
   ```typescript
   const handleRenameClass = async (oldName: string) => {
     const { value: newName } = await Swal.fire({
       title: 'Ubah Nama Kelas',
       input: 'text',
       inputValue: oldName,
       inputLabel: 'Masukkan nama kelas baru:',
       showCancelButton: true,
       confirmButtonColor: '#7C3AED',
       inputValidator: (val) => {
         if (!val || !val.trim()) return 'Nama kelas tidak boleh kosong!';
         if (val.trim().toLowerCase() === oldName.toLowerCase()) return 'Nama kelas harus berbeda!';
         return null;
       }
     });

     if (!newName) return;
     setActionLoading(true);
     try {
       const sId = user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001';
       const targetName = newName.trim();

       // 1. Update data_siswa
       await supabase
         .from('data_siswa')
         .update({ kelas: targetName })
         .eq('kelas', oldName)
         .eq('sekolah_id', sId);

       // 2. Update wali_kelas
       await supabase
         .from('wali_kelas')
         .update({ kelas: targetName })
         .eq('kelas', oldName)
         .eq('sekolah_id', sId);

       // 3. Update jadwal_pelajaran
       await supabase
         .from('jadwal_pelajaran')
         .update({ kelas: targetName })
         .eq('kelas', oldName)
         .eq('sekolah_id', sId);

       // 4. Update data_kelas (if present)
       try {
         await supabase
           .from('data_kelas')
           .update({ nama_kelas: targetName })
           .eq('nama_kelas', oldName)
           .eq('sekolah_id', sId);
       } catch {}

       showToast('Berhasil', `Nama kelas berhasil diubah menjadi "${targetName}".`, 'success');
       await loadAllData();
     } catch (err: any) {
       Swal.fire('Gagal', err.message || 'Gagal mengubah nama kelas.', 'error');
     } finally {
       setActionLoading(false);
     }
   };
   ```

4. **Delete Class with Zero-Student Guard (`handleDeleteClass`)**:
   ```typescript
   const handleDeleteClass = async (cls: ClassDirectoryItem) => {
     if (cls.totalSiswa > 0) {
       return Swal.fire({
         icon: 'warning',
         title: 'Kelas Tidak Kosong',
         html: `Kelas <b>${cls.nama_kelas}</b> masih memiliki <b>${cls.totalSiswa} siswa</b>.<br/>Pindahkan seluruh siswa ke kelas lain terlebih dahulu sebelum menghapus kelas ini.`,
         confirmButtonColor: '#7C3AED'
       });
     }

     const confirm = await Swal.fire({
       title: 'Hapus Kelas?',
       text: `Apakah Anda yakin ingin menghapus kelas "${cls.nama_kelas}"?`,
       icon: 'warning',
       showCancelButton: true,
       confirmButtonText: 'Ya, Hapus',
       confirmButtonColor: '#DC2626',
       cancelButtonText: 'Batal'
     });

     if (!confirm.isConfirmed) return;
     setActionLoading(true);
     try {
       const sId = user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001';
       try {
         await supabase.from('data_kelas').delete().eq('nama_kelas', cls.nama_kelas).eq('sekolah_id', sId);
       } catch {}
       await supabase.from('wali_kelas').delete().eq('kelas', cls.nama_kelas).eq('sekolah_id', sId);

       showToast('Berhasil', `Kelas "${cls.nama_kelas}" berhasil dihapus.`, 'success');
       await loadAllData();
     } catch (err: any) {
       Swal.fire('Gagal', err.message || 'Gagal menghapus kelas.', 'error');
     } finally {
       setActionLoading(false);
     }
   };
   ```

5. **Transfer Selected Students Out of Class (`handleTransferStudents`)**:
   ```typescript
   const handleTransferStudents = async (studentIds: string[], targetClass: string) => {
     if (studentIds.length === 0) {
       return showToast('Peringatan', 'Pilih minimal 1 siswa untuk dipindahkan.', 'warning');
     }
     if (!targetClass) {
       return showToast('Peringatan', 'Pilih kelas tujuan pemindahan.', 'warning');
     }

     const confirm = await Swal.fire({
       title: 'Konfirmasi Pemindahan',
       html: `Pindahkan <b>${studentIds.length} siswa</b> ke kelas <b>${targetClass}</b>?`,
       icon: 'question',
       showCancelButton: true,
       confirmButtonText: 'Ya, Pindahkan',
       confirmButtonColor: '#059669',
       cancelButtonText: 'Batal'
     });
     if (!confirm.isConfirmed) return;

     setActionLoading(true);
     try {
       const sId = user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001';
       const { error } = await supabase
         .from('data_siswa')
         .update({ kelas: targetClass })
         .in('id', studentIds)
         .eq('sekolah_id', sId);
       if (error) throw error;

       showToast('Berhasil', `${studentIds.length} siswa berhasil dipindahkan ke kelas ${targetClass}.`, 'success');
       setSelectedRosterStudentIds([]);
       await loadAllData();

       // Update active drawer context if open
       if (selectedClassForWorkspace) {
         const refreshed = consolidatedClasses.find(c => c.nama_kelas === selectedClassForWorkspace.nama_kelas);
         setSelectedClassForWorkspace(refreshed || null);
       }
     } catch (err: any) {
       Swal.fire('Gagal', err.message || 'Gagal memindahkan siswa.', 'error');
     } finally {
       setActionLoading(false);
     }
   };
   ```

6. **Inbound Allocation to Current Class (`handleInboundAllocateStudents`)**:
   ```typescript
   const handleInboundAllocateStudents = async (studentIds: string[], destClass: string) => {
     if (studentIds.length === 0) {
       return showToast('Peringatan', 'Pilih minimal 1 siswa untuk dimasukkan.', 'warning');
     }

     setActionLoading(true);
     try {
       const sId = user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001';
       const { error } = await supabase
         .from('data_siswa')
         .update({ kelas: destClass })
         .in('id', studentIds)
         .eq('sekolah_id', sId);
       if (error) throw error;

       showToast('Berhasil', `${studentIds.length} siswa berhasil dialokasikan ke kelas ${destClass}.`, 'success');
       setSelectedInboundStudentIds([]);
       await loadAllData();

       if (selectedClassForWorkspace) {
         const refreshed = consolidatedClasses.find(c => c.nama_kelas === selectedClassForWorkspace.nama_kelas);
         setSelectedClassForWorkspace(refreshed || null);
       }
     } catch (err: any) {
       Swal.fire('Gagal', err.message || 'Gagal memasukkan siswa.', 'error');
     } finally {
       setActionLoading(false);
     }
   };
   ```

### 4.5 Complete Visual Layout & Wireframe

```
+-------------------------------------------------------------------------------------------------------+
|  [Header & Executive Stats Banner: Purple Gradient, Rounded-2xl, Border-2 border-purple-200]           |
|  [Icon: fa-chalkboard-user]  Manajemen Direktori & Alokasi Kelas Siswa  [Tag: Terpusat]                |
|  Sub menu pengelolaan direktori rombel dan alokasi/penempatan kelas siswa secara terpusat.            |
|  [Button: Tarik / Segarkan Data (fa-arrows-rotate)]                                                   |
|  ---------------------------------------------------------------------------------------------------  |
|  [Chip: Total Kelas (N)]    [Chip: Siswa Teralokasi (N)]    [Chip: Siswa Tanpa Kelas (N)]             |
+-------------------------------------------------------------------------------------------------------+

[IF unassignedStudents.length > 0]
+-------------------------------------------------------------------------------------------------------+
|  [Warning Banner: Amber/Rose-50, Border amber-200, Rounded-2xl]                                       |
|  [Icon: fa-triangle-exclamation] Perhatian: Terdapat N Siswa Belum Memiliki Kelas!                    |
|  Siswa yang belum dialokasikan tidak akan tampil di presensi dan jurnal kelas.                        |
|  [Button: Alokasikan Siswa Tanpa Kelas Sekarang (fa-user-check)]                                      |
+-------------------------------------------------------------------------------------------------------+

+-------------------------------------------------------------------------------------------------------+
|  [Toolbar & Action Controls: Flex wrap, justify-between]                                              |
|  [Search Input: Cari kelas, wali kelas, atau jurusan... (input-premium)]                              |
|  [Filter Tingkat: Semua Tingkat | Tingkat 10/X | Tingkat 11/XI | Tingkat 12/XII]                        |
|  [Button: + Tambah Kelas Baru (Purple bg)]  [Button: Kenaikan Angkatan (Emerald bg, NaikKelasModal)]  |
+-------------------------------------------------------------------------------------------------------+

+-------------------------------------------------------------------------------------------------------+
|  [Grid of Class Directory Cards: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4]               |
|                                                                                                       |
|  +---------------------------------------------+  +---------------------------------------------+     |
|  | [Class Card: X Merdeka]         [Badge: 10] |  | [Class Card: XI Merdeka]        [Badge: 11] |     |
|  | Wali Kelas: Dra. Sri Wahyuni, M.Pd          |  | Wali Kelas: Ahmad Subari, S.Pd              |     |
|  | ------------------------------------------- |  | ------------------------------------------- |     |
|  | Total: 32 Siswa  (L: 15 | P: 17)            |  | Total: 30 Siswa  (L: 14 | P: 16)            |     |
|  | ------------------------------------------- |  | ------------------------------------------- |     |
|  | [Button Primary: Kelola Siswa / Roster]     |  | [Button Primary: Kelola Siswa / Roster]     |     |
|  | [Quick Action: Ubah Nama] [Quick: Hapus]    |  | [Quick Action: Ubah Nama] [Quick: Hapus]    |     |
|  +---------------------------------------------+  +---------------------------------------------+     |
+-------------------------------------------------------------------------------------------------------+

+-------------------------------------------------------------------------------------------------------+
|  [DRAWER / MODAL: Centralized Allocation Workspace for "X Merdeka"]                                   |
|  Header: Kelas X Merdeka  |  Wali: Dra. Sri Wahyuni  |  Total: 32 Siswa (L: 15, P: 17)                |
|  Tabs: [Tab 1: Roster Siswa Kelas Ini (32)]  |  [Tab 2: + Masukkan Siswa ke Kelas Ini]                |
|                                                                                                       |
|  --- TAB 1 (ROSTER) ---                                                                               |
|  [Bulk Bar: [X] Pilih Semua | 3 Siswa Dipilih | Dropdown: Pindah ke [XI Merdeka] | [Button: Pindah] ] |
|  Table:                                                                                               |
|  [X] | No | NISN       | Nama Siswa         | Gender | Status | Aksi                                  |
|  [X] | 1  | 0081234567 | Ahmad Pratama      | L      | Aktif  | [Pindahkan] | [Keluarkan]             |
|  [ ] | 2  | 0081234568 | Annisa Putri       | P      | Aktif  | [Pindahkan] | [Keluarkan]             |
|                                                                                                       |
|  --- TAB 2 (MASUKKAN SISWA) ---                                                                       |
|  Filter: [o] Hanya Siswa Tanpa Kelas (5)  |  [o] Dari Kelas Lain: [Pilih Kelas Asal]                  |
|  Table of Available Students with Checkboxes -> [Button: Masukkan N Siswa Terpilih ke X Merdeka]       |
+-------------------------------------------------------------------------------------------------------+
```

---

## 5. Verification Method

To verify the implementation once coded:

1. **Static Typecheck**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected outcome*: Zero TypeScript diagnostics/errors in `src/components/AdminKelasView.tsx`, `src/components/AdminDataView.tsx`, and `src/lib/navigation.ts`.

2. **RBAC & Master Data Restriction Test**:
   ```bash
   npx ts-node --transpile-only tests/master_data_admin_role_restriction.test.ts
   ```
   *Expected outcome*: All 8 tests pass, confirming Admin access is allowed and non-admin roles are rejected.

3. **Master Class Levels Integrity Test**:
   ```bash
   npx ts-node --transpile-only tests/jadwal_mapel_validity_and_master_integrity.test.ts
   ```
   *Expected outcome*: `data_kelas: master class levels (X Merdeka, XI Merdeka, XII Merdeka) 100% intact and untouched`.

4. **UI Visual Inspection Checklist**:
   - Access `view-admin-data` with tab `Data_Kelas` (`?view=view-admin-data&tab=Data_Kelas` or route `view-admin-kelas`).
   - Confirm Header displays Total Kelas, Total Siswa Teralokasi, and Siswa Tanpa Kelas chips.
   - Click "Kelola Siswa" on a class card -> opens slide-over drawer showing roster with multi-selection.
   - Test "Pindahkan Siswa" to another class and verify instant update in table and card counts.
   - Test "+ Masukkan Siswa" tab to pull unassigned students into the class.
   - Click "Naik Kelas" button to launch `NaikKelasModal` with current students.

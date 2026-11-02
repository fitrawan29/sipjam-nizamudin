# Comprehensive Codebase Analysis: Sistem Blok Schedule Masking & Journal Workflows

## 1. Executive Summary

This investigation explores the codebase of **Sipjam** regarding how the **Sistem Blok** feature is currently implemented, how active block rules are evaluated to mask teaching schedules (`jadwal_pelajaran`), and how teachers fill the block activity journal (`Jurnal Kegiatan`). It formulates the architectural blueprint to support:
1. **Target Types**: Keseluruhan Sekolah, Per Angkatan, Per Kelas, and Per Guru.
2. **Time Ranges**: Specific time ranges (`jam_mulai` to `jam_selesai`) vs. full-day default (`sepanjang hari`).
3. **Targeted Masking & Journaling**: Preserving regular teaching for untargeted/unaffected classes while masking affected schedules and enabling targeted Jurnal Kegiatan workflows.

---

## 2. Codebase Architecture & File Mapping

### Component & File Audit

| File Path | Role in Sistem Blok & Schedule Masking |
|---|---|
| `supabase/migrations/20260927_sistem_blok_schema.sql` | Initial schema for `public.sistem_blok` table. Currently only stores: `id`, `sekolah_id`, `nama_kegiatan`, `deskripsi`, `tanggal_mulai`, `tanggal_selesai`. |
| `src/types/database.ts` | TypeScript database definitions for `sistem_blok` (lines 1411-1450) and `jadwal_pelajaran` (lines 431-483). |
| `src/lib/workflow.ts` | Core workflow logic. Defines `getActiveSistemBlok()` (lines 69-92), `findJadwalForGuru()` (lines 99-130), and `getGuruDailyState()` (lines 200-750) which determines `dailyState.isBlok`, `state.jadwalKBM`, and journal fulfillment requirements. |
| `src/components/SistemBlokView.tsx` | Admin management UI for Sistem Blok (CRUD). Provides form inputs (`namaKegiatan`, `tanggalMulai`, `tanggalSelesai`, `deskripsi`), status determination (`getBlokStatus`), and validation. |
| `src/components/HomeViewGuru.tsx` | Teacher home dashboard. Contains the schedule rendering UI (lines 803-980). If `dailyState?.isBlok` is true, masks all schedules and shows block alert banner; otherwise maps `dailyState.jadwalKBM`. |
| `src/components/HomeViewAdmin.tsx` | Administrator home dashboard. Queries active block today (line 89) and renders the teacher attendance and journal status matrix (lines 380-458). |
| `src/components/GuruJurnal.tsx` | Teacher journal entry interface. Auto-switches between `Jurnal KBM` and `Jurnal Kegiatan` (lines 510-522, 584-612), hides regular KBM fields when filling Jurnal Kegiatan (lines 1323-1631), and submits to `jurnal_pembelajaran`. |
| `src/lib/attendanceAlpa.ts` | Automated cron / attendance evaluation for Alpa. Lines 274-280, 422-426, 1073. Exempt teachers without teaching duty are excused if a block is active. |
| `src/app/api/push/send-reminders/route.ts` | Web push notification cron. Lines 168-178, 266-286. Sends "Pengingat Jurnal Kegiatan (Sistem Blok)" if active block exists. |
| `src/components/TeacherReminderManager.tsx` | In-app teacher reminder toasts. Lines 277-288. Reminds teachers to complete Jurnal Kegiatan during blocks. |
| `src/lib/warningSystem.ts` | Disciplinary warning system. Lines 524-529. Credits Jurnal Kegiatan so teachers aren't falsely flagged for missing journals during blocks. |
| `tests/sistem_blok_verification.test.ts` | Comprehensive test suite (85 tests currently passing). Validates CRUD, schedule masking, journal workflows, and edge cases. |

> **Note on `JadwalView.tsx`**: A standalone file named `src/components/JadwalView.tsx` **does not exist** in this repository. Schedule items are displayed on the Teacher Dashboard (`HomeViewGuru.tsx`), monitored on the Admin Matrix (`HomeViewAdmin.tsx`), managed in Master Data (`AdminDataView.tsx` with tab `Jadwal_Pelajaran`), and selected for journal input in `GuruJurnal.tsx`.

---

## 3. Current Implementation of Schedule Checking & Masking

### 3.1 How active blok rules are currently fetched
In `src/lib/workflow.ts` (lines 69-92):
```typescript
export async function getActiveSistemBlok(dateStr?: string, sekolahId?: string): Promise<any | null> {
  try {
    const rawDate = dateStr || getWitaDateStr();
    const targetDate = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate.trim();
    let query = supabase
      .from('sistem_blok')
      .select('*')
      .lte('tanggal_mulai', targetDate)
      .gte('tanggal_selesai', targetDate);

    if (sekolahId) {
      query = query.eq('sekolah_id', sekolahId);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error || !data || data.length === 0) return null;
    return data[0]; // Returns only the first matching record
  } catch (err) {
    console.warn('Error fetching active sistem_blok:', err);
    return null;
  }
}
```

### 3.2 Current evaluation mechanism
1. **School-Wide All-or-Nothing**: In `getGuruDailyState()` (`src/lib/workflow.ts` lines 244-256):
   If `getActiveSistemBlok(todayStr, sekolahId)` returns an entity, `state.isBlok` is set to `true`.
2. **Schedule Masking**: In `HomeViewGuru.tsx` (lines 803-927):
   If `dailyState?.isBlok === true`, the **entire schedule list is suppressed/hidden**, replaced by a banner:
   *"Sistem Blok Aktif - KBM Reguler Ditiadakan"*.
   Regular schedules (`dailyState.jadwalKBM.map(...)`) are only rendered if `!dailyState?.isBlok`.
3. **What is NOT evaluated currently**:
   - Individual schedule items are **never tested** against the block rule.
   - Target scope (classes, grades, teachers) is **not supported** (it assumes the entire school).
   - Time ranges are **not supported** (it assumes full day 00:00 - 23:59).

---

## 4. Analysis of Required Enhancements

### 4.1 Target Types Evaluation

The system must support 4 target scopes per rule:

| Target Type (`tipe_target`) | Target Identifier (`target_id`) | Matching Logic against Schedule Item (`s`) |
|---|---|---|
| **Keseluruhan Sekolah** (`'keseluruhan'` or `'sekolah'`) | `null` or `'sekolah'` | Matches **all** schedules for all classes and teachers in the school. |
| **Per Angkatan** (`'angkatan'`) | Grade Level string (e.g. `'10'`, `'11'`, `'12'` or `'X'`, `'XI'`, `'XII'`) | Matches if `s.kelas` belongs to the specified grade level. |
| **Per Kelas** (`'kelas'`) | Class name/ID (e.g. `'X Merdeka'`, `'XII TKJ 1'`) | Matches if `s.kelas.toLowerCase().trim() === target_id.toLowerCase().trim()`. |
| **Per Guru** (`'guru'`) | Teacher `user_id` or `nama_guru` | Matches if `s.user_id === target_id` OR `isTeacherMatch(target_id, s.nama_guru)`. |

#### Parsing & Matching "Angkatan" (Grade Level)
In Indonesian school structures (and existing codebase patterns in `NaikKelasModal.tsx` and `HomeViewGuru.tsx`):
- High schools (SMA/SMK): X / 10, XI / 11, XII / 12
- Middle schools (SMP): VII / 7, VIII / 8, IX / 9
- Elementary (SD): I / 1 through VI / 6

To match a class `s.kelas` (e.g., `"X Merdeka"`, `"X.1"`, `"XI RPL 2"`, `"12-A"`) against an angkatan target:
```typescript
export function isKelasInAngkatan(kelas: string | null | undefined, angkatan: string): boolean {
  if (!kelas || !angkatan) return false;
  const k = kelas.trim().toLowerCase();
  const a = angkatan.trim().toLowerCase();

  // If exact match
  if (k === a) return true;

  // Grade mapping table (Roman <-> Arabic)
  const gradeEquivalents: Record<string, string[]> = {
    '10': ['10', 'x'],
    'x': ['10', 'x'],
    '11': ['11', 'xi'],
    'xi': ['11', 'xi'],
    '12': ['12', 'xii'],
    'xii': ['12', 'xii'],
    '7': ['7', 'vii'],
    'vii': ['7', 'vii'],
    '8': ['8', 'viii'],
    'viii': ['8', 'viii'],
    '9': ['9', 'ix'],
    'ix': ['9', 'ix'],
  };

  const tokens = gradeEquivalents[a] || [a];
  return tokens.some(token => {
    // Regex matches e.g. "X ", "X.", "X-", "Kelas X", "10-1", etc.
    const regex = new RegExp(`(^|\\b|\\s|_|-)${token}(\\b|\\s|\\.|_|-|$)`, 'i');
    return regex.test(k);
  });
}
```

---

### 4.2 Time Range Evaluation

#### Database representation
- `jam_mulai` (TEXT or TIME, NULL): e.g. `'07:30'`
- `jam_selesai` (TEXT or TIME, NULL): e.g. `'11:00'`

#### Rule Semantics:
1. **Full Day (Default)**:
   If `!rule.jam_mulai && !rule.jam_selesai`, the block rule applies to the **entire day** (00:00 to 23:59).
2. **Specific Time Range**:
   If `rule.jam_mulai` and/or `rule.jam_selesai` are specified, only schedule items whose lesson period overlaps with `[jam_mulai, jam_selesai]` are blocked.

#### Schedule Period Overlap Logic:
In `jadwal_pelajaran`:
- `jam_mulai`: e.g. `'07:30'`, `'07.30'`, or null
- `jam_selesai`: e.g. `'09:00'`, `'09.00'`, or null

```typescript
function parseTimeToMinutes(t?: string | null, fallbackMinutes = 0): number {
  if (!t) return fallbackMinutes;
  const clean = t.replace('.', ':').trim();
  const parts = clean.split(':').map(Number);
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  return fallbackMinutes;
}

export function isTimeRangeOverlap(
  schedStart?: string | null,
  schedEnd?: string | null,
  blokStart?: string | null,
  blokEnd?: string | null
): boolean {
  // If block has no time limit -> full day -> always overlaps
  if (!blokStart && !blokEnd) return true;

  const bStartMin = parseTimeToMinutes(blokStart, 0); // default 00:00
  const bEndMin = parseTimeToMinutes(blokEnd, 24 * 60); // default 23:59

  // If schedule has no times specified, treat as overlapping with active block
  if (!schedStart && !schedEnd) return true;

  const sStartMin = parseTimeToMinutes(schedStart, bStartMin);
  const sEndMin = parseTimeToMinutes(schedEnd, sStartMin + 90); // default 90 min lesson

  // Two intervals [sStart, sEnd] and [bStart, bEnd] overlap iff:
  return sStartMin < bEndMin && sEndMin > bStartMin;
}
```

---

### 4.3 Schedule Masking: Granular Schedule Matching

Instead of a single boolean `dailyState.isBlok`, each schedule item in `dailyState.jadwalKBM` should be evaluated against all active block rules for the day:

```typescript
export function evaluateScheduleBlock(
  schedule: any,
  teacher: { id?: string; user_id?: string; nama_guru?: string },
  activeBloks: SistemBlok[]
): { isBlocked: boolean; blokRule?: SistemBlok } {
  for (const rule of activeBloks) {
    // 1. Target Match Check
    let targetMatches = false;
    const targetType = (rule.tipe_target || 'keseluruhan').toLowerCase();

    if (targetType === 'keseluruhan' || targetType === 'sekolah') {
      targetMatches = true;
    } else if (targetType === 'angkatan') {
      targetMatches = isKelasInAngkatan(schedule.kelas, rule.target_id || '');
    } else if (targetType === 'kelas') {
      const targetKelas = (rule.target_id || '').trim().toLowerCase();
      const schedKelas = (schedule.kelas || '').trim().toLowerCase();
      targetMatches = schedKelas === targetKelas;
    } else if (targetType === 'guru') {
      const targetGuru = (rule.target_id || '').trim().toLowerCase();
      const schedUserId = String(schedule.user_id || '').toLowerCase();
      const schedGuruName = (schedule.nama_guru || '').toLowerCase();
      const teacherUserId = String(teacher.user_id || teacher.id || '').toLowerCase();
      const teacherName = (teacher.nama_guru || '').toLowerCase();

      targetMatches =
        schedUserId === targetGuru ||
        teacherUserId === targetGuru ||
        schedGuruName.includes(targetGuru) ||
        targetGuru.includes(schedGuruName) ||
        teacherName.includes(targetGuru) ||
        targetGuru.includes(teacherName);
    }

    if (!targetMatches) continue;

    // 2. Time Range Overlap Check
    const timeOverlaps = isTimeRangeOverlap(
      schedule.jam_mulai,
      schedule.jam_selesai,
      rule.jam_mulai,
      rule.jam_selesai
    );

    if (timeOverlaps) {
      return { isBlocked: true, blokRule: rule };
    }
  }

  return { isBlocked: false };
}
```

### 4.4 Visual Masking on Teacher Dashboard (`HomeViewGuru.tsx`)

In `HomeViewGuru.tsx`:
1. **If ALL teacher's schedules are blocked** (or teacher is blocked full day):
   - Render the existing full block banner (`dailyState.isBlok === true`).
2. **If only SOME schedules are blocked**:
   - The regular schedule grid is displayed.
   - For blocked items:
     - Badge: `<span className="bg-amber-100 text-amber-800 ..."><i className="fa-solid fa-layer-group"></i> Sistem Blok: {rule.nama_kegiatan}</span>`
     - Action button: Instead of "Isi Jurnal KBM", displays "Isi Jurnal Kegiatan" (or "Jurnal Kegiatan Selesai ✓" if `dailyState.jurnalKegiatan` exists).
     - Card styling has an amber accent indicating it is masked as a block activity.
   - For unblocked items:
     - Displays standard KBM badge, mapel, class, and "Isi Jurnal KBM" button.

---

### 4.5 Guru Jurnal Workflow (`GuruJurnal.tsx`)

In `src/components/GuruJurnal.tsx`:
1. **Tipe Jurnal Selection**:
   - Currently, `tipeJurnal` is disabled whenever `dailyState.isBlok` is true.
   - If a teacher has **both** regular KBM and blocked periods, `tipeJurnal` should allow the teacher to choose between `Jurnal KBM` (for unblocked regular classes) and `Jurnal Kegiatan` (for the blocked activity).
   - If the teacher is affected by a block, pre-fill `materi` with `activeBlok.nama_kegiatan`.
2. **Form Input Fields**:
   - When `tipeJurnal === 'Jurnal Kegiatan'`:
     - Regular KBM fields (Mata Pelajaran, Kelas, Pertemuan Ke-, KKTP, Konten, Absensi Murid, Lokasi KBM) are excluded.
     - Only displays: `tanggal`, `materi` (Nama Kegiatan), `kegiatan` (Uraian Kegiatan), and `file` (Foto Dokumentasi).
   - When `tipeJurnal === 'Jurnal KBM'`:
     - Only unblocked classes are listed in the Mapel / Kelas selection.
3. **Checkout Fulfillment (`canPresensiPulang`) in `workflow.ts`**:
   - A teacher satisfies the journal requirement if:
     - All unblocked schedules have matching `jurnalKBM`.
     - At least 1 `jurnalKegiatan` is submitted for the blocked schedule(s).
     - If all schedules are blocked, 1 `jurnalKegiatan` satisfies checkout completely.

---

### 4.6 Admin UI (`SistemBlokView.tsx`)

In `src/components/SistemBlokView.tsx`:
Add inputs to create and edit block periods:
1. **Tipe Target Selector**:
   `<select value={tipeTarget} onChange={...}>`
   - `Keseluruhan Sekolah` (`'keseluruhan'`)
   - `Per Angkatan` (`'angkatan'`)
   - `Per Kelas` (`'kelas'`)
   - `Per Guru` (`'guru'`)
2. **Dynamic Target Input**:
   - If `tipe_target === 'angkatan'`: Dropdown with options: `'X'`, `'XI'`, `'XII'` (or `'10'`, `'11'`, `'12'`, `'VII'`, `'VIII'`, `'IX'`, etc.).
   - If `tipe_target === 'kelas'`: Dropdown populated from distinct classes in `jadwal_pelajaran` / `data_siswa`.
   - If `tipe_target === 'guru'`: Dropdown populated from `data_guru`.
3. **Rentang Jam (Opsional)**:
   - `jamMulai` (`type="time"`): e.g. "07:30"
   - `jamSelesai` (`type="time"`): e.g. "11:00"
   - Helper text: *"Biarkan kosong jika berlaku penuh sepanjang hari (default)."*
4. **Card / List display**:
   - Displays Target Badge: e.g. `[Semua Sekolah]`, `[Angkatan XII]`, `[Kelas X Merdeka]`, `[Guru: Ade]`.
   - Displays Time Badge: e.g. `Sepanjang Hari` or `07:30 - 11:00 WITA`.

---

## 5. Proposed Database Migration

File: `supabase/migrations/20261102_sistem_blok_target_and_time.sql`
```sql
-- Migration: Add target type, target id, and time range columns to sistem_blok
-- Date: 2026-11-02

ALTER TABLE public.sistem_blok
  ADD COLUMN IF NOT EXISTS tipe_target TEXT NOT NULL DEFAULT 'keseluruhan',
  ADD COLUMN IF NOT EXISTS target_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS jam_mulai TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS jam_selesai TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_sistem_blok_target ON public.sistem_blok(tipe_target, target_id);
```

---

## 6. Verification and Test Suite Strategy

In `tests/sistem_blok_verification.test.ts`:
Expand the test suite to verify:
1. **Target Types CRUD**:
   - Insert and retrieve block with `tipe_target = 'keseluruhan'`
   - Insert and retrieve block with `tipe_target = 'angkatan'`, `target_id = 'X'`
   - Insert and retrieve block with `tipe_target = 'kelas'`, `target_id = 'X Merdeka'`
   - Insert and retrieve block with `tipe_target = 'guru'`, `target_id = 'd23141e4-...'`
2. **Time Ranges CRUD**:
   - Insert and retrieve block with specific `jam_mulai = '07:30'` and `jam_selesai = '10:00'`
   - Insert and retrieve block with `null` time (full-day default)
3. **Schedule Masking Logic Verification**:
   - Schedule in Class X is masked when Angkatan X is blocked; Class XI schedule is NOT masked.
   - Schedule in Class X Merdeka is masked when Class X Merdeka is blocked; Class XI Merdeka is NOT masked.
   - Schedule for Teacher A is masked when Teacher A is blocked; Teacher B is NOT masked.
   - Schedule from 07:30 - 09:00 is masked when block is 07:00 - 10:00.
   - Schedule from 11:00 - 12:30 is NOT masked when block is 07:00 - 10:00.
4. **All 85 existing tests + new scenario tests must pass (0 failed)**.

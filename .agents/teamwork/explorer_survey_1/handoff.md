# Handoff Report: Requirement R1 (UI & State Modul Piket) Investigation

**Investigator**: `explorer_survey_1`  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_1`  
**Target Component**: `src/components/PiketView.tsx` & `src/components/AppScreen.tsx`  
**Timestamp**: 2026-10-05T10:05:00Z  

---

## 1. Observation

### Observation 1.1: Root Cause of "Tandai Datang" Auto-Filtering Down to 1 Student
In `src/components/PiketView.tsx`:
1. The student roster table in the "Presensi Siswa (QR & Manual)" tab renders `filteredManualStudents` (lines 2089-2196):
   ```tsx
   // src/components/PiketView.tsx:2099
   filteredManualStudents.map((s, idx) => { ... })
   ```
2. `filteredManualStudents` is computed at lines 773–780:
   ```tsx
   // src/components/PiketView.tsx:773-780
   const filteredManualStudents = allStudents.filter(s => {
     const matchKelas = manualKelasFilter === 'Semua' || s.kelas === manualKelasFilter;
     const matchSearch = !manualSearchQuery.trim() || 
       (s.nama_siswa?.toLowerCase() || '').includes(manualSearchQuery.toLowerCase()) ||
       (s.nisn?.toLowerCase() || '').includes(manualSearchQuery.toLowerCase()) ||
       ((s as any).qr_code?.toLowerCase() || '').includes(manualSearchQuery.toLowerCase());
     return matchKelas && matchSearch;
   });
   ```
3. Each row contains action buttons to mark attendance:
   - "Tandai Datang" at line 2150:
     ```tsx
     // src/components/PiketView.tsx:2150
     onClick={() => handleManualMark(s, 'datang')}
     ```
   - "Tandai Pulang" at line 2182:
     ```tsx
     // src/components/PiketView.tsx:2182
     onClick={() => handleManualMark(s, 'pulang')}
     ```
4. Inside `handleManualMark` (lines 545–665), upon successfully saving attendance or detecting existing attendance:
   ```tsx
   // src/components/PiketView.tsx:590-594 (Success branch)
   // Two-way sync: fill QR scanner input and manual search input
   setUsbInputVal(student.nisn || student.nama_siswa);
   setManualSearchQuery(student.nama_siswa);
   setManualKelasFilter('Semua');

   // src/components/PiketView.tsx:616-619 (Already exists branch)
   setUsbInputVal(student.nisn || student.nama_siswa);
   setManualSearchQuery(student.nama_siswa);
   setManualKelasFilter('Semua');
   ```
5. When `setManualSearchQuery(student.nama_siswa)` is called:
   - State `manualSearchQuery` is populated with the marked student's name (e.g., `"Ahmad Dani"`).
   - Re-render occurs immediately.
   - `filteredManualStudents` checks `s.nama_siswa.toLowerCase().includes("ahmad dani")`.
   - Every other student fails the filter check and disappears from the table.
   - In addition, `setManualKelasFilter('Semua')` wipes out any class filter the teacher had previously selected (e.g., "7A" resets to "Semua").

---

### Observation 1.2: Current Role Passing & Evaluation in `AppScreen` and `PiketView`
1. In `src/components/AppScreen.tsx`:
   - Role evaluation on lines 60–61:
     ```tsx
     // src/components/AppScreen.tsx:60-61
     const isSuperadmin = (user?.role || '').toLowerCase().replace(/\s+/g, '') === 'superadmin';
     const isAdmin = isSuperadmin || (user?.role || '').toLowerCase() === 'admin';
     ```
   - Component rendering at lines 716–719:
     ```tsx
     // src/components/AppScreen.tsx:716-719
     {currentView === 'view-piket' && (
       isAdmin || isSuperadmin || isPiketHariIni ? (
         <PiketView user={user} />
       ) : ( ... )
     )}
     ```
2. In `src/components/PiketView.tsx`:
   - Props and role evaluation on lines 26 and lines 1356–1357:
     ```tsx
     // src/components/PiketView.tsx:26
     export default function PiketView({ user }: { user: any })

     // src/components/PiketView.tsx:1356-1357
     const isGuru = user?.role === 'Guru';
     const isAdmin = user?.role === 'Admin';
     ```
   - Discrepancy observed: `PiketView.tsx` uses strict case-sensitive checks (`'Admin'`, `'Guru'`), ignoring `'superadmin'` or `'admin'`, whereas `AppScreen.tsx` treats `'superadmin'` and lowercase `'admin'` as admin.

---

### Observation 1.3: Current UI Elements & Controls in `PiketView.tsx`
Currently, `PiketView.tsx` renders identical, heavy interfaces for both Guru and Admin under the `scan` tab (lines 1622–2349):
1. **Kiosk Header Bar** (lines 1625–1663):
   - Kiosk Station Selector: Dropdown with 10 options (`kiosk-1` through `kiosk-10`).
   - Live pulse indicator.
2. **Attendance Mode Switcher** (lines 1666–1715):
   - Two large full-width banner buttons ("PRESENSI DATANG" vs "PRESENSI PULANG").
3. **Scanner Station & Visual Feedback Card** (lines 1718–1960):
   - Left column: USB HID scanner input + Browser Camera video preview with targeting reticle and camera toggle.
   - Right column: Large student feedback card with avatar, NISN, class, gender, status badge, time, and cancel button.
4. **Presensi Manual & Student Roster Section** (lines 1962–2202):
   - "Sinkronisasi Dua Arah Aktif" badge.
   - Class filter dropdown ("Semua Kelas", etc.).
   - Search input field + "Proses Presensi" button.
   - Full student table with 6 columns: `No`, `Nama Siswa`, `NISN`, `Kelas`, `Presensi Datang` (button/badge), `Presensi Pulang` (button/badge).
5. **Real-Time Stat Cards** (lines 2204–2241):
   - 3 large metric cards: `Total Hadir Datang`, `Total Pulang`, `Total Unik Siswa`.
6. **Live Attendance Audit Log Table** (lines 2243–2349):
   - Duplicate class filter + search input.
   - 7 columns: `No`, `Waktu` (HH:MM:SS), `Nama Siswa`, `Kelas`, `NISN`, `Status`, `Kios` (`device_id`).

---

## 2. Logic Chain

1. **Step 1 (Root Cause of Auto-Filter)**:
   - When a user clicks "Tandai Datang" (or "Tandai Pulang") on any student in the roster table, the click handler calls `handleManualMark(s, 'datang')` (Obs 1.1, item 3).
   - In previous commit/update (2026-10-05T02:19:36Z), requirement R1 requested two-way synchronization between manual and QR input. The developer added lines 591–593 (`setUsbInputVal`, `setManualSearchQuery`, `setManualKelasFilter`).
   - Line 592 calls `setManualSearchQuery(student.nama_siswa)`.
   - Because `filteredManualStudents` (Obs 1.1, item 2) filters by `manualSearchQuery`, this state update immediately filters the displayed student array to only items where `nama_siswa` contains that specific student's name.
   - Consequently, the UI updates to show only that 1 student. All other students are filtered out until the user manually deletes the text in `manualSearchQuery`.
   - **Deduction**: Removing `setManualSearchQuery(student.nama_siswa)` and `setManualKelasFilter('Semua')` from `handleManualMark` preserves the active filter and keeps the full student list visible after marking attendance.

2. **Step 2 (Role Detection Logic)**:
   - In `AppScreen.tsx`, role comparison is case-insensitive and treats `superadmin` as `isAdmin` (Obs 1.2, item 1).
   - In `PiketView.tsx`, lines 1356–1357 perform strict checks: `user?.role === 'Admin'` and `user?.role === 'Guru'`.
   - If a Superadmin enters `PiketView`, `isAdmin` is false, which incorrectly locks out Admin features.
   - **Deduction**: `PiketView.tsx` must normalize `user?.role`:
     ```tsx
     const roleNormalized = (user?.role || '').toLowerCase().replace(/\s+/g, '');
     const isAdmin = roleNormalized === 'admin' || roleNormalized === 'superadmin';
     const isGuru = roleNormalized === 'guru';
     ```

3. **Step 3 (Guru vs Admin UI Distinction)**:
   - **Guru Persona**: A teacher on picket duty operates on mobile or tablet at school gates or hallways. They need high speed, minimal vertical scrolling, large touch buttons, and simple attendance marking. They do NOT need multi-kiosk device selection (10 kiosks), hardware device debugging, or administrative 7-column audit log tables.
   - **Admin Persona**: An administrator in the office needs comprehensive oversight: multi-kiosk device routing, real-time aggregate statistics, full metadata (NISN, gender, timestamp down to the second), manual overrides (canceling/editing attendance logs), and picket schedule management (`Penugasan Piket`).
   - **Deduction**: The `scan` and `beranda` tabs must render distinct UI layouts conditioned on `isAdmin`:
     - **Guru (Compact / Ringkas)**:
       - Hide the Kiosk Station selector (default to `kiosk-default`).
       - Compact Mode Switch: Segmented pill toggle (`[Datang | Pulang]`).
       - Compact Scanner Card: Toggleable camera/scanner without overwhelming two-column layout.
       - Compact Roster: Class selector pills + quick search + streamlined student cards/rows with 1-tap attendance marking and instant status indicators.
       - Inline counter badge (e.g. `Hadir: 142 • Pulang: 12`) instead of 3 large standalone cards.
       - Hide the duplicate 7-column `Live Attendance Log Table`.
     - **Admin (Detail / Comprehensive)**:
       - Retain Kiosk Station dropdown (Kiosk 1–10) with live connection status.
       - Retain Full Two-Column Kiosk layout (USB Scanner + Camera Scanner + Detailed Student Feedback Card).
       - Comprehensive Roster Table with all columns, manual overrides, and cancellation buttons.
       - 3 Large Stat Cards (`Total Datang`, `Total Pulang`, `Total Unik`).
       - Full 7-column Live Attendance Audit Log Table with search and class filters.
       - Full access to `Penugasan Piket` tab for teacher/student scheduling.

---

## 3. Caveats

1. **Camera Scanner State**: This report focuses on UI & State for Requirement R1. The camera initialization failure (Requirement R2) is investigated separately, but ensuring the compact view for Guru maintains clean video element mounting is critical.
2. **Offline LocalStorage**: Recent commits introduced offline queueing for Presensi Guru. Presensi Siswa (`recordPresensiSiswa`) currently interacts directly with Supabase via `qrSiswa.ts`. No schema changes are required for R1.
3. **No Caveats on Root Cause**: The root cause of the "Tandai Datang" auto-filter bug is 100% verified and reproducible via code tracing at lines 592 and 617 of `src/components/PiketView.tsx`.

---

## 4. Conclusion & Concrete Recommendations

### 4.1 Fix for "Tandai Datang" Auto-Filtering (Requirement R1.1)

In `src/components/PiketView.tsx`, edit `handleManualMark`:

```tsx
// BEFORE (Lines 590-595):
showToast('Berhasil', res.message, 'success');
playAudioFeedback('success');
setLastScanResult({ ... });

// Two-way sync: fill QR scanner input and manual search input
setUsbInputVal(student.nisn || student.nama_siswa);
setManualSearchQuery(student.nama_siswa); // <-- BUG: filters table to 1 student!
setManualKelasFilter('Semua');            // <-- BUG: resets active class filter!

await fetchTodayScanData();

// AFTER:
showToast('Berhasil', res.message, 'success');
playAudioFeedback('success');
setLastScanResult({ ... });

// Two-way sync: Update USB input and feedback card, but DO NOT overwrite manual search or class filter
setUsbInputVal(student.nisn || student.nama_siswa);
// Do NOT call setManualSearchQuery here!
// Do NOT call setManualKelasFilter here!

await fetchTodayScanData();
```

Apply the identical change to the `res.alreadyExists` branch (lines 616–619):
```tsx
// BEFORE:
setUsbInputVal(student.nisn || student.nama_siswa);
setManualSearchQuery(student.nama_siswa);
setManualKelasFilter('Semua');

// AFTER:
setUsbInputVal(student.nisn || student.nama_siswa);
// Remove setManualSearchQuery and setManualKelasFilter
```

---

### 4.2 Role Normalization (Requirement R1.2)

In `src/components/PiketView.tsx`, update role calculation:

```tsx
// BEFORE (Lines 1356-1357):
const isGuru = user?.role === 'Guru';
const isAdmin = user?.role === 'Admin';

// AFTER:
const roleNormalized = (user?.role || '').toLowerCase().replace(/\s+/g, '');
const isAdmin = roleNormalized === 'admin' || roleNormalized === 'superadmin';
const isGuru = roleNormalized === 'guru';
```

---

### 4.3 UI Differentiation Specification (Requirement R1.2)

| Feature / UI Element | Guru Role (Ringkas / Compact) | Admin Role (Detail / Comprehensive) |
|---|---|---|
| **Header Badge** | `Petugas Piket Hari Ini` | `Administrator Sistem Piket` |
| **Kiosk Device Selector** | Hidden (defaults to `'kiosk-guru'` or `'kiosk-1'`) | Visible (Kios 1–10 dropdown + live ping) |
| **Attendance Mode Selector** | Compact pill button (`Datang` / `Pulang`) | Large dual banner cards with descriptive text |
| **Scanner Interface** | Compact collapsible card (Camera / Barcode toggle) | Full side-by-side Kiosk station (USB input + Camera stream) |
| **Feedback Card** | Toast + compact top banner notification | Persistent high-detail student card (photo, NISN, class, time) |
| **Stat Summary** | Compact badge row (`Hadir: X • Pulang: Y`) | 3 full-width metric dashboard cards |
| **Student Roster** | Fast touch-friendly list/compact table: Name, Class, 1-tap "Datang" / "Pulang" button with live time stamp | Comprehensive 6-column table with gender, NISN, cancel action buttons |
| **Audit Log Table** | **Hidden** (reduces mobile scroll clutter) | **Visible** (Full 7-column log: time, student, class, NISN, status, kiosk ID) |
| **Tabs Available** | Beranda, Presensi Siswa, Isi Laporan, Rekap | Beranda, Presensi Siswa, Penugasan Piket, Rekap |

---

## 5. Verification Method

1. **Automated / Build Verification**:
   - Run TypeScript check: `npx tsc --noEmit`
   - Run Next.js build: `npm run build`
2. **Interactive Manual Test**:
   - Log in as Guru with picket duty.
   - Navigate to **Modul Piket** -> Tab **Presensi Siswa**.
   - Select a specific class (e.g., "7A") with multiple students visible in the roster table.
   - Click **Tandai Datang** on the first student.
   - **Verification Pass Condition**:
     - The first student's status immediately updates to `Datang [HH:MM]`.
     - **All other students in the class remain visible in the table** (the roster DOES NOT collapse to 1 student).
     - The class filter remains "7A" (does not reset).
   - Log in as Admin:
     - Verify Kiosk selector (1–10), 3 metric cards, and 7-column Live Attendance Audit Log are fully visible.
     - Verify `Penugasan Piket` tab is accessible.

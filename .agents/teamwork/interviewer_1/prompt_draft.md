This project implements 13 requested improvements for the teacher portal in the sipjam-app, focusing on automated attendance, improved photo/document upload functionality, refined UI for jurnals, and streamlined management of teaching devices. The team will utilize writing-plans, caveman, and cavecrew as requested.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development
[OPEN: Are there any restrictions on the implementation? (Default: Development mode, no restrictions)]

## Requirements

### R1. Presensi and Automated Attendance
Implement logic for presensi pulang (sakit/izin/dinas luar) and automated attendance status calculations (alpa/pulang cepat) based on admin-defined time limits. [OPEN: Should the team work on these in the order provided, or do you have a specific priority?]

### R2. Media Reliability
Resolve "Upload dokumen tertunda" and ERR_FILE_NOT_FOUND issues affecting documentation photos and preview functionality.

### R3. UI/UX Optimization
Consolidate presensi datang/pulang into a single card, remove redundant sidebar items (cetak jurnal), and freeze columns NISN/Nama Siswa in the gradebook.

### R4. Perangkat Pembelajaran
Simplify upload requirements by deduplicating parallel class entries and adjusting labeling conventions ([nama mapel] - [tingkatan]).

### R5. Jurnal KBM Management
Simplify forms by removing "Nomor (Pertemuan ke-)" and enable editing sessions without journals.

## Acceptance Criteria

### Attendance and Jurnal Logic
- [ ] Automated status (alpa/pulang cepat) correctly applies when time thresholds are exceeded.
- [ ] Presensi pulang includes conditions for sakit, izin, and dinas luar.

### Photo and Document Reliability
- [ ] Document photos upload immediately.
- [ ] Previously inaccessible files are now viewable.

### UI and UX
- [ ] Attendance records are shown in a single card.
- [ ] Gradebook columns NISN/Nama Siswa remain fixed during scrolling.
- [ ] "Cetak jurnal" menu is removed.

### Teaching Device and Journal Management
- [ ] Parallel classes for perangkat pembelajaran are consolidated.
- [ ] Labels follow the `[nama mapel] - [tingkatan]` pattern.
- [ ] "Nomor (Pertemuan ke-)" form is removed.
- [ ] Sessions without journals are editable.

## Verification Resources
[OPEN: Do you have existing test suites, a staging environment, or specific criteria you use to verify attendance and jurnal KBM changes?]

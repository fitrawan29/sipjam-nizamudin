# Task Assignment: explorer_o25_2

## Objective
Investigate the Sidebar and Operational Menus restoration for Superadmin (Requirement R2).

## Scope & Instructions
1. Read `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md` to understand user intent.
2. Inspect `src/components/ClaySidebar.tsx` and any previous sidebar implementations (via git log / diffs).
3. Identify how the original SIPJAM sidebar was structured for Superadmin:
   - Header portal "Portal Superadmin" with crown icon.
   - User identity card (avatar, name, role badge Superadmin).
   - Dropdown switcher sekolah satelit inside the sidebar.
   - Full navigation menu:
     - `Ringkasan Platform` (`view-superadmin-overview`)
     - `Jaringan Sekolah` (`view-superadmin-jaringan`)
     - `Akun Dinas Pendidikan` (`view-superadmin-dinas`)
     - Full operational menus when target school is selected: Master Data, Verifikasi, Rekap Presensi, Presensi Siswa, Analitik Satelit, and Sistem Satelit.
   - Action buttons: Pengaturan Akun (`AccountSettingsModal`), Panduan & Tutorial Lengkap (`TutorialModal`), and Interactive Tutorial.
4. Output a comprehensive report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o25_2\handoff.md`.

# Project: SIPJAM Milestone 9 Enhancements

## Architecture
SIPJAM is a Next.js (App Router) + Supabase application with multi-tenant RLS, role-based access (Superadmin, Admin, Guru, Wali Kelas), PWA push notifications, and client-side camera/watermark processing.

### Modules & Boundaries
1. **Database & Types Layer (`supabase/migrations/`, `src/types/database.ts`)**:
   - Multi-tenant tables with `sekolah_id` and RLS.
   - Realtime publication `supabase_realtime` for instant updates.
2. **Academic & Assessment Layer (`src/components/GradebookView.tsx`, `src/components/RekapJurnalView.tsx`, `src/components/AppScreen.tsx`)**:
   - Academic Year synchronization from `pengaturan`.
   - Admin view-only lock for Gradebook with only 'Cetak' button.
   - Teacher pengampu TP management restriction.
   - Jurnal Kelas RBAC (Admin & Wali Kelas exclusive).
3. **Attendance & Schedule Configuration Layer (`src/components/AdminConfigView.tsx`, `src/lib/workflow.ts`, `src/components/GuruPresensi.tsx`)**:
   - Teacher attendance exception ("Hanya wajib hadir saat hari mengajar") vs default workdays.
   - Friday checkout time ("Jam Pulang Hari Jumat").
   - Daily workflow status calculation (`getGuruDailyState`).
4. **Live Media & Camera Layer (`src/components/CameraSelfieCapture.tsx`, `src/lib/watermarkCanvas.ts`, `GuruJurnal.tsx`, `PiketView.tsx`, `GuruPresensi.tsx`)**:
   - Direct camera enforcement (`navigator.mediaDevices.getUserMedia`).
   - Front/rear camera toggle (`facingMode: "user" | "environment"`).
   - Total elimination of gallery file upload (`<input type="file">`) on Pulang, Jurnal, and Piket.
5. **Real-time Communication & Notification Layer (`src/components/ChatView.tsx`, `AppScreen.tsx`, `globals.css`, `public/sw.js`, `src/app/api/push/send-reminders/route.ts`)**:
   - Navbar broadcast bell with shake animation and red unread counter.
   - Supabase Realtime teacher-to-teacher chat.
   - Web Push Notification automated reminders and permission dialog.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | DB Schema & Migrations | Add columns and tables for settings, teacher exemptions, chat, and read tracking | M1 | Survey |
| 2 | Academic Year Sync | Sync Guru Gradebook year with Admin `pengaturan.tahun_ajaran` | M2 | R1 |
| 3 | Admin Gradebook Lock | Admin is view-only, cannot edit/mutate, only has "Cetak" button | M2 | R1 |
| 4 | TP Management Restriction | Only guru pengampu can create/edit/delete TP | M2 | R1 |
| 5 | Jurnal Kelas RBAC | Exclusively accessible by Admin and the class's assigned Wali Kelas; hidden/blocked for regular teachers | M2 | R3 |
| 6 | Admin Attendance Settings | UI to select teachers exempt from daily presence (teaching days only) & Friday checkout time | M3 | R4 |
| 7 | Attendance Workflow Logic | `getGuruDailyState` exempts marked teachers on non-teaching days, defaults others to daily presence | M3 | R4 |
| 8 | Friday Checkout Enforcement | `GuruPresensi.tsx` checks Friday and uses `jam_pulang_jumat` | M3 | R4 |
| 9 | Direct Camera Enforcement | Presensi Pulang, Jurnal, and Piket require direct camera input; remove `<input type="file">` | M3 | R5 |
| 10 | Camera Facing Toggle | Support switching front/rear camera (`user` vs `environment`) and correct mirroring | M3 | R5 |
| 11 | Navbar Broadcast Bell | Bell icon in navbar with shake animation and red dot for unread broadcasts | M4 | R2 |
| 12 | Real-time Teacher Chat | Two-way chat between teachers powered by Supabase Realtime without page reload | M4 | R2 |
| 13 | Web Push Automated Reminders | Service Worker + VAPID notifications for missing attendance, journal, and picket | M4 | R2 |
| 14 | Push Permission Dialog | Browser prompt on login/dashboard triggering simulated notification | M4 | R2 |
| 15 | E2E Verification & Git Push | Comprehensive test verification, forensic audit, and automated git push to origin | M5 | Acceptance & Rules |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Database Schema & Migrations | Migration SQL for `pengaturan`, `data_guru`, `chat_messages`, `pengumuman_dibaca` + TS types | none | DONE |
| M2 | R1 & R3: Academic Year, Gradebook & Jurnal Kelas RBAC | Sync year, Admin view-only gradebook, TP restriction, Jurnal Kelas RBAC | M1 | IN_PROGRESS |
| M3 | R4 & R5: Attendance Rules & Direct Camera Integration | Admin settings, Friday pulang, workflow logic, camera capture on Pulang/Jurnal/Piket, front/back toggle | M1 | IN_PROGRESS |
| M4 | R2: Broadcast Bell, Real-time Chat & Web Push Reminders | Navbar bell animation & badge, `ChatView` realtime, push reminders API & permission dialog | M1 | PLANNED |
| M5 | Final Acceptance, Forensic Audit & Git Delivery | End-to-end verification, forensic audit, build check, git commit & push | M2, M3, M4 | PLANNED |

---

## Code Layout
- `supabase/migrations/20260918_milestone9_schema.sql`: Database migration script
- `src/types/database.ts`: Updated TypeScript definitions
- `src/components/GradebookView.tsx`: Academic year sync, Admin lock, TP restrictions
- `src/components/AppScreen.tsx`: Navbar broadcast bell, Jurnal Kelas navigation, Chat menu
- `src/components/RekapJurnalView.tsx`: Wali Kelas filtering and Jurnal Kelas RBAC
- `src/components/AdminConfigView.tsx`: Friday checkout time and teacher attendance exceptions
- `src/lib/workflow.ts`: Attendance exemption calculation in `getGuruDailyState`
- `src/components/GuruPresensi.tsx`: Friday pulang check, direct camera on Pulang
- `src/components/GuruJurnal.tsx`: Direct camera integration, remove file input
- `src/components/PiketView.tsx`: Direct camera integration, remove file input
- `src/components/CameraSelfieCapture.tsx`: Camera toggle (front/back), remove gallery uploads
- `src/lib/watermarkCanvas.ts`: Dynamic canvas mirroring based on `facingMode`
- `src/components/ChatView.tsx`: Real-time teacher-to-teacher chat component
- `src/app/api/push/send-reminders/route.ts`: Web push reminder dispatch endpoint
- `src/app/globals.css`: Keyframe bell shake animation

---

## Interface Contracts
### `public.chat_messages`
- `id`: UUID (PK)
- `sekolah_id`: UUID (FK to `sekolah.id`)
- `sender_id`: TEXT
- `sender_nama`: TEXT
- `recipient_id`: TEXT
- `recipient_nama`: TEXT
- `pesan`: TEXT
- `is_read`: BOOLEAN DEFAULT FALSE
- `created_at`: TIMESTAMPTZ DEFAULT NOW()

### `public.pengumuman_dibaca`
- `id`: UUID (PK)
- `sekolah_id`: UUID
- `pengumuman_id`: UUID (FK to `pengumuman.id`)
- `user_id`: TEXT
- `read_at`: TIMESTAMPTZ DEFAULT NOW()

### `public.pengaturan` Additions
- `jam_pulang_jumat`: TEXT DEFAULT '11:00'
- `guru_hanya_mengajar`: TEXT DEFAULT '[]' (JSON array of teacher IDs)

### `public.data_guru` Additions
- `wajib_hadir_hanya_mengajar`: BOOLEAN DEFAULT FALSE

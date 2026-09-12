## 2026-09-12T04:38:39Z
Investigate:
1. R4. Manajemen Piket & Perangkat Pembelajaran (Admin):
   - Find Piket management page/components. Identify "Isi Laporan" tab to remove, and design "Penugasan Piket" (scheduling/assigning picket teachers and students). Inspect existing piket tables and schema.
   - Find Perangkat Pembelajaran page/components. Identify "Upload Baru" tab to remove. Design teacher matrix card system (displaying subjects and indicators of uploaded vs pending documents).
2. R5. Sistem Informasi (Broadcast) & UI Transitions:
   - Find navigation / sidebar menus. Identify "Pantauan Harian" menu to remove.
   - Design "Informasi" menu: announcement system (broadcast) to communicate from admin to teachers, homeroom teachers (wali kelas), and parents.
   - Check Supabase database schema, existing migrations in supabase/migrations, TypeScript types in src/types/database.ts or similar. Design schema for "Pengumuman/Informasi" and "Penugasan Piket".
   - Investigate UI animation and transitions: Tailwind config, global CSS (src/app/globals.css), button hovers, state transitions, page transitions.

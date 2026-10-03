# Investigation Report: R1 - Clean Removal of Chat Guru Feature

**Investigator**: `explorer_o10_1` (Teamwork Explorer)  
**Date**: 2026-10-03  
**Target Milestone**: R1 - Hapus Fitur Chat Guru  
**Repository**: `sipjam-app` (`c:\Users\Fitra\OneDrive\Documents\sipjam-app`)  

---

## 1. Executive Summary

A comprehensive, read-only investigation across the entire `sipjam-app` codebase was conducted to determine all dependencies, references, and integration points for the **Chat Guru** feature.

The Chat Guru feature is centered around a single client component (`src/components/ChatView.tsx`, 602 lines) that is mounted exclusively inside `src/components/AppScreen.tsx`. No other UI component, utility library, or layout imports or invokes `ChatView`.

Removing this feature cleanly requires:
1. Deleting file `src/components/ChatView.tsx`.
2. Modifying `src/components/AppScreen.tsx` to remove the import statement, the menu entries in `menuItemsGuru` and `menuItemsAdmin`, and the conditional JSX render block.
3. Guarding or updating `tests/ui_ux_improvements_audit.test.ts` (which is part of the automated `npm test` test suite) to prevent an `ENOENT` failure when `ChatView.tsx` is deleted.
4. Keeping the Supabase `chat_messages` table and server-side notification insert logic in `src/app/api/notifications/rejection/route.ts` intact, strictly honoring the requirement: *"Tabel `chat_messages` di Supabase tidak perlu dihapus (cukup dari UI)"*.

---

## 2. Complete Inventory of References

### A. Direct Component & UI References

| File Path | Line(s) | Content / Usage | Action Required |
|:---|:---|:---|:---|
| `src/components/ChatView.tsx` | 1–602 | Component implementation file | **DELETE FILE** |
| `src/components/AppScreen.tsx` | Line 22 | `import ChatView from './ChatView';` | **DELETE LINE** |
| `src/components/AppScreen.tsx` | Line 478 | `{ id: 'view-chat', icon: 'fa-comments', label: 'Chat Guru' },` (in `menuItemsGuru`) | **DELETE LINE** |
| `src/components/AppScreen.tsx` | Line 493 | `{ id: 'view-chat', icon: 'fa-comments', label: 'Chat Guru' },` (in `menuItemsAdmin`) | **DELETE LINE** |
| `src/components/AppScreen.tsx` | Line 659 | `{currentView === 'view-chat' && <ChatView user={user} />}` | **DELETE LINE** |

### B. Knowledge Base & FAQ References (AI Assistant)

| File Path | Line(s) | Content / Usage | Impact / Recommendation |
|:---|:---|:---|:---|
| `src/components/AIAssistant/knowledgeBase.ts` | Line 34 | `{ id: 'chat', viewId: 'view-chat', name: 'Chat Guru', icon: 'fa-comments', description: '...' }` in `MENU_CATEGORIES` | Pure metadata. Does not import `ChatView`. Can remain or be removed. (If kept, retains coverage in standalone offline test `tests/ai_assistant_faq.test.ts`). |
| `src/components/AIAssistant/knowledgeBase.ts` | Lines 198–216 | `faq-chat-1` and `faq-chat-2` FAQ entries | Pure static string data. Does not import `ChatView`. |

### C. Automated Test Suites

| File Path | Line(s) | Content / Usage | Status in `npm test` | Action Required |
|:---|:---|:---|:---|:---|
| `tests/ui_ux_improvements_audit.test.ts` | Lines 126–132 | Reads `ChatView.tsx` via `fs.readFileSync(chatPath, 'utf8')` to check toast imports | **RUNS IN `npm test`** | **MUST GUARD** with `if (fs.existsSync(chatPath))` or remove the check, otherwise `npm test` crashes with `ENOENT`. |
| `tests/m9_4_chat_and_notifications.test.ts` | Lines 71–98 | Milestone 9 verification asserting `ChatView.tsx` exists and is rendered in `AppScreen.tsx` | Not in `npm test` | None needed for standard build/test. |
| `tests/ai_assistant_faq.test.ts` | Lines 91, 114 | Checks FAQ coverage for 19 views including `view-chat` | Not in `npm test` | None needed. |
| `tests/adversarial_ai_assistant_challenger_1.test.ts` | Lines 361, 523 | Checks FAQ coverage for 19 views including `view-chat` | Not in `npm test` | None needed. |

### D. Supabase, Schema & Server-Side APIs (Preserved)

| File Path | Content / Usage | Recommendation |
|:---|:---|:---|
| `src/types/database.ts` (Lines 187–223, 1812–1814) | Type definitions for `chat_messages` table (`ChatMessage`, `ChatMessageInsert`, `ChatMessageUpdate`) | **DO NOT TOUCH** (honors specification to keep database schema) |
| `src/app/api/notifications/rejection/route.ts` (Lines 95–118) | Inserts persistent in-app notifications into `chat_messages` upon attendance/journal rejection | **DO NOT TOUCH** (used by admin rejection workflow) |
| `supabase/migrations/20260918_milestone9_schema.sql` | Migration SQL creating `chat_messages` table | **DO NOT TOUCH** |
| `scripts/update-database-types.js` | Utility script referencing `chat_messages` | **DO NOT TOUCH** |

---

## 3. Deep Dive: `src/components/ChatView.tsx`

### Overview
- **File size**: 602 lines, 26,001 bytes.
- **Role**: Full-page real-time teacher-to-teacher messaging interface.
- **Dependencies**:
  - `react`: `useState`, `useEffect`, `useRef`
  - `@/lib/supabaseClient`: `supabase`
  - `@/types/database`: `ChatMessage`
  - `@/lib/toast`: `showToast`
- **Exports**: Only one default export (`export default function ChatView({ user }: ChatViewProps)`).
- **Sub-components**: None. All sub-render functions and sub-states are local inside `ChatView.tsx`.
- **Verdict**: Safe to completely delete with zero dependency risk to other parts of the application.

---

## 4. Deep Dive: `src/components/AppScreen.tsx`

`AppScreen.tsx` is the primary screen shell and navigation router. The Chat Guru integration is localized strictly to 4 spots:

1. **Import Header (Line 22)**:
   ```tsx
   import GradebookView from './GradebookView';
   import ChatView from './ChatView';             // <-- TARGET
   import SistemBlokView from './SistemBlokView';
   ```

2. **Teacher Sidebar Menu Items (`menuItemsGuru`, Line 478)**:
   ```tsx
   const menuItemsGuru = [
     { id: 'view-home', icon: 'fa-house', label: 'Dashboard' },
     { id: 'view-guru-presensi', icon: 'fa-right-to-bracket', label: 'Presensi Guru' },
     { id: 'view-guru-jurnal', icon: 'fa-book-journal-whills', label: 'Jurnal Pembelajaran' },
     ...(isWaliKelas ? [{ id: 'view-jurnal-kelas', icon: 'fa-chalkboard-user', label: 'Jurnal Kelas' }] : []),
     { id: 'view-piket', icon: 'fa-shield-halved', label: 'Modul Piket' },
     { id: 'view-dokumen', icon: 'fa-folder-open', label: 'Perangkat Pembelajaran' },
     { id: 'view-gradebook', icon: 'fa-graduation-cap', label: 'Daftar Nilai' },
     { id: 'view-chat', icon: 'fa-comments', label: 'Chat Guru' }, // <-- TARGET
     { id: 'view-informasi', icon: 'fa-bullhorn', label: 'Informasi' },
     { id: 'view-history', icon: 'fa-clock-rotate-left', label: 'Riwayat' },
     { id: 'view-guru-rekap-jurnal', icon: 'fa-book-open', label: 'Rekap Jurnal' },
     { id: 'view-rekap-siswa', icon: 'fa-users-viewfinder', label: 'Presensi Siswa' }
   ];
   ```

3. **Admin Sidebar Menu Items (`menuItemsAdmin`, Line 493)**:
   ```tsx
   const menuItemsAdmin = [
     { id: 'view-home', icon: 'fa-house', label: 'Dashboard' },
     { id: 'view-admin-verif', icon: 'fa-clipboard-check', label: 'Verifikasi' },
     { id: 'view-sistem-blok', icon: 'fa-layer-group', label: 'Sistem Blok' },
     { id: 'view-jurnal-kelas', icon: 'fa-chalkboard-user', label: 'Jurnal Kelas' },
     { id: 'view-piket', icon: 'fa-shield-halved', label: 'Kelola Piket' },
     { id: 'view-dokumen', icon: 'fa-folder-open', label: 'Perangkat Pembelajaran' },
     { id: 'view-gradebook', icon: 'fa-graduation-cap', label: 'Daftar Nilai' },
     { id: 'view-chat', icon: 'fa-comments', label: 'Chat Guru' }, // <-- TARGET
     { id: 'view-informasi', icon: 'fa-bullhorn', label: 'Informasi' },
     { id: 'view-analitik', icon: 'fa-chart-pie', label: 'Analitik' },
     { id: 'view-admin-rekap', icon: 'fa-file-invoice', label: 'Rekap Akhir' },
     { id: 'view-rekap-siswa', icon: 'fa-users-viewfinder', label: 'Presensi Siswa' },
     { id: 'view-admin-data', icon: 'fa-database', label: 'Master' },
     { id: 'view-admin-backup', icon: 'fa-hard-drive', label: 'Akses Data / Backup' },
     { id: 'view-admin-config', icon: 'fa-gears', label: 'Sistem' }
   ];
   ```

4. **Main View Render Switch (Line 659)**:
   ```tsx
   {currentView === 'view-gradebook' && <GradebookView user={user} />}
   {currentView === 'view-chat' && <ChatView user={user} />} // <-- TARGET
   {currentView === 'view-informasi' && <InformasiView user={user} setView={handleNavigation} />}
   ```

---

## 5. Step-by-Step Implementation Instructions for Builder

### Step 1: Delete `src/components/ChatView.tsx`
Remove the file using PowerShell / shell:
```powershell
Remove-Item -Path "src\components\ChatView.tsx" -Force
```

### Step 2: Clean `src/components/AppScreen.tsx`
Perform 3 surgical edits on `src/components/AppScreen.tsx`:

1. **Delete Line 22**:
   Remove `import ChatView from './ChatView';`
2. **Delete Line 478 & 493**:
   Remove `{ id: 'view-chat', icon: 'fa-comments', label: 'Chat Guru' },` from `menuItemsGuru` and `menuItemsAdmin`.
3. **Delete Line 659**:
   Remove `{currentView === 'view-chat' && <ChatView user={user} />}` from the conditional JSX rendering block.

### Step 3: Guard `tests/ui_ux_improvements_audit.test.ts`
In `tests/ui_ux_improvements_audit.test.ts` (lines 126–132):
Wrap the `ChatView.tsx` audit block with `if (fs.existsSync(chatPath))` or remove it so that running `npm test` does not throw an unhandled `ENOENT` error:
```typescript
// 1.12 Verify ChatView.tsx toasts (if present)
const chatPath = path.join(projectRoot, 'src', 'components', 'ChatView.tsx');
if (fs.existsSync(chatPath)) {
  const chatContent = fs.readFileSync(chatPath, 'utf8');
  assert(chatContent.includes("@/lib/toast") && chatContent.includes("showToast"), 'ChatView imports showToast');
  assert(chatContent.includes("showToast('Gagal Mengirim'"), 'ChatView uses showToast for chat message send errors');
  assert(!chatContent.includes("import Swal from 'sweetalert2'"), 'ChatView removes unused SweetAlert2 import');
}
```

### Step 4: Verification Gate
Execute the following verification commands in order:
1. `npx tsc --noEmit` — must succeed with exit code 0.
2. `npm run build` — must succeed with exit code 0.
3. `npm test` — all test suites must pass cleanly.

---

## 6. Verification Status & Baseline Metrics

- **TypeScript Compilation (`npx tsc --noEmit`)**: Passes cleanly (Exit Code 0).
- **Next.js Production Build (`npm run build`)**: Passes cleanly (Exit Code 0).
- **Test Suite (`npm test`)**: All 16 suites pass cleanly (Exit Code 0).
- **No dangling dependencies**: Deletion of `ChatView.tsx` and editing `AppScreen.tsx` will not affect any other component or view.

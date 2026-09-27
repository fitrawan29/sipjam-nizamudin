## 2026-09-28T05:53:14Z

You are worker_ai_assistant.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_ai_assistant

Please read:
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (see ## 2026-09-27T21:46:18Z)
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_5\DISPATCH.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_3\handoff.md (contains the 42 Q&As catalog and scoring algorithm details)
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_2\handoff.md (contains testing and build instructions)

Your exclusive write ownership:
- `src/components/AIAssistant/knowledgeBase.ts`
- `src/components/AIAssistant/faqMatcher.ts`
- `src/components/AIAssistant/AIAssistant.tsx`
- `src/components/AIAssistant/index.ts`
- `tests/ai_assistant_faq.test.ts`

DO NOT modify `src/components/AppScreen.tsx` yet (Worker 3 will do integration).

Requirements to implement:
1. `knowledgeBase.ts`:
   - Static FAQ knowledge base with at least 42 detailed Q&As in natural Indonesian covering all 19 menus:
     Dashboard (`view-home`), Presensi Guru Datang/Pulang (`view-guru-presensi`), Jurnal Pembelajaran (`view-guru-jurnal`), Modul Piket (`view-piket`), Perangkat Pembelajaran (`view-dokumen`), Daftar Nilai (`view-gradebook`), Chat Guru (`view-chat`), Informasi (`view-informasi`), Riwayat (`view-history`), Rekap Jurnal (`view-guru-rekap-jurnal`), Presensi Siswa (`view-rekap-siswa`), Verifikasi (`view-admin-verif`), Sistem Blok (`view-sistem-blok`), Jurnal Kelas (`view-jurnal-kelas`), Analitik (`view-analitik`), Rekap Akhir (`view-admin-rekap`), Master Data (`view-admin-data`), Akses Data/Backup (`view-admin-backup`), Sistem Konfigurasi (`view-admin-config`), plus General/Help topics.
   - Each entry has: `id`, `category`, `question`, `answer`, `keywords` (string[]), `relatedViews` (string[]), and optionally `userRoles` ('guru' | 'admin' | 'all').
2. `faqMatcher.ts`:
   - Tokenization & normalization (lowercase, remove punctuation).
   - Match scoring: keyword hits, phrase hits, and context boost (+15 points if `currentView` matches entry's `relatedViews`).
   - `findBestAnswers(query: string, currentView?: string, limit?: number)`: returns top matches or empty array if score is below threshold.
   - `getContextSuggestions(currentView?: string, limit?: number)`: returns recommended questions for the active page.
   - Fallback generator: friendly Indonesian message + list of available menu categories when no answer is found.
   - 100% offline, pure string matching, zero external API calls.
3. `AIAssistant.tsx`:
   - `'use client';`
   - Floating trigger button fixed at bottom-right (`fixed bottom-5 right-5 z-45`) with `data-tour="ai-assistant-btn"`, star/magic icon (`fa-solid fa-wand-magic-sparkles`), tooltip on hover, badge.
   - Expandable chat panel (`fixed bottom-20 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-96 max-h-[75vh] h-[480px] z-45`):
     - Header: "Asisten AI SIPJAM", status badge "Offline", minimize/close button (`fa-solid fa-xmark`).
     - Chat bubble stream with auto-scroll.
     - Context-aware suggestion chips below welcome message or chat prompt.
     - Input field with send button, Enter key handler.
     - Quick reset / clear conversation button.
4. `index.ts`:
   - Clean re-exports of `AIAssistant`, `knowledgeBase`, `faqMatcher`.
5. `tests/ai_assistant_faq.test.ts`:
   - Automated test script run via `npx tsx tests/ai_assistant_faq.test.ts`.
   - Verifies >= 30 Q&As (expects 42), full 19 menu coverage, keyword matching, context boost scoring, fallback behavior, offline purity (no fetch calls).
   - Run the test and ensure exit code 0!
6. Typecheck: Run `npx tsc --noEmit` and ensure no TypeScript errors.

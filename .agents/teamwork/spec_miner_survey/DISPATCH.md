## 2026-10-29T11:22:43Z
You are a Specification Mining Specialist.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\spec_miner_survey\
Before starting work, YOU MUST read ORIGINAL_REQUEST.md located at:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md

Your task is to thoroughly analyze the authoritative specification document:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\docs\REKOMENDASI_PENGGABUNGAN_FITUR_DAN_MENU.md
in conjunction with ORIGINAL_REQUEST.md.

Extract and document in full detail:
1. The 7 feature clusters: for each cluster, document:
   - Existing separate menu items and views.
   - Proposed consolidated menu name, icon, route/view ID.
   - Proposed sub-tabs / tab views within the consolidated screen.
   - Core workflows, forms, modals, tables, actions, filters, exports that must remain intact.
2. Role-by-role impact and menu structure:
   - Guru Reguler
   - Wali Kelas
   - Guru Piket
   - Administrator
   - Kepala Sekolah
   - Pengawas Dinas
   - Superadmin
3. Backward compatibility requirements:
   - List of all legacy view IDs that need aliasing/redirecting to the new consolidated views or specific sub-tabs.
   - Automated tour selectors (`data-tour`) that must be preserved or aliased.
4. Acceptance criteria and constraints:
   - Zero feature loss guarantees.
   - Integrity and test requirements.
5. Recommended dependency graph and implementation milestones across the 7 clusters.

Write your complete, structured findings to:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\spec_miner_survey\handoff.md

Update your progress in c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\spec_miner_survey\progress.md.
When finished, send a message to the orchestrator (conversation ID: 095792d8-1a85-4945-889d-abf25d3c7740) notifying that handoff.md is ready.

## 2026-11-06T23:26:22Z
You are explorer_m2_nov_1.
Your working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m2_nov_1\
Path to ORIGINAL_REQUEST.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Path to PROJECT.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md
Prior Survey Report: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_nov_2\handoff.md

You MUST read ORIGINAL_REQUEST.md and PROJECT.md first.

Your mission is to produce an exact implementation blueprint for:
Requirement R3 - Part 1: Teacher First Selection & Initial Empty State in `src/components/GradebookView.tsx`:
- Inspect lines 960–980: Stop the auto-selection of the first teacher (`teachers[0]`) on initial load for Admin mode.
- Set `selectedGuru` to default to empty string `""` on mount for Admin.
- In the Guru Pengampu `<select>` dropdown (lines 2700–2726): Add an unselected default option `<option value="">-- Pilih Guru Pengampu --</option>`.
- In the Mapel `<select>` dropdown (lines 2728–2748): If `!selectedGuru`, disable the dropdown (`disabled={!selectedGuru}`) and display `<option value="">-- Pilih guru pengampu terlebih dahulu --</option>`.
- In the Kelas `<select>` dropdown (lines 2750–2770): If `!selectedGuru || !selectedMapel`, disable the dropdown and display `<option value="">-- Pilih mata pelajaran terlebih dahulu --</option>`.
- In the main Gradebook matrix/workspace area: When `!selectedGuru` (in Admin mode), render a clear, attractive empty state card prompting the user: "Silakan pilih Guru Pengampu terlebih dahulu untuk memulai asesmen dan pengelolaan buku nilai."
- Non-admin (Guru) mode must remain untouched (automatically scoped to `user.nama` as read-only badge).

Detail the exact code diffs, line references, and component markup in your report:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m2_nov_1\handoff.md`.
Maintain `progress.md` in your working directory.
When finished, notify orchestrator via send_message.

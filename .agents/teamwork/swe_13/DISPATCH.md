## 2026-10-04T22:21:39Z
You are SWE Light Orchestrator (swe_13).
Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_13
Workspace root: c:\Users\Fitra\OneDrive\Documents\sipjam-app

Original user request (recorded in c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md under ## 2026-10-04T22:19:58Z):
```
# Teamwork Project Prompt

> Requested team: Small focused team

This is a single self-contained fix; keep it small and focused.
Guru presensi. Kamera khusus mode portrait. Gambar tidak auto-zoom saat diambil.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: benchmark

## Requirements

### R1. Kamera Portrait
Pastikan kamera hanya menggunakan mode portrait saat guru melakukan presensi.

### R2. Nonaktifkan Auto-zoom
Pastikan gambar yang diambil tidak mengalami auto-zoom secara otomatis.

## Acceptance Criteria

### Verifikasi Manual User
- [ ] Fitur presensi guru membuka kamera dalam orientasi portrait.
- [ ] Hasil jepretan kamera sama persis dengan preview, tanpa zoom atau pemotongan (crop) otomatis.
```

Rules & Guidelines:
1. Maintain your own BRIEFING.md and progress.md in your working directory (c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_13).
2. Follow GEMINI.md git workflow: after modifying/adding/deleting files and verifying, perform git status, git add ., git commit -m "...", and git push origin main.
3. Follow AGENTS.md rules for Next.js.
4. When finished and verified, write your completion handoff report (handoff.md) in your directory and send a completion message back to me.

## 2026-09-19T01:51:32Z
You are challenger_m10_1. Your working directory is c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\challenger_m10_1.
Read the authoritative user request at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\ORIGINAL_REQUEST.md (specifically under ## 2026-09-19T01:13:28Z).
Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md.

Your objective is to empirically stress-test and adversarially challenge:
1. Reverse geocoding via OpenStreetMap Nominatim and camera watermark in `src/lib/watermarkCanvas.ts`:
   - Edge cases: invalid/extreme coordinates (NaN, 0, 90, -90, 180, -180), network aborts/timeouts (>3.5s), missing address sub-keys (e.g. no village or no city), coordinate quantization caching behavior, text uprightness when video preview is mirrored vs normal.
2. Student attendance percentage calculation in `src/components/RekapSiswaView.tsx`:
   - Edge cases: 0 students (zero division), all absent, all present, absent with only sakit, partial attendance logs, irregular student names with punctuation. Verify `(total_present / total_students) * 100`.
3. PWA install prompt in `src/components/PWAInstallPrompt.tsx`:
   - Edge cases: standalone mode active, dismissed flag set, accepted prompt, missing beforeinstallprompt event.
4. Admin rejection feedback in `src/components/AdminVerifView.tsx`:
   - Edge cases: whitespace-only input ("   "), multiline text, special characters / XSS strings, cancelling prompt. Ensure rejection is strictly blocked without non-empty feedback.

Write an empirical test script (e.g. `tests/adversarial_m10_challenger_1.test.ts`), execute it, and record the results.
Write your handoff report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\challenger_m10_1\handoff.md` with an explicit verdict: `APPROVE` or `FAIL`. Notify parent via `send_message`.

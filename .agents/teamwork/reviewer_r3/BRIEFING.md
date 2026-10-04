# BRIEFING: Review Round 3 (reviewer_r3)

## Task Context
- **Feature**: Guru presensi. Kamera khusus mode portrait. Gambar tidak auto-zoom saat diambil.
- **Role**: Teamwork Adversarial Reviewer (Round 3) & QA
- **Integrity Mode**: benchmark
- **Repository**: c:\Users\Fitra\OneDrive\Documents\sipjam-app

## Key Objectives
1. **R1. Kamera Portrait**:
   - Verify camera opens in strict portrait orientation (`orientation="portrait"`, `aspect-[3/4] max-w-sm mx-auto`).
   - Validate front-facing default (`initialFacingMode="user"`).
2. **R2. Nonaktifkan Auto-zoom**:
   - Verify uncropped 1x scale (`object-contain`, zero artificial digital scale zoom classes).
   - Ensure captured image matches live preview exactly.
3. **Adversarial Stress Testing**:
   - Camera teardown & unmount leaks (aborting in-flight requests, stopping media tracks on play rejection, preventing unmounted state updates).
   - Concurrent retake/capture actions (race condition prevention, multi-click button debounce).
   - Offline selfie submission (localStorage queue persistence & background synchronization).
   - Front/rear camera toggling resilience.
   - Watermark coordinate sanitization (finite number validation, rejecting NaN & Infinity).
   - GPS request lifecycle isolation (no GPS searching flash on preview).

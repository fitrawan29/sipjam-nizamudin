## 2026-10-29T22:29:33Z
You are teamwork_victory_auditor.
Your working directory is c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_victory_auditor_swe_1\
Write your progress.md and handoff.md in your working directory.

<original_task>
This is a single self-contained fix; keep it small and focused. Sesuaikan sistem panduan/tutorial onboarding di sipjam-app agar selaras dengan struktur menu baru dan sub-tab terpadu (ClayTabs) hasil konsolidasi fitur di docs/REKOMENDASI_PENGGABUNGAN_FITUR_DAN_MENU.md.

Integrity mode: development

## Requirements

### R1. Penyesuaian Panduan Onboarding
Sesuaikan sistem panduan/tutorial onboarding (`src/components/Onboarding/OnboardingTutorial.tsx`), langkah-langkah tur panduan, target selektor elemen (data-tour), narasi bantuan, dan alur penunjuk sub-tab agar sepenuhnya selaras dengan struktur menu dan sub-tab baru untuk seluruh peran pengguna yang didukung.

### R2. Penyelarasan Pengujian Tutorial
Sesuaikan pengujian terkait tutorial di `tests/challenger_m2_tutorial_system.test.ts` agar mencerminkan selektor dan alur tutorial yang baru, serta pastikan seluruh test suite tutorial lulus 100%.

## Acceptance Criteria

### Penyelarasan Tutorial
- [ ] Langkah-langkah tur, selektor elemen (data-tour), dan penunjuk sub-tab pada `src/components/Onboarding/OnboardingTutorial.tsx` mengarah ke elemen antarmuka dan sub-tab yang valid sesuai struktur menu baru.
- [ ] Narasi bantuan dan petunjuk alur tutorial mencerminkan navigasi dan pengelompokan sub-tab yang telah dikonsolidasikan.

### Pengujian & Verifikasi
- [ ] Pengujian pada `tests/challenger_m2_tutorial_system.test.ts` lulus 100% tanpa kegagalan.
- [ ] TypeScript check (`npx tsc --noEmit`) berjalan sukses dengan nol error.
</original_task>

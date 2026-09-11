## 2026-09-11T12:56:00Z
Investigate Requirement R1: Default Theme & Google Drive Image Rendering for sipjam-app.
Scope:
1. Default Theme to Light Mode:
   - Search theme configuration (ThemeProvider, next-themes, tailwind.config.ts, globals.css, defaultTheme, attribute="class", theme toggles, cookies, localStorage keys, layout files).
   - Trace where theme is initialized and where dark mode might currently be default or system-default.
   - Specify exactly what lines in which files need to be adjusted to enforce "Light Mode" as default.
   - Verify switching themes manually still works, but new or unconfigured sessions default to light mode.
2. Google Drive Image Rendering:
   - Identify all places where images, photos, or evidence URLs are rendered in UI (student/teacher photos, KBM journal documentation/photos, piket documentation, presensi photos, avatar components, etc.).
   - Analyze standard Google Drive sharing URL patterns.
   - Design a URL transformer utility function (regex or URL parser) that reliably converts Google Drive share URLs to direct embeddable/renderable URLs (e.g., https://drive.google.com/uc?export=view&id={id} or https://lh3.googleusercontent.com/d/{id} or Next.js Image compatible loader / fallback).
   - Identify if next.config.js / next.config.mjs / next.config.ts needs images.remotePatterns for drive.google.com or lh3.googleusercontent.com if next/image is used.
   - List all files that render images and explain where this transformer should be applied.
Deliverable: Write comprehensive findings to .agents/explorer_m1_survey/handoff.md.

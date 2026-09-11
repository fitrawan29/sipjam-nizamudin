# Original User Request

## 2026-09-11T07:26:30Z

Use a very large team of agents. 
A comprehensive UI/UX audit and refactoring of the application. The focus is on implementing a clean, simple, mobile-first design with pleasing icons, and enforcing strict font color contrast rules across light and dark modes, strictly through CSS/Tailwind class modifications.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: demo

## Requirements

### R1. Strict Light/Dark Mode Typography Contrast
Audit all components and enforce strict contrast adaptability. All text elements must use pure black (or highly legible dark equivalents) in light mode, and pure white (`dark:text-white`) in dark mode. Do not leave any hardcoded dark colors that lack dark-mode variants. This must be accomplished strictly by adjusting Tailwind CSS classes, without altering React component logic or application state.

### R2. Mobile-First Simplicity & Iconography
Simplify the layout for an intuitive, mobile-first experience. Ensure icons are consistently sized, aesthetically pleasing, and comfortable for the eyes. Avoid overly harsh color palettes for UI elements, ensuring a harmonious look across both themes.

## Acceptance Criteria

### CSS & Contrast Validation (Agent-as-Judge)
- [ ] An independent reviewing agent confirms that all modified files successfully implement the `dark:text-white` (or equivalent) rule for text elements, with no unreadable text combinations in dark mode.
- [ ] An independent reviewing agent confirms that NO core React functionality or component logic was modified (only CSS/className changes).

### Layout & Design Validation (Agent-as-Judge)
- [ ] An independent reviewing agent confirms that the components render in a single-column or flex-wrap layout suitable for mobile viewports without causing horizontal overflow.
- [ ] An independent reviewing agent verifies that icons are consistently styled and sized across the modified views.

## 2026-09-11T08:31:24Z

Use a very large team of agents. 
A comprehensive functional audit and repair of UI buttons across the Admin and Guru interfaces. The specific focus is to replace any remaining dummy functions with actual Supabase database operations, particularly within the Verification views (Presensi, Jurnal, Piket) and Recap features.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: demo

## Requirements

### R1. Functionalize Verification Buttons
Ensure all action buttons in the Admin verification views (such as approving or rejecting Presensi, Jurnal, and Piket) are fully operational. They must execute actual updates to the `status_verifikasi` (or equivalent) fields in the Supabase database.

### R2. Repair Recap Features
Ensure all filter, search, and action buttons in the Recap views properly fetch, calculate, and display real data according to the selected parameters, abandoning any hardcoded dummy data logic.

### R3. Global Button Audit
Systematically scan the remaining views across the application. Identify any buttons that are inactive, unresponsive, or using mock functionality, and wire them up to their intended real system operations.

## Acceptance Criteria

### Functional Validation (Agent-as-Judge)
- [ ] An independent reviewing agent confirms that the `onClick` handlers for modified verification buttons execute valid, mutating Supabase API queries (e.g., `supabase.from(...).update(...)`) rather than mock logic or empty functions.
- [ ] An independent reviewing agent confirms that the Recap features correctly utilize Supabase fetch queries based on the UI's filter states.
- [ ] An independent reviewing agent confirms that any newly wired global buttons function accurately in accordance with their visual labels and intended purposes.

## 2026-09-11T12:54:07Z

Use a very large team of agents. 
Apply targeted UI/UX and database schema improvements, specifically enforcing Light Mode as default, correcting Google Drive image rendering, ensuring KBM journal mapel/kelas drop-downs are dynamically filtered per teacher, strictly standardizing print document headers, and conducting a broad quality-of-life audit.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Default Theme & Image Rendering
Make "Light Mode" the default theme for the application. Implement a URL transformer or regex to convert standard Google Drive share links into direct-renderable image URLs (e.g., `drive.google.com/uc?id=`) so images display correctly within the application's UI.

### R2. Dynamic KBM Journal Filtering
Update the "Guru Jurnal" submission form so the "Mata Pelajaran" and "Kelas" dropdowns only display the specific subjects and classes assigned to the currently logged-in teacher. The team is explicitly authorized to create and manage new relational tables in the Supabase database to support this mapping if the current schema is insufficient.

### R3. Strict Print Formatting
Enforce strict CSS print constraints on the `PrintHeader` component:
- The school address line must remain on a single horizontal line (`white-space: nowrap`). If it overlaps with the left/right logos, its font size must dynamically shrink.
- The line spacing (`line-height`) for the header text must be exactly `1`.
- In the signature block, append the dynamic string "[Kabupaten/Kota], [Date]" immediately above the "Kepala Sekolah" designation (pulling the region dynamically from settings if available).

### R4. Broad Quality-of-Life Audit
Conduct a systematic sweep of the application to identify and resolve any other UI/UX flaws, missing states, or visual inconsistencies not explicitly mentioned above to polish the application.

## Acceptance Criteria

### Technical & UI Validation (Agent-as-Judge)
- [ ] An independent reviewing agent confirms theme contexts default to light mode, and a URL parser actively converts Google Drive links in image tags.
- [ ] An independent reviewing agent confirms that Supabase queries in the Jurnal KBM form dynamically filter Mapel/Kelas based on the user's identity (validating any newly created schema relations).
- [ ] An independent reviewing agent confirms the Print CSS explicitly uses `white-space: nowrap` and flexible text shrinking for the address, `line-height: 1` for the header, and correctly formats the signature date line.
- [ ] An independent reviewing agent confirms the general sweep introduced no breaking changes and the Next.js application builds cleanly.

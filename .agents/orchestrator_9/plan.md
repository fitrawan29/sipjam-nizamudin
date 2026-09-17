# Plan — SIPJAM Comprehensive Enhancements (R1-R6)

## Overview
Implement comprehensive feature additions and enhancements for SIPJAM multi-tenant application covering 6 key functional areas (R1-R6).

## Phases
### Phase 0: Survey & Codebase Exploration
- Spawn 3 parallel Explorers:
  - Explorer 1: R1 (Attendance Sync & Wali Kelas) & R2 (Selfie Attendance & Canvas Watermark / GAS Webhook)
  - Explorer 2: R3 (Gradebook / Daftar Nilai with dynamic TP relations) & R4 (VAPID PWA Push Notifications & Account/Attendance Settings)
  - Explorer 3: R5 (Advanced Master Data & Naik Kelas & Rekapan Jurnal Per Kelas) & R6 (Print UI Polish & Perangkat Pembelajaran Matrix)
- Synthesize survey findings into `PROJECT.md` with Feature Inventory and clear milestones.

### Phase 1: Implementation Milestones & E2E Testing Track
- Dual Track:
  - Implementation Milestones M1-M6 covering R1-R6
  - E2E Testing Track generating automated verification scripts
- Dispatch workers per milestone with explicit write boundaries and integrity constraints.

### Phase 2: Independent Review, Challenge & Forensic Audit
- Reviewers (2) per milestone for code quality, adherence to AGENTS.md, Next.js rules.
- Challengers (2) for automated test execution, stress testing, and edge case verification.
- Forensic Auditor (teamwork_preview_auditor) for zero-tolerance anti-cheat/integrity verification.

### Phase 3: Final Delivery & Git Synchronization
- Run full test suite.
- Execute Git Workflow Rule in GEMINI.md:
  1. git status
  2. git add .
  3. git commit -m "..."
  4. git push origin main
- Notify Sentinel of completed delivery.

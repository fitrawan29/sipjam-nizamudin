# Execution Plan: Fix Data Retrieval for Admin and Teacher Roles

## Objective
Investigate and resolve data access failure for admin and teacher (guru) accounts post-update, prevent regressions, verify with automated tests, and push changes per Git Workflow rules.

## Phase 0: Survey & Root Cause Analysis
1. Dispatch 3 Explorers concurrently:
   - **Explorer 1 (Git & Recent Changes)**: Review git log, recent commits, diffs, and modified files to identify what was changed in the recent update.
   - **Explorer 2 (Auth, Roles & Database/RLS)**: Examine authentication flows, Supabase client setup (SSR/client/middleware), user profile fetching, role definitions, and RLS policies/SQL queries.
   - **Explorer 3 (Data Retrieval & Pages/APIs)**: Trace data fetching paths in Admin and Teacher dashboards, API routes, server actions, and comparison with Siswa (student) flow.
2. Aggregate Explorer findings and write `PROJECT.md` with:
   - Architecture & Data Flow
   - Root Cause Diagnosis
   - Feature Inventory & Milestones
   - Interface Contracts & Code Layout

## Phase 1: Dual Track (Testing & Implementation)
1. **Testing Track**:
   - Dispatch `teamwork_preview_test_writer` to create an automated test / verification script that tests:
     - Admin login and data retrieval (e.g. dashboard stats, user lists)
     - Teacher (Guru) login and data retrieval (e.g. teacher dashboard, classes, schedule, data)
     - Siswa login and data retrieval (regression check ensuring access remains intact)
2. **Implementation Track**:
   - Dispatch `teamwork_preview_worker` with root cause findings to apply the necessary fixes across queries, RLS policies, or route handlers.
   - Enforce Mandatory Integrity Warning: no hardcoded data or dummy mocks.
   - Verify build and tests pass.

## Phase 2: Review, Adversarial Challenge & Forensic Audit
1. Dispatch 2 `teamwork_preview_reviewer` subagents to independently evaluate code quality, completeness, error handling, and build/test success.
2. Dispatch 2 `teamwork_preview_challenger` subagents to stress-test permissions, edge cases, and role boundaries.
3. Dispatch 1 `teamwork_preview_auditor` for forensic integrity validation.

## Phase 3: Gate & Git Workflow
1. Evaluate Gate criteria in `GATE_STATUS.md`:
   - Build passes
   - All Reviewers APPROVE
   - All Challengers confirm correctness
   - Auditor reports CLEAN
2. Confirm Git Workflow compliance: `git status`, `git add .`, `git commit -m "..."`, `git push`.
3. Report success to Sentinel.

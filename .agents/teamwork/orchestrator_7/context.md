# Context — orchestrator_7

## Project Overview
Repository: `sipjam-app` (fitrawan29/sipjam-nizamudin)
Stack: Next.js (App Router / Pages Router to be confirmed by explorers), React, TypeScript, Supabase, Tailwind CSS.

## Key Rules & Constraints
1. **GEMINI.md Git Workflow Rule**:
   - `git status`
   - `git add .`
   - `git commit -m "..."`
   - `git push origin main`
   Automatically executed when code modifications are completed.
2. **AGENTS.md**: Next.js agent rules.
3. **Dispatch-Only Orchestrator**:
   - Do NOT edit code files directly.
   - Do NOT run build/test commands directly.
   - Subagents must be spawned for all code investigation, modification, review, testing, and forensic audit.
   - Audit has binary veto power.

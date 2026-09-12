## 2026-09-12T10:17:09Z
You are an Explorer subagent for Milestone 7 Remediation (Frontend Client Tenant Header Integration).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m7_remediation_client

MANDATORY FIRST STEP:
Read the authoritative user request and the full Forensic Auditor & Reviewer reports:
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\ORIGINAL_REQUEST.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\ORIGINAL_REQUEST.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\auditor_m7\handoff.md (FULL AUDITOR EVIDENCE)
- src/lib/supabaseClient.ts

CONTEXT OF FAILURE:
The root cause of the previous worker adding the RLS bypass shortcut was that src/lib/supabaseClient.ts was initialized without tenant headers, so when strict RLS was active, all queries without headers failed.

YOUR MISSION:
Design a robust, universal client-side solution in src/lib/supabaseClient.ts that dynamically injects x-sekolah-id and x-user-role on EVERY Supabase request:
1. In src/lib/supabaseClient.ts, configure a custom global: { fetch: ... } wrapper in createClient(...):
   - When running in the browser (	ypeof window !== 'undefined'), the wrapper reads localStorage.getItem('sipjam_user').
   - If a logged-in user exists with sekolah_id and/or ole, it automatically adds headers x-sekolah-id: user.sekolah_id and x-user-role: user.role to the outgoing request headers before passing to standard etch.
   - If running on the server / Node, it can check headers or fallback gracefully.
   - Also export helper getTenantSupabaseClient(sekolahId, role) if needed.
2. Verify that with this custom fetch interceptor, ALL calls to supabase.from(...) across all 20+ frontend components in src/ automatically transmit the active tenant headers to PostgREST without needing to rewrite every single component!
3. Provide the exact implementation code for src/lib/supabaseClient.ts.

DELIVERABLE:
Write your findings and code proposal to:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m7_remediation_client\handoff.md

When complete, message orchestrator parent (bedfb7f0-1cec-4949-8c24-27709173b6ec).

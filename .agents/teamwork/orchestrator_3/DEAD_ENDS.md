# Dead Ends Log

| Iteration | Approach Tried | Why It Failed | Files Touched |
|-----------|---------------|---------------|---------------|
| 2 (M2) | Client-side only time evaluation with date-only string | Caused UTC/WITA date drift and missed Sunday/Monday edge cases | `src/lib/attendanceAlpa.ts` |

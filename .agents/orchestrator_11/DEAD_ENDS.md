# Dead Ends Log

| Iteration | Approach Tried | Why It Failed | Files Touched |
|-----------|---------------|---------------|---------------|
| 1 | Querying `presensi_guru` using non-existent columns `.eq('tanggal', todayStr).eq('jenis', 'Datang')` and asserting on that string in tests | PostgREST error 42703 (columns do not exist; schema has `timestamp` and `tipe_absen`). Causes false-positive notifications to teachers who already checked in. Flagged by Auditor as Broken Contract and Prohibited Pattern #4. | `src/app/api/push/send-reminders/route.ts`, `tests/m9_4_chat_and_notifications.test.ts` |

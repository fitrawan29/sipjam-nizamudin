# Reviewer Round 2 Progress Log

- **Target**: Review, break, and fix R1 (AI Assistant Icon) and R2 (Web Push Notification Robustness).
- **Findings from Round 2 adversarial inspection**:
  1. Static `tag: 'sipjam-push-notification'` in `sw.js` caused all notifications without an explicit tag to overwrite and destroy each other in the user's notification tray. Fixed by only specifying `tag` and `renotify` when an explicit non-empty tag is provided, preventing both notification collapse and Chromium's `renotify without tag` TypeError.
  2. Silent mode (`payload.silent === true`) did not disable vibration in `sw.js`. Fixed by deleting vibrate and setting `silent: true`.
  3. `clients.openWindow` rejection during `notificationclick` had no fallback to focus existing windows. Fixed with fallback to `clientList[0].focus()`.
  4. In `pushClient.ts`, if `sub.toJSON().keys` was omitted or incomplete, server subscribe rejected with HTTP 400. Fixed with fallback extraction via `subscription.getKey('p256dh')` and `getKey('auth')`.
  5. In `pushClient.ts`, non-JSON/HTML 5xx responses threw unhandled `SyntaxError`. Fixed with try/catch fallback.
  6. In `AIAssistant.tsx`, added Escape key dismissal when dialog is open.
- **Test execution**:
  - `tests/adversarial_r1_r2_reviewer.test.ts`: 97/97 PASS
  - `tests/ai_assistant_faq.test.ts`: 24/24 PASS
  - `tests/adversarial_ai_assistant_challenger_1.test.ts`: 74/74 PASS
  - `npm test`: 85/85 PASS
  - `npx tsc --noEmit`: 0 errors
  - `npm run build`: Success in Turbopack production build

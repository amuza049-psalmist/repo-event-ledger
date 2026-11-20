# Project instructions

## Project overview

- This repository is a static, client-side MY UNILIFE(UNZA) portal. It is deployed as a GitHub Pages-compatible single-page application.
- `index.html` is the source of truth and contains the complete HTML, CSS, and JavaScript. Keep application changes in this file unless the repository structure is intentionally expanded.
- `README.md` describes project features and usage. Update it when user-facing behavior or repository structure changes.
- There is no package manager, build step, framework, test runner, or backend in the current repository.
- `unza.jpg` is referenced by the README but is not currently present; do not claim or add it unless requested.

## Editing conventions

- Preserve the existing vanilla HTML, CSS, and JavaScript style. Do not introduce frameworks, libraries, or build tooling for small changes.
- Keep the one-page structure and existing visual language: dark glass panels, teal/blue actions, red destructive actions, responsive CSS, and mobile support.
- Use the existing `const`, `let`, arrow functions, template literals, DOM helpers, `replaceChildren()`, and `textContent` patterns already used in `index.html`.
- Prefer surgical changes to the relevant function or markup block. Avoid unrelated formatting or restructuring of the embedded script.
- Keep the page accessible: preserve labels and form associations, use semantic elements, maintain keyboard operation, and use ARIA/live status text when dynamic feedback changes.
- Preserve external portal links and add `target="_blank"` links with `rel="noopener noreferrer"` for consistency.
- Keep account access and data storage local to the browser; this static site has no backend or server-side authentication.

## Application behavior

- Events are encrypted with Web Crypto (AES-GCM, using a PBKDF2-derived account key) before persistence in `localStorage` under `unza-event-ledger-events-v1`. Never store decrypted event data or passwords in browser storage.
- My Daily Routine alarms are separate from event alarms and stored encrypted in `localStorage` under `unza-event-ledger-routines-v1`. They use their own scheduler and audio toggle; missed occurrences while the app was closed are skipped.
- Uploaded files are encrypted with the same in-memory account key before persistence in IndexedDB database `unza-event-ledger-files-v1`, object store `files`, with a 25 MB per-file limit.
- Do not automatically expire saved events or files; keep them until the user deletes them or explicitly resets the local account.
- Uploaded files open from a one-tap file link; its three-dot menu includes open, download, share, and delete. Use the Web Share API when supported and provide a clear fallback. Render only safe preview types inline; download active-content/unsupported types rather than opening them in the app's origin.
- The account encryption key exists only while the user is logged in. Do not add automatic session restoration; logout/reload should require the password again. Forgotten passwords cannot recover encrypted data.
- The forgotten-password reset deletes the account and encrypted event/routine/file data from this browser; it does not recover the old data.
- Treat the local login as a lock for encrypted local data, not protection against a compromised browser/device or modified client code. Use HTTPS/Web Crypto; do not claim server-backed security.
- Calendar imports and exports use `.ics` text. Preserve CRLF output, escaping, VEVENT structure, UID/DTSTAMP/DTSTART fields, and the existing duplicate detection by title and start time.
- Alarm scheduling is browser-limited. Preserve future-event validation, page-visible timer behavior, Web Audio activation, Notification permission handling, and the stop-alarm behavior.
- My Daily Routine uses a separate encrypted routine list and scheduler, with its own sound toggle. Repeat once, daily, or weekly on a chosen weekday; skip overdue routine occurrences on login, and never claim browser alarms run in the background.
- Browser APIs can be unavailable or restricted. Keep capability checks and user-visible fallback/error messages for AudioContext, IndexedDB, Notifications, localStorage, FileReader, and Blob URLs.
- Use `textContent` or DOM nodes for untrusted event/title/file data instead of injecting HTML. Continue escaping values written into `.ics` files.

## Validation

- After editing `index.html`, run a local server and request the page:

  ```bash
  python3 -m http.server 4173
  curl -I http://127.0.0.1:4173/
  ```

- Manually verify affected browser behavior in a desktop and mobile-sized viewport. Focus on event creation/deletion, alarm activation and cancellation, `.ics` import/export, file upload/download/deletion, storage fallback/error states, and responsive layout.
- Stop and test the alarm flows only when browser permission and audio behavior can be observed safely.
- Before finishing, inspect `git diff` and ensure no unrelated files or generated test artifacts are changed.

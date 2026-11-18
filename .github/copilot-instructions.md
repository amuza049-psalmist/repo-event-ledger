# Project instructions

## Project overview

- This repository is a static, client-side UNZA Event Ledger portal. It is deployed as a GitHub Pages-compatible single-page application.
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
- Do not add authentication or server-side storage; data is intentionally local to the browser.

## Application behavior

- Events are persisted in `localStorage` under `unza-event-ledger-events-v1`. Protect event loading and saving with the existing graceful fallback patterns.
- Uploaded files are persisted in IndexedDB database `unza-event-ledger-files-v1`, object store `files`, with a 25 MB per-file limit.
- Calendar imports and exports use `.ics` text. Preserve CRLF output, escaping, VEVENT structure, UID/DTSTAMP/DTSTART fields, and the existing duplicate detection by title and start time.
- Alarm scheduling is browser-limited. Preserve future-event validation, page-visible timer behavior, Web Audio activation, Notification permission handling, and the stop-alarm behavior.
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

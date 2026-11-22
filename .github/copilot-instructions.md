# Project instructions

## Project overview

- This is a static, client-side MY UNILIFE(UNZA) PWA deployed through GitHub Pages.
- Use `index.html` for the document shell and styles, `app.js` for browser DOM and application behavior, `core.js` for pure logic that can run in a browser or Node, and `service-worker.js` for the offline app shell.
- `test/core.test.js` is a dependency-free Node test runner for `core.js`; there is no package manager, build step, framework, or backend.
- Keep `README.md` in sync with user-facing features and repository structure.

## Editing conventions

- Preserve the vanilla HTML, CSS, and JavaScript style. Do not introduce frameworks, libraries, package files, or build tooling for small changes.
- Keep the existing dark-glass visual language: teal/blue actions, red destructive actions, and mobile responsive layouts.
- Prefer small changes in the relevant file. Keep DOM-free logic in `core.js` and browser-only APIs in `app.js`.
- `core.js` exports through `module.exports` for Node and `window.Core` for browsers. When moving or changing shared pure functions, keep both export paths and tests working.
- Preserve existing DOM element IDs and event wiring unless a change intentionally updates both `index.html` and `app.js`.
- Use semantic elements, associated labels, visible focus styles, keyboard-operable controls, and ARIA/live status text for dynamic feedback.
- Use DOM nodes, `textContent`, and `replaceChildren()` for untrusted event, routine, and file names. Do not build dynamic markup with `innerHTML` or inject untrusted values into `.ics` without escaping.
- Preserve external portal links and use `target="_blank"` with `rel="noopener noreferrer"` for new external links.
- Keep account access and data storage local to the browser; this static site has no server-backed authentication.

## Application behavior

- Events are stored encrypted under `unza-event-ledger-events-v1`; routine alarms are stored separately under `unza-event-ledger-routines-v1`. Never persist decrypted event/routine data or passwords in `localStorage`.
- Web Crypto uses AES-GCM with a PBKDF2-derived key and the account key exists only while logged in. Preserve logout/reload password requirements and forgotten-password behavior. Do not claim server-backed or compromised-device security.
- Uploaded files use IndexedDB database `unza-event-ledger-files-v1`, object store `files`, and a 25 MB per-file limit. Encrypt file bytes and metadata with the in-memory account key.
- Do not automatically expire events or files. The account reset is destructive and must continue to delete the account, events, routines, and IndexedDB files.
- Preserve separate event and routine schedulers, future-event validation, page-visible timers, Web Audio activation, Notification permission handling, vibration, and stop-alarm behavior.
- Routine occurrences repeat once, daily, or weekly on a selected weekday. Skip overdue occurrences while the app was closed and keep routine alarms browser-page-only.
- Calendar import/export must preserve `.ics` CRLF output, escaping, `VEVENT`, `UID`, `DTSTAMP`, `DTSTART`, and duplicate detection by title and start time.
- File links open or download from the current interaction. Keep the three-dot open/download/share/delete actions, Web Share fallback messages, and download behavior for unsupported or active-content types.
- Preserve capability checks and user-visible fallback/error messages for AudioContext, IndexedDB, Notifications, `localStorage`, FileReader, Blob URLs, and secure-context Web Crypto errors.

## PWA maintenance

- When app-shell assets change, update `service-worker.js` consistently: bump `CACHE_NAME`, update `APP_SHELL`, and keep the `app.js?v=<number>` cache entry and `index.html` script query in sync.
- Keep `manifest.webmanifest`, the icon files, and the offline app-shell cache aligned with the displayed app.

## Validation

- Run the focused pure-logic tests after changing `core.js` or testable app logic:

  ```bash
  node test/core.test.js
  ```

- Start the static site and verify the document response:

  ```bash
  python3 -m http.server 4173
  curl -I http://127.0.0.1:4173/
  ```

- Manually verify affected behavior in desktop and mobile-sized viewports. Exercise event/routine creation and deletion, alarm activation/cancellation, `.ics` import/export, file upload/open/download/share/delete, reset behavior, storage fallbacks, and responsive layout.
- Test alarms only when browser audio, notification, and vibration behavior can be observed safely. Do not leave test alarms running unattended.
- Before finishing, inspect `git diff` and ensure no unrelated files or generated test artifacts are changed.

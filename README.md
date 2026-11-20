# 🎓 MY UNILIFE(UNZA) — Student & Personal Portal

[![Launch Live App](https://shields.io)](https://github.io)
[![Project Wiki](https://shields.io)](https://github.com)

**MY UNILIFE(UNZA)** is an all-in-one academic and personal scheduling web application designed for University of Zambia students. It combines academic assessment tracking, UNZA Moodle calendar syncing, personal event reminders, document storage, and instant device alarms in a single browser-based portal.

---

## ✨ Key Features

* **🔐 Student Account Login & Encrypted Local Storage:** Local sign-in and registration using a 10-digit computer number format (starting with `2`) and a password that starts with `unza` and contains at least 6 characters. Both password fields include a show/hide control. Events and uploaded files are encrypted in browser storage using the account password.
* **♻️ Forgotten-password reset:** Reset the local account and create a new password. Resetting permanently deletes this browser's encrypted events and files; it cannot recover them.
* **🎓 Direct UNZA Moodle Calendar Sync:** Export your upcoming labs, tests, quizzes, and exams from UNZA Moodle as an `.ics` file and import them in one click to auto-populate your schedule with alarms.
* **📅 Dual Event Schedulers:**
  * **Academic Events:** Track **Labs**, **Tests**, **Quizzes**, **Exams**, **Assignments**, and **Academic Records**.
  * **Other Events:** Separately manage **Church Services**, **Work Shifts**, **Internship Programs**, **Important Letters**, and **Personal Appointments**.
* **🔔 Instant Device Alarms & Native Calendar Export:**
  * Plays a loud polyphonic ringtone, vibrates supported mobile devices, and triggers system notifications at the exact scheduled second.
  * Includes a **📲 Phone Alarm** button on every event to export a native `.ics` trigger directly into your phone's built-in calendar or alarm app.
* **📁 Course Files & Document Manager:** Upload, organize, and download lecture notes, lab manuals, past papers, and important letters directly from the dashboard.

---

## 🚀 How to Use

1. **Open the Live Portal:** Visit [https://github.io](https://github.io).
2. **Create an Account:**
   * The login screen appears when the app opens.
   * Select **Create account**.
   * Enter a **10-digit computer number** starting with `2` (e.g., `2024067832`).
   * Create a **password starting with `unza`** that is at least 6 characters long. Letters and digits may be added after `unza`.
3. **Log In:** Use your saved computer number and password on the login screen.
4. **Activate Alarms:** Click **Activate alarm sound** at the top of the dashboard so your browser unlocks audio ringtones and notifications.
5. **Add Events or Sync Moodle:** Schedule academic or personal events manually, or click **Export from Moodle** and upload your `.ics` calendar file.

### Install on your phone

You can install the portal directly from its website without using the Play Store. Open the live site over HTTPS in your phone's browser. On Android, choose **Install app** if it appears, or open the browser menu and choose **Install app** or **Add to Home screen**. On iPhone, open the site in Safari, tap **Share**, then **Add to Home Screen**. The installed app opens in its own window, and the site shell is cached for offline use after the first successful load.

The app must be served from HTTPS (such as GitHub Pages) or localhost for installation and offline support. Events and files remain stored in the browser on that device; installing the app does not upload or sync them.

### Local data protection

The app encrypts saved events and files in this browser using AES-GCM with a key derived from the account password via PBKDF2. Use the same browser profile and computer number to access them. The password is not recoverable: if it is forgotten, encrypted data cannot be decrypted. The reset option deletes the local account and encrypted events/files so a new account can be created; it does not restore the old data. Although the form accepts passwords from 6 characters, the fixed `unza` prefix leaves little room for a short password; use a much longer, unique password for sensitive information. This is local-device protection, not server-backed account security; someone who controls the device/browser or runs modified app code can still access data while it is unlocked. Use the app over HTTPS (GitHub Pages does this) or localhost so browser cryptography is available.

---

## 🛠️ Built With

* **HTML5 & CSS3** — Responsive dark-glass interface with custom campus styling.
* **Vanilla JavaScript (ES5/ES6)** — Client-side authentication, Web Audio API ringtone synthesizer, `.ics` calendar parser/generator, and `localStorage` persistence.
* **GitHub Pages** — Static web hosting.

---

## 📂 Repository Structure

```text
repo-event-ledger/
├── index.html             # Application interface and install prompt
├── app.js                 # Application logic
├── core.js                # Shared pure functions
├── icon.svg               # Browser tab icon
├── icon-192.png           # Home screen icon
├── icon-512.png           # Install and maskable icon
├── manifest.webmanifest   # Installable web app metadata
├── service-worker.js      # Offline app-shell caching
├── test/
│   └── core.test.js       # Core logic tests
└── README.md              # Project overview and documentation
```

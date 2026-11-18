# 🎓 Event Ledger — UNZA Student & Personal Portal

[![Launch Live App](https://shields.io)](https://github.io)
[![Project Wiki](https://shields.io)](https://github.com)

**Event Ledger** is an all-in-one academic and personal scheduling web application designed for University of Zambia (UNZA) students. It combines academic assessment tracking, UNZA Moodle calendar syncing, personal event reminders, document storage, and instant device alarms in a single browser-based portal.

---

## ✨ Key Features

* **🔐 Student Account Login & Private Storage:** Local sign-in and registration using a 10-digit computer number format (starting with `2`) and a password that starts with `unza` and contains at least 6 characters.
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

---

## 🛠️ Built With

* **HTML5 & CSS3** — Responsive dark-glass interface with custom campus styling.
* **Vanilla JavaScript (ES5/ES6)** — Client-side authentication, Web Audio API ringtone synthesizer, `.ics` calendar parser/generator, and `localStorage` persistence.
* **GitHub Pages** — Static web hosting.

---

## 📂 Repository Structure

```text
repo-event-ledger/
├── index.html       # Complete single-page application (UI, styles, and logic)
├── unza.jpg         # Campus background image
└── README.md        # Project overview and documentation
```

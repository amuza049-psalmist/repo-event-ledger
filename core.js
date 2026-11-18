// Pure logic for the UNZA Event Ledger: validation, formatting, ICS parsing,
// encryption helpers, and alarm scheduling. No DOM access here, so these
// functions can run in Node for tests as well as in the browser.
"use strict";

const ENCRYPTION_ITERATIONS = 310000;

function isValidComputerNumber(value) { return /^2\d{9}$/.test(value); }
function isValidPassword(value) { return typeof value === "string" && value.startsWith("unza") && value.length >= 6; }

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Invalid date" : date.toLocaleString();
}

function makeId() { return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9); }

function escapeICS(value) { return String(value || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;"); }

function parseICS(text) {
  const unfolded = text.replace(/\r?\n[ \t]/g, "").split(/\r?\n/), items = [];
  let item = null;
  for (const line of unfolded) {
    if (line === "BEGIN:VEVENT") { item = {}; continue; }
    if (line === "END:VEVENT" && item) {
      const start = item.DTSTART;
      if (start) {
        const value = start.split(":").pop();
        let date = null;
        if (/^\d{8}$/.test(value)) {
          date = new Date(value.slice(0, 4) + "-" + value.slice(4, 6) + "-" + value.slice(6, 8) + "T00:00:00");
        } else if (/^\d{8}T\d{6}Z?$/.test(value)) {
          date = new Date(value.slice(0, 4) + "-" + value.slice(4, 6) + "-" + value.slice(6, 8) + "T" + value.slice(9, 11) + ":" + value.slice(11, 13) + ":" + value.slice(13, 15) + (value.endsWith("Z") ? "Z" : ""));
        }
        if (date && !Number.isNaN(date.getTime())) items.push({
          title: (item.SUMMARY || "Imported event").replace(/\\([nN])/g, " ").replace(/\\([,;\\])/g, "$1"),
          when: date.toISOString(),
          details: (item.DESCRIPTION || "").replace(/\\n/g, " ").replace(/\\,/g, ",").slice(0, 500)
        });
      }
      item = null; continue;
    }
    if (item) {
      const colon = line.indexOf(":");
      if (colon > 0) {
        const key = line.slice(0, colon).split(";")[0].toUpperCase();
        if (key === "DTSTART" || key === "SUMMARY" || key === "DESCRIPTION") item[key] = line.slice(colon + 1);
      }
    }
  }
  return items;
}

function buildICS(items) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//UNZA Event Ledger//EN", "CALSCALE:GREGORIAN"];
  items.forEach(item => {
    const date = new Date(item.when);
    if (Number.isNaN(date.getTime())) return;
    const stamp = date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    lines.push("BEGIN:VEVENT", "UID:" + (item.id || "unza-event-ledger") + "@unza-event-ledger", "DTSTAMP:" + stamp, "DTSTART:" + stamp,
      "SUMMARY:" + escapeICS(item.title), "DESCRIPTION:" + escapeICS(item.details || ""),
      "BEGIN:VALARM", "TRIGGER:-PT0M", "ACTION:DISPLAY", "DESCRIPTION:" + escapeICS(item.title), "END:VALARM", "END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

// Alarm scheduling: returns the first event that is due (in the past) and has
// not rung yet, or null. Pure given the events array and current time.
function findDueEvent(events, now) {
  return events.find(event => !event.alarmedAt && new Date(event.when).getTime() <= now) || null;
}

// Encryption helpers (browser Web Crypto; also available in Node 20+).
const textEncoder = new TextEncoder();
function toBase64(bytes) { let binary = ""; for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000)); return btoa(binary); }
function fromBase64(value) { const binary = atob(value), bytes = new Uint8Array(binary.length); for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index); return bytes; }

async function deriveEncryptionKey(password, salt) {
  if (!globalThis.crypto?.subtle) throw new Error("Secure browser encryption is unavailable. Open the app over HTTPS or localhost.");
  const material = await crypto.subtle.importKey("raw", textEncoder.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: ENCRYPTION_ITERATIONS, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function encryptBytes(bytes, key) { const iv = crypto.getRandomValues(new Uint8Array(12)); const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, bytes); return { iv, data }; }
async function decryptBytes(record, key) { return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: record.iv }, key, record.data)); }
async function sealJson(value, key) { const encrypted = await encryptBytes(textEncoder.encode(JSON.stringify(value)), key); return JSON.stringify({ version: 2, iv: toBase64(encrypted.iv), data: toBase64(new Uint8Array(encrypted.data)) }); }
async function openJson(record, key) { const bytes = await decryptBytes({ iv: fromBase64(record.iv), data: fromBase64(record.data) }, key); return JSON.parse(new TextDecoder().decode(bytes)); }

const core = { ENCRYPTION_ITERATIONS, isValidComputerNumber, isValidPassword, formatDate, makeId, escapeICS, parseICS, buildICS, findDueEvent, toBase64, fromBase64, deriveEncryptionKey, encryptBytes, decryptBytes, sealJson, openJson };

// Browser: expose on window; Node (tests): export as CommonJS.
if (typeof window !== "undefined") {
  window.Core = core;
} else if (typeof module !== "undefined") {
  module.exports = core;
}

"use strict";

const CACHE_NAME = "unza-event-ledger-pwa-v15";
const APP_SHELL = ["./", "./index.html", "./core.js", "./app.js?v=15", "./icon.svg", "./icon-192.png", "./icon-512.png", "./unza-library.jpg", "./manifest.webmanifest"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith("unza-event-ledger-pwa-") && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    let response;
    try {
      response = await fetch(event.request);
    } catch (error) {
      if (cached) return cached;
      if (event.request.mode === "navigate") {
        const appShell = await caches.match("./index.html");
        if (appShell) return appShell;
      }
      throw error;
    }
    if (response.ok && response.type === "basic") {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(event.request, response.clone());
      } catch (error) {
        console.error("Could not cache app content for offline use.", error);
      }
    }
    return response;
  })());
});

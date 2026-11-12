// মাছরাঙা পোর্টালের service worker: app হিসেবে install করা যায়, আর নেট না থাকলে "অফলাইন" পেজ দেখায়।
// পেজ বা API এর ডাটা ক্যাশ করি না (ব্যক্তিগত আর সবসময় নতুন থাকা দরকার); শুধু অফলাইন পেজ আর আইকন।
const CACHE = "machranga-v1";
const OFFLINE = "/offline.html";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([OFFLINE, "/icon-192.png"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE)));
});

const CACHE = 'everything-shell-v4';
const SHELL = ['/', '/index.html', '/styles.css', '/fitness.css', '/discover.css', '/app.js', '/courses.js', '/planner.js', '/sync.js', '/fitness.js', '/discover.js', '/personal.js', '/manifest.webmanifest', '/app-icon.svg', '/app-icon-192.png', '/app-icon-512.png', '/materials.css'];
const OPTIONAL = ['/vendor/pdf.mjs', '/vendor/pdf.worker.mjs'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('everything-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

async function loadAsset(request, pathname) {
  let response;
  try {
    response = await fetch(request);
  } catch {
    // An interrupted request can still use the most recent successful response.
  }
  const key = pathname === '/' ? '/index.html' : pathname;
  if (response?.ok) {
    try {
      const cache = await caches.open(CACHE);
      await cache.put(key, response.clone());
    } catch {
      // Storage limits must never hide a working online response.
    }
    return response;
  }
  if (!response || response.status >= 500) {
    try {
      const saved = await (await caches.open(CACHE)).match(key);
      if (saved) return saved;
    } catch { /* Return the original failure. */ }
  }
  return response ?? Response.error();
}

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin ||
      !(SHELL.includes(url.pathname) || OPTIONAL.includes(url.pathname))) return;
  event.respondWith(loadAsset(event.request, url.pathname));
});

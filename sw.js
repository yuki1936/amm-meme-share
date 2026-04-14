const THUMB_CACHE = 'thumb-cache-v1';
const IMAGE_CACHE = 'image-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Basic caching strategy:
// - Thumbnails (/thumbs/) -> cache-first (serve from cache if present, otherwise fetch and cache)
// - Images (/images/) -> network-first when requested (fetch, respond, then cache), so viewer gets fresh copy and it's cached for later
// - Other requests -> default fetch

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/thumbs/')) {
    event.respondWith(
      caches.open(THUMB_CACHE).then(cache =>
        cache.match(event.request).then(resp => resp || fetch(event.request).then(fresp => { cache.put(event.request, fresp.clone()); return fresp; }).catch(()=>fetch(event.request)))
      )
    );
    return;
  }

  if (url.pathname.startsWith('/images/')) {
    event.respondWith(
      fetch(event.request).then(resp => {
        // cache a copy for later
        caches.open(IMAGE_CACHE).then(c=>c.put(event.request, resp.clone()));
        return resp;
      }).catch(()=>{
        // fallback to cache
        return caches.open(IMAGE_CACHE).then(c=>c.match(event.request));
      })
    );
    return;
  }

  // default: try network then cache
  event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));
});

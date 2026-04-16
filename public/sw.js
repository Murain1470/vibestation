const PREVIEW_PATH = '/preview/';
let previewHTML = '';

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SET_HTML') {
    previewHTML = event.data.html;
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage('ok');
    }
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname === PREVIEW_PATH || url.pathname.startsWith(PREVIEW_PATH)) {
    event.respondWith(new Response(previewHTML, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }));
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

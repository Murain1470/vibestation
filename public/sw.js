const PREVIEW_PATH = '/preview/';

let previewData = { html: '', assets: {}, keys: {} };

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SET_PREVIEW') {
    previewData = event.data.data;
    // Reply to confirm receipt
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage('ok');
    }
  }
});

function buildHTML() {
  let html = previewData.html;
  if (!html) return html;

  let injection = '<script>\n';

  const keys = previewData.keys || {};
  const hasKeys = Object.values(keys).some(v => v && String(v).trim());
  if (hasKeys) {
    injection += 'window.__VS_KEYS__ = ' + JSON.stringify(keys) + ';\n';
  }

  const assetMap = previewData.assets || {};
  if (Object.keys(assetMap).length > 0) {
    injection += `(function(){
var map = ${JSON.stringify(assetMap)};
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('[src]').forEach(function(el){
    var v = el.getAttribute('src'); if (v && map[v]) el.setAttribute('src', map[v]);
  });
});
})();\n`;
  }

  injection += '<\/script>';

  if (html.includes('</head>')) {
    html = html.replace('</head>', injection + '</head>');
  } else {
    html = injection + html;
  }
  return html;
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname === PREVIEW_PATH || url.pathname.startsWith(PREVIEW_PATH)) {
    event.respondWith(new Response(buildHTML(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }));
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

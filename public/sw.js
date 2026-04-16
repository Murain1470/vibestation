const PREVIEW_PATH = '/preview/';

let previewHTML = '';
let assetMap = {};

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SET_HTML') previewHTML = event.data.html;
  if (event.data?.type === 'SET_ASSETS') assetMap = event.data.assets || {};
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname === PREVIEW_PATH || url.pathname.startsWith(PREVIEW_PATH)) {
    let html = previewHTML;

    let injection = '<script>\n';
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

    event.respondWith(new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }));
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

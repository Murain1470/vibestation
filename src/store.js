import { create } from 'zustand';
import { saveSnapshot, getSnapshots, saveProject, getProjects, deleteProject } from './db';

// Send HTML to SW and wait for confirmation via MessageChannel
export function sendHTMLToSW(html) {
  return new Promise((resolve) => {
    const sw = navigator.serviceWorker?.controller;
    if (!sw) { resolve(); return; }
    const channel = new MessageChannel();
    channel.port1.onmessage = () => resolve();
    sw.postMessage({ type: 'SET_HTML', html }, [channel.port2]);
    setTimeout(resolve, 800); // fallback
  });
}

// Build final HTML with keys and assets injected
export function buildPreviewHTML(html, assets, keys) {
  if (!html) return html;
  let injection = '<script>\n';

  // Inject keys
  const hasKeys = keys && Object.values(keys).some(v => v && String(v).trim());
  if (hasKeys) {
    injection += 'window.__VS_KEYS__ = ' + JSON.stringify(keys) + ';\n';
  }

  // Inject asset map
  if (assets && Object.keys(assets).length > 0) {
    injection += `(function(){
var map = ${JSON.stringify(assets)};
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('[src]').forEach(function(el){
    var v = el.getAttribute('src'); if (v && map[v]) el.setAttribute('src', map[v]);
  });
});
})();\n`;
  }

  injection += '<\/script>';

  if (html.includes('</head>')) {
    return html.replace('</head>', injection + '</head>');
  }
  return injection + html;
}

export const useStore = create((set, get) => ({
  swReady: false,
  initSW: async () => {
    if (!('serviceWorker' in navigator)) return;
    try {
      await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      set({ swReady: true });
    } catch (e) { console.error('SW failed', e); }
  },

  projects: [],
  currentProjectId: null,

  loadProjects: async () => {
    const projects = await getProjects();
    set({ projects });
  },

  createProject: async (name) => {
    const id = 'proj_' + Date.now();
    const project = { id, name, createdAt: Date.now(), updatedAt: Date.now(), thumbnail: null };
    await saveProject(project);
    const projects = await getProjects();
    set({ projects, currentProjectId: id, snapshots: [], currentSnapshotIndex: -1, code: '' });
    return id;
  },

  openProject: async (id) => {
    set({ currentProjectId: id });
    const snaps = await getSnapshots(id);
    const idx = snaps.length - 1;
    const code = snaps.length > 0 ? snaps[idx].html : '';
    set({ snapshots: snaps, currentSnapshotIndex: idx, code });
  },

  removeProject: async (id) => {
    await deleteProject(id);
    const projects = await getProjects();
    set({ projects });
  },

  updateProjectThumbnail: async (id, thumbnail) => {
    const { projects } = get();
    const proj = projects.find(p => p.id === id);
    if (!proj) return;
    const updated = { ...proj, thumbnail, updatedAt: Date.now() };
    await saveProject(updated);
    set({ projects: projects.map(p => p.id === id ? updated : p) });
  },

  code: '',
  setCode: (code) => set({ code }),
  snapshots: [],
  currentSnapshotIndex: -1,

  sync: async () => {
    const { code, currentProjectId, snapshots } = get();
    if (!code.trim() || !currentProjectId) return;
    const last = snapshots[snapshots.length - 1];
    if (last && last.html === code) return;
    const id = await saveSnapshot(currentProjectId, code);
    const snap = { id, projectId: currentProjectId, html: code, createdAt: Date.now() };
    const newSnaps = [...snapshots, snap];
    set({ snapshots: newSnaps, currentSnapshotIndex: newSnaps.length - 1 });
    const { projects } = get();
    const proj = projects.find(p => p.id === currentProjectId);
    if (proj) await saveProject({ ...proj, updatedAt: Date.now() });
  },

  jumpToSnapshot: (index) => {
    const { snapshots } = get();
    if (index < 0 || index >= snapshots.length) return;
    set({ currentSnapshotIndex: index, code: snapshots[index].html });
  },
}));

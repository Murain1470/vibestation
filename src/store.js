import { create } from 'zustand';
import { saveSnapshot, getSnapshots, saveProject, getProjects, deleteProject } from './db';

export function sendPreviewToSW(html, assets, keys) {
  const sw = navigator.serviceWorker?.controller;
  if (sw) sw.postMessage({ type: 'SET_PREVIEW', data: { html, assets: assets || {}, keys: keys || {} } });
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

import { openDB } from 'idb';

const DB_NAME = 'vibestation';
const DB_VERSION = 2;

function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains('snapshots')) {
        const s = db.createObjectStore('snapshots', { keyPath: 'id', autoIncrement: true });
        s.createIndex('projectId', 'projectId');
      }
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' });
      }
    },
  });
}

// ── Projects ─────────────────────────────────────────────
export async function getProjects() {
  const db = await getDB();
  const all = await db.getAll('projects');
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function saveProject(project) {
  const db = await getDB();
  await db.put('projects', project);
}

export async function deleteProject(id) {
  const db = await getDB();
  const tx = db.transaction(['projects', 'snapshots'], 'readwrite');
  await tx.objectStore('projects').delete(id);
  const snaps = await tx.objectStore('snapshots').index('projectId').getAll(id);
  await Promise.all(snaps.map(s => tx.objectStore('snapshots').delete(s.id)));
  await tx.done;
}

// ── Snapshots ────────────────────────────────────────────
export async function saveSnapshot(projectId, html) {
  const db = await getDB();
  const id = await db.add('snapshots', { projectId, html, createdAt: Date.now() });
  return id;
}

export async function getSnapshots(projectId) {
  const db = await getDB();
  const all = await db.getAllFromIndex('snapshots', 'projectId', projectId);
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

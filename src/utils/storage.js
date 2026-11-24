/**
 * Kairos Digital Lab — 本機優先儲存引擎 (IndexedDB + LocalStorage)
 * 免費版最多保留 2 個考試工作區分頁，無預設示範題庫
 */

const DB_NAME = 'KairosStudyLabDB_v2';
const DB_VERSION = 1;
const STORE_PROJECTS = 'exam_projects';
const PREFS_KEY = 'kairos_study_prefs_v2';

export const MAX_FREE_PROJECTS = 2;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllProjects() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readonly');
    const store = tx.objectStore(STORE_PROJECTS);
    const req = store.getAll();
    req.onsuccess = () => {
      const items = req.result || [];
      items.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveProject(project) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    const store = tx.objectStore(STORE_PROJECTS);
    const updated = { ...project, updatedAt: Date.now() };
    const req = store.put(updated);
    req.onsuccess = () => resolve(updated);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteProjectById(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    const store = tx.objectStore(STORE_PROJECTS);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export function loadPreferences() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { darkMode: false, activeTabId: null, activeDomain: 'study' };
    return { darkMode: false, activeTabId: null, activeDomain: 'study', ...JSON.parse(raw) };
  } catch {
    return { darkMode: false, activeTabId: null, activeDomain: 'study' };
  }
}

export function savePreferences(prefs) {
  try {
    const current = loadPreferences();
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...current, ...prefs }));
  } catch {
    // Ignore storage quota errors
  }
}

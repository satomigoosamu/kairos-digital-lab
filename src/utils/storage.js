/**
 * Kairos Digital Lab — 本機優先儲存引擎 (IndexedDB + LocalStorage)
 * 免費版最多保留 2 個考試工作區分頁，首次進入預設為深色考場模式
 */

const DB_NAME = 'KairosStudyLabDB_v2';
const DB_VERSION = 1;
const STORE_PROJECTS = 'exam_projects';
const PREFS_KEY = 'kairos_study_prefs_v3';

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
    tx.oncomplete ??= () => db.close();
  });
}

export async function saveProject(project) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    const store = tx.objectStore(STORE_PROJECTS);
    const updated = { ...project, updatedAt: Date.now() };
    const req = store.put(updated);
    tx.oncomplete = () => { db.close(); resolve(updated); };
    tx.onabort = () => { db.close(); reject(tx.error || new Error("儲存交易已取消")); };
    req.onerror = () => reject(req.error);
    tx.oncomplete ??= () => db.close();
  });
}

export async function deleteProjectById(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    const store = tx.objectStore(STORE_PROJECTS);
    const req = store.delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onabort = () => { db.close(); reject(tx.error || new Error("刪除交易已取消")); };
    req.onerror = () => reject(req.error);
    tx.oncomplete ??= () => db.close();
  });
}

export function loadPreferences() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { darkMode: true, activeTabId: null, activeDomain: 'study' };
    return { darkMode: true, activeTabId: null, activeDomain: 'study', ...JSON.parse(raw) };
  } catch {
    return { darkMode: true, activeTabId: null, activeDomain: 'study' };
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

export async function restoreProjects(projects) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    const store = tx.objectStore(STORE_PROJECTS);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onabort = () => { db.close(); reject(tx.error || new Error('還原交易取消')); };
    store.clear();
    projects.forEach(project => store.put(project));
  });
}

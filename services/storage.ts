
import { JournalEntry, Goal, Task, UserStats } from '../types';

const STORAGE_KEYS = {
  ENTRIES: 'reflectai_entries',
  GOALS: 'reflectai_goals',
  TASKS: 'reflectai_tasks',
  STATS: 'reflectai_stats',
  THEME: 'reflectai_theme',
  ONBOARDING: 'reflectai_onboarding_done'
};

const DB_NAME = 'ReflectAIAudioDB';
const STORE_NAME = 'audio_recordings';

// --- Local Storage Helpers ---

export const saveLocalData = (
  entries: JournalEntry[],
  goals: Goal[],
  tasks: Task[],
  stats: UserStats
) => {
  try {
    localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  } catch (e) {
    console.error("Failed to save to localStorage", e);
  }
};

export const loadLocalData = () => {
  try {
    const entries = JSON.parse(localStorage.getItem(STORAGE_KEYS.ENTRIES) || 'null');
    const goals = JSON.parse(localStorage.getItem(STORAGE_KEYS.GOALS) || 'null');
    const tasks = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || 'null');
    const stats = JSON.parse(localStorage.getItem(STORAGE_KEYS.STATS) || 'null');
    const onboardingDone = localStorage.getItem(STORAGE_KEYS.ONBOARDING) === 'true';

    return { entries, goals, tasks, stats, onboardingDone };
  } catch (e) {
    console.error("Failed to load from localStorage", e);
    return { entries: null, goals: null, tasks: null, stats: null, onboardingDone: false };
  }
};

export const setOnboardingComplete = () => {
    localStorage.setItem(STORAGE_KEYS.ONBOARDING, 'true');
};

// --- IndexedDB for Audio ---

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

export const saveAudioBlob = async (id: string, blob: Blob): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(blob, id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getAudioBlob = async (id: string): Promise<Blob | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

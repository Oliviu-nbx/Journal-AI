
import { JournalEntry, Goal, Task, UserStats } from '../types';

const STORAGE_KEYS = {
  ENTRIES: 'reflectai_entries',
  GOALS: 'reflectai_goals',
  TASKS: 'reflectai_tasks',
  STATS: 'reflectai_stats',
  THEME: 'reflectai_theme',
  ONBOARDING: 'reflectai_onboarding_done',
  STORAGE_MODE: 'reflectai_storage_mode', // 'local' | 'cloud'
  LAST_STORAGE_CHANGE: 'reflectai_last_storage_change',
  GDRIVE_CLIENT: 'reflectai_gdrive_client_id',
  GDRIVE_KEY: 'reflectai_gdrive_api_key'
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
    const storageMode = localStorage.getItem(STORAGE_KEYS.STORAGE_MODE) || 'local';

    return { entries, goals, tasks, stats, onboardingDone, storageMode };
  } catch (e) {
    console.error("Failed to load from localStorage", e);
    return { entries: null, goals: null, tasks: null, stats: null, onboardingDone: false, storageMode: 'local' };
  }
};

export const saveImportedData = (data: any) => {
    if (data.entries) localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(data.entries));
    if (data.goals) localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(data.goals));
    if (data.tasks) localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(data.tasks));
    if (data.stats) localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(data.stats));
}

export const clearLocalData = () => {
    // We clear data but keep settings/auth
    localStorage.removeItem(STORAGE_KEYS.ENTRIES);
    localStorage.removeItem(STORAGE_KEYS.GOALS);
    localStorage.removeItem(STORAGE_KEYS.TASKS);
    localStorage.removeItem(STORAGE_KEYS.STATS);
    
    // Clear IndexedDB
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => console.log("Audio DB Cleared");
}

export const setOnboardingComplete = () => {
    localStorage.setItem(STORAGE_KEYS.ONBOARDING, 'true');
};

export const setStorageMode = (mode: 'local' | 'cloud') => {
    localStorage.setItem(STORAGE_KEYS.STORAGE_MODE, mode);
    localStorage.setItem(STORAGE_KEYS.LAST_STORAGE_CHANGE, Date.now().toString());
}

export const canChangeStorage = (): boolean => {
    const last = localStorage.getItem(STORAGE_KEYS.LAST_STORAGE_CHANGE);
    if(!last) return true;
    const diff = Date.now() - parseInt(last);
    return diff > 86400000; // 24 hours
}

export const getTimeUntilChange = (): string => {
    const last = localStorage.getItem(STORAGE_KEYS.LAST_STORAGE_CHANGE);
    if(!last) return "";
    const diff = Date.now() - parseInt(last);
    const remaining = 86400000 - diff;
    const hours = Math.floor(remaining / 3600000);
    const mins = Math.floor((remaining % 3600000) / 60000);
    return `${hours}h ${mins}m`;
}

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

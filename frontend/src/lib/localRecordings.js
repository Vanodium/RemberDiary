const DB_NAME = 'rember';
const DB_VERSION = 1;
const STORE_NAME = 'recordings';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('recordedAt', 'recordedAt');
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbRequest(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore(mode, fn) {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const result = await fn(store);
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return result;
  } finally {
    db.close();
  }
}

export async function saveLocalRecording({ id, blob, mimeType, durationMs, recordedAt }) {
  const entry = {
    id: id ?? crypto.randomUUID(),
    blob,
    mimeType,
    durationMs,
    recordedAt,
    serverId: null,
    uploadStatus: 'pending',
  };

  await withStore('readwrite', (store) => store.put(entry));
  return entry.id;
}

export async function updateLocalRecording(id, patch) {
  await withStore('readwrite', async (store) => {
    const existing = await idbRequest(store.get(id));
    if (existing) {
      store.put({ ...existing, ...patch });
    }
  });
}

export async function getLocalRecordings() {
  return withStore('readonly', (store) => idbRequest(store.getAll()));
}

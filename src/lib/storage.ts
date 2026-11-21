import type {
  AudiobookMediaBlobs,
  AudiobookSession,
  MirrorSession,
  SessionMediaBlobs,
} from '../types/mirror';

const DB_NAME = 'five_minute_mirror_db';
const DB_VERSION = 2;
const SESSIONS_STORE = 'sessions';
const MEDIA_STORE = 'media';
const AUDIOBOOK_SESSIONS_STORE = 'audiobook_sessions';
const AUDIOBOOK_MEDIA_STORE = 'audiobook_media';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
        db.createObjectStore(SESSIONS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(MEDIA_STORE)) {
        db.createObjectStore(MEDIA_STORE, { keyPath: 'sessionId' });
      }
      if (!db.objectStoreNames.contains(AUDIOBOOK_SESSIONS_STORE)) {
        db.createObjectStore(AUDIOBOOK_SESSIONS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(AUDIOBOOK_MEDIA_STORE)) {
        db.createObjectStore(AUDIOBOOK_MEDIA_STORE, { keyPath: 'sessionId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveSession(session: MirrorSession): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSIONS_STORE, 'readwrite');
    tx.objectStore(SESSIONS_STORE).put(session);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveMediaBlobs(media: SessionMediaBlobs): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MEDIA_STORE, 'readwrite');
    tx.objectStore(MEDIA_STORE).put(media);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllSessions(): Promise<MirrorSession[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSIONS_STORE, 'readonly');
    const request = tx.objectStore(SESSIONS_STORE).getAll();
    request.onsuccess = () => {
      const items = (request.result as MirrorSession[]) || [];
      items.sort((a, b) => b.createdAt - a.createdAt);
      resolve(items);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getSession(id: string): Promise<MirrorSession | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSIONS_STORE, 'readonly');
    const request = tx.objectStore(SESSIONS_STORE).get(id);
    request.onsuccess = () => resolve(request.result as MirrorSession | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function getMediaBlobs(sessionId: string): Promise<SessionMediaBlobs | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MEDIA_STORE, 'readonly');
    const request = tx.objectStore(MEDIA_STORE).get(sessionId);
    request.onsuccess = () => resolve(request.result as SessionMediaBlobs | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteSession(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([SESSIONS_STORE, MEDIA_STORE], 'readwrite');
    tx.objectStore(SESSIONS_STORE).delete(id);
    tx.objectStore(MEDIA_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveAudiobookSession(session: AudiobookSession): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIOBOOK_SESSIONS_STORE, 'readwrite');
    tx.objectStore(AUDIOBOOK_SESSIONS_STORE).put(session);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveAudiobookMedia(media: AudiobookMediaBlobs): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIOBOOK_MEDIA_STORE, 'readwrite');
    tx.objectStore(AUDIOBOOK_MEDIA_STORE).put(media);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllAudiobookSessions(): Promise<AudiobookSession[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIOBOOK_SESSIONS_STORE, 'readonly');
    const request = tx.objectStore(AUDIOBOOK_SESSIONS_STORE).getAll();
    request.onsuccess = () => {
      const items = (request.result as AudiobookSession[]) || [];
      items.sort((a, b) => b.createdAt - a.createdAt);
      resolve(items);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getAudiobookMedia(
  sessionId: string
): Promise<AudiobookMediaBlobs | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIOBOOK_MEDIA_STORE, 'readonly');
    const request = tx.objectStore(AUDIOBOOK_MEDIA_STORE).get(sessionId);
    request.onsuccess = () => resolve(request.result as AudiobookMediaBlobs | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteAudiobookSession(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      [AUDIOBOOK_SESSIONS_STORE, AUDIOBOOK_MEDIA_STORE],
      'readwrite'
    );
    tx.objectStore(AUDIOBOOK_SESSIONS_STORE).delete(id);
    tx.objectStore(AUDIOBOOK_MEDIA_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

import type { Track } from "./types";

const DB_NAME = "vinux-offline";
const STORE = "songs";
const VERSION = 1;

export interface DownloadedSong {
  track: Track;
  blob: Blob;
  addedAt: number;
  size: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "videoId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbPut(videoId: string, value: DownloadedSong): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ videoId, ...value });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbGet(videoId: string): Promise<DownloadedSong | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(videoId);
    req.onsuccess = () => resolve(req.result as DownloadedSong | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function idbAll(): Promise<DownloadedSong[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      const rows = (req.result as { videoId: string; track: Track; blob: Blob; addedAt: number; size: number }[]) || [];
      resolve(
        rows
          .map((r) => ({ track: r.track, blob: r.blob, addedAt: r.addedAt, size: r.size }))
          .sort((a, b) => b.addedAt - a.addedAt),
      );
    };
    req.onerror = () => reject(req.error);
  });
}

export async function idbDelete(videoId: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(videoId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

import { DownloadedBookMeta, DownloadedBooksStore } from '../types/catalog';

const DB_NAME = 'mulberry_storage_db';
const DB_VERSION = 1;
const HANDLE_STORE = 'handles';
const FALLBACK_BIN_STORE = 'binaries';
const FALLBACK_META_STORE = 'metadata';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(HANDLE_STORE)) {
        db.createObjectStore(HANDLE_STORE);
      }
      if (!db.objectStoreNames.contains(FALLBACK_BIN_STORE)) {
        db.createObjectStore(FALLBACK_BIN_STORE);
      }
      if (!db.objectStoreNames.contains(FALLBACK_META_STORE)) {
        db.createObjectStore(FALLBACK_META_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGet<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet<T>(storeName: string, key: string, value: T): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(storeName: string, key: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

let activeDirHandle: FileSystemDirectoryHandle | null = null;
let currentFolderName: string = '';

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * Initializes directory handle from IndexedDB if available.
 */
export async function initializeStorage(): Promise<{
  isConfigured: boolean;
  folderName: string;
  isNative: boolean;
}> {
  if (isFileSystemAccessSupported()) {
    try {
      const savedHandle = await idbGet<FileSystemDirectoryHandle>(HANDLE_STORE, 'root_directory');
      if (savedHandle) {
        activeDirHandle = savedHandle;
        currentFolderName = savedHandle.name;
        return { isConfigured: true, folderName: savedHandle.name, isNative: true };
      }
    } catch {
      // Fallback
    }
  }

  // Check fallback store
  try {
    const fallbackMeta = await idbGet<DownloadedBooksStore>(FALLBACK_META_STORE, 'downloaded_books');
    if (fallbackMeta) {
      currentFolderName = fallbackMeta.folderName || 'Internal Storage';
      return { isConfigured: true, folderName: currentFolderName, isNative: false };
    }
  } catch {
    // Ignore
  }

  return { isConfigured: false, folderName: '', isNative: false };
}

/**
 * Prompts user to select a folder on their device using File System Access API.
 */
export async function promptSelectDeviceFolder(): Promise<{ folderName: string; isNative: boolean }> {
  if (isFileSystemAccessSupported()) {
    try {
      // @ts-expect-error File System Access API
      const dirHandle: FileSystemDirectoryHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
      });
      activeDirHandle = dirHandle;
      currentFolderName = dirHandle.name;
      await idbSet(HANDLE_STORE, 'root_directory', dirHandle);

      // Verify or initialize downloaded_books.json in folder root
      await ensureMetadataFileInDirectory(dirHandle);

      return { folderName: dirHandle.name, isNative: true };
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        throw new Error('Selection cancelled');
      }
      // If error occurs, fall back to internal storage
    }
  }

  // Fallback storage initialization
  currentFolderName = 'Mulberry Vault';
  const defaultStore: DownloadedBooksStore = {
    version: 1,
    lastSync: Date.now(),
    folderName: currentFolderName,
    books: [],
  };
  await idbSet(FALLBACK_META_STORE, 'downloaded_books', defaultStore);
  return { folderName: currentFolderName, isNative: false };
}

/**
 * Ensures downloaded_books.json exists in directory root.
 */
async function ensureMetadataFileInDirectory(dir: FileSystemDirectoryHandle): Promise<void> {
  try {
    await dir.getFileHandle('downloaded_books.json');
  } catch {
    // File doesn't exist yet, create it
    const fileHandle = await dir.getFileHandle('downloaded_books.json', { create: true });
    const writable = await fileHandle.createWritable();
    const defaultMeta: DownloadedBooksStore = {
      version: 1,
      lastSync: Date.now(),
      folderName: dir.name,
      books: [],
    };
    await writable.write(JSON.stringify(defaultMeta, null, 2));
    await writable.close();
  }
}

/**
 * Reads downloaded_books.json from folder root.
 */
export async function getDownloadedBooksStore(): Promise<DownloadedBooksStore> {
  if (activeDirHandle) {
    try {
      // Verify permission
      // @ts-expect-error File System Access
      if (activeDirHandle.queryPermission) {
        // @ts-expect-error File System Access
        const perm = await activeDirHandle.queryPermission({ mode: 'readwrite' });
        if (perm !== 'granted') {
          // @ts-expect-error File System Access
          const req = await activeDirHandle.requestPermission({ mode: 'readwrite' });
          if (req !== 'granted') {
            throw new Error('Permission denied');
          }
        }
      }

      const fileHandle = await activeDirHandle.getFileHandle('downloaded_books.json');
      const file = await fileHandle.getFile();
      const text = await file.text();
      const parsed = JSON.parse(text) as DownloadedBooksStore;
      return parsed;
    } catch {
      // Return default if error
    }
  }

  // Fallback store
  const fallback = await idbGet<DownloadedBooksStore>(FALLBACK_META_STORE, 'downloaded_books');
  if (fallback) {
    return fallback;
  }

  return {
    version: 1,
    lastSync: Date.now(),
    folderName: currentFolderName || 'Mulberry Storage',
    books: [],
  };
}

/**
 * Saves downloaded_books.json to folder root.
 */
export async function saveDownloadedBooksStore(store: DownloadedBooksStore): Promise<void> {
  store.lastSync = Date.now();
  if (activeDirHandle) {
    try {
      const fileHandle = await activeDirHandle.getFileHandle('downloaded_books.json', { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(store, null, 2));
      await writable.close();
    } catch (err) {
      console.warn('Failed to write to native directory handle, syncing to fallback cache:', err);
    }
  }

  // Keep fallback IDB synced
  await idbSet(FALLBACK_META_STORE, 'downloaded_books', store);
}

/**
 * Saves an encrypted .bin book file to the root of selected folder.
 */
export async function saveBookFile(bookId: string, data: ArrayBuffer): Promise<void> {
  const filename = `${bookId}.bin`;
  if (activeDirHandle) {
    try {
      const fileHandle = await activeDirHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(data);
      await writable.close();
      return;
    } catch (err) {
      console.warn('Native folder write failed, saving to fallback storage:', err);
    }
  }

  // Fallback IDB binary storage
  await idbSet(FALLBACK_BIN_STORE, filename, data);
}

/**
 * Reads encrypted .bin file from root of folder.
 */
export async function loadBookFile(bookId: string): Promise<ArrayBuffer> {
  const filename = `${bookId}.bin`;
  if (activeDirHandle) {
    try {
      const fileHandle = await activeDirHandle.getFileHandle(filename);
      const file = await fileHandle.getFile();
      return await file.arrayBuffer();
    } catch (err) {
      console.warn('Could not read from native folder, checking fallback:', err);
    }
  }

  const fallback = await idbGet<ArrayBuffer>(FALLBACK_BIN_STORE, filename);
  if (fallback) {
    return fallback;
  }

  throw new Error(`Book file ${filename} not found in storage.`);
}

/**
 * Deletes encrypted .bin file from root of folder and updates downloaded_books.json.
 */
export async function deleteBookFile(bookId: string): Promise<void> {
  const filename = `${bookId}.bin`;
  if (activeDirHandle) {
    try {
      await activeDirHandle.removeEntry(filename);
    } catch (err) {
      console.warn('Could not delete native file:', err);
    }
  }

  await idbDelete(FALLBACK_BIN_STORE, filename);

  const store = await getDownloadedBooksStore();
  store.books = store.books.filter((b) => b.id !== bookId);
  await saveDownloadedBooksStore(store);
}

export function getCurrentFolderName(): string {
  return currentFolderName || 'Mulberry Storage';
}

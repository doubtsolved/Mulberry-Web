import { BookItem, CatalogData } from '../types/catalog';

const CATALOG_URL = 'https://cdn.jsdelivr.net/gh/doubtsolved/mulberry-catalog@main/catalog.json';
const CACHE_KEY = 'mulberry_catalog_cache_v2';

let inMemoryCatalog: CatalogData | null = null;

export async function fetchCatalog(forceRefresh = false): Promise<CatalogData> {
  if (inMemoryCatalog && !forceRefresh) {
    return inMemoryCatalog;
  }

  // Check localStorage cache if not forcing refresh
  if (!forceRefresh) {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as CatalogData;
        if (parsed && Array.isArray(parsed.books) && parsed.books.length > 0) {
          inMemoryCatalog = parsed;
          // Background fetch to update silently
          fetchCatalogFromNetwork().catch(() => {});
          return parsed;
        }
      }
    } catch {
      // Ignore cache parse error
    }
  }

  return fetchCatalogFromNetwork();
}

async function fetchCatalogFromNetwork(): Promise<CatalogData> {
  const response = await fetch(CATALOG_URL);
  if (!response.ok) {
    throw new Error(`Failed to load catalog: ${response.status} ${response.statusText}`);
  }
  const data: CatalogData = await response.json();
  inMemoryCatalog = data;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // LocalStorage quota may be reached
  }
  return data;
}

/**
 * Groups books into sections by their `type` property.
 * Any type that has at least one book is shown as a section.
 */
export function groupBooksByType(books: BookItem[]): Record<string, BookItem[]> {
  const groups: Record<string, BookItem[]> = {};

  for (const book of books) {
    const type = (book.type || 'Other').trim();
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(book);
  }

  return groups;
}

/**
 * Returns the best download mirror for a book.
 * Prefers mulberry-vault (aes-256-gcm) or github mirrors with encrypted .bin format,
 * or fallback to drive if needed.
 */
export function getBookDownloadUrl(book: BookItem): { url: string; isEncrypted: boolean } | null {
  if (!book.download?.mirrors || book.download.mirrors.length === 0) {
    return null;
  }

  // Look for encrypted mulberry-vault / github mirror first
  const encryptedMirror = book.download.mirrors.find(
    (m) => (m.isEncrypted || m.url?.endsWith('.bin')) && m.url
  );
  if (encryptedMirror) {
    return { url: encryptedMirror.url, isEncrypted: true };
  }

  // Fallback to any mirror
  const anyMirror = book.download.mirrors.find((m) => Boolean(m.url));
  if (anyMirror) {
    return { url: anyMirror.url, isEncrypted: Boolean(anyMirror.isEncrypted) };
  }

  return null;
}

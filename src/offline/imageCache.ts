// Image cache for CookMate offline-first mode (Web)
// Stores image blobs in IndexedDB with LRU eviction
// Provides object URLs for React img elements

import { getDb } from './db';
import { isOnlineNow } from './network';

const MAX_CACHE_SIZE_MB = 50;
const MAX_CACHE_BYTES = MAX_CACHE_SIZE_MB * 1024 * 1024;

// Keep track of created object URLs to avoid memory leaks
const objectUrlCache = new Map<string, string>();

type ImageCacheRow = {
  url: string;
  blob: Blob;
  contentType: string;
  sizeBytes: number;
  createdAt: number;
  lastAccessed: number;
};

/**
 * Get total cache size in bytes
 */
async function getCacheSize(): Promise<number> {
  try {
    const db = await getDb();
    const tx = db.transaction('images', 'readonly');
    const store = tx.objectStore('images');
    const rows = (await new Promise<IDBRequest['result']>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    })) as ImageCacheRow[];

    return rows.reduce((sum, row) => sum + (row.sizeBytes || 0), 0);
  } catch {
    return 0;
  }
}

/**
 * Evict oldest accessed images to make room
 */
async function evictIfNeeded(requiredBytes: number): Promise<void> {
  const currentSize = await getCacheSize();
  if (currentSize + requiredBytes <= MAX_CACHE_BYTES) return;

  const db = await getDb();
  const tx = db.transaction('images', 'readwrite');
  const store = tx.objectStore('images');

  const rows = (await new Promise<ImageCacheRow[]>((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as ImageCacheRow[]);
    req.onerror = () => reject(req.error);
  })) as ImageCacheRow[];

  // Sort by last accessed (oldest first)
  const sorted = rows.sort((a, b) => (a.lastAccessed || 0) - (b.lastAccessed || 0));

  let freed = 0;
  const bytesToFree = (currentSize + requiredBytes) - MAX_CACHE_BYTES;

  for (const row of sorted) {
    if (freed >= bytesToFree) break;

    // Revoke object URL if exists
    const existingUrl = objectUrlCache.get(row.url);
    if (existingUrl) {
      URL.revokeObjectURL(existingUrl);
      objectUrlCache.delete(row.url);
    }

    await new Promise<void>((resolve, reject) => {
      const req = store.delete(row.url);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    freed += row.sizeBytes || 0;
  }
}

/**
 * Download and cache an image from URL
 */
export async function cacheImage(url: string): Promise<string | null> {
  if (!url) return null;

  try {
    // Check if already cached
    const existing = await getCachedImage(url);
    if (existing) return existing;

    if (!isOnlineNow()) {
      return null; // Can't download while offline
    }

    // Download the image
    const response = await fetch(url, { credentials: 'omit' });
    if (!response.ok) return null;

    const blob = await response.blob();
    const sizeBytes = blob.size;
    const contentType = response.headers.get('content-type') || blob.type || 'image/jpeg';

    // Evict if needed
    await evictIfNeeded(sizeBytes);

    // Store in IndexedDB
    const db = await getDb();
    const tx = db.transaction('images', 'readwrite');
    const store = tx.objectStore('images');

    const row: ImageCacheRow = {
      url,
      blob,
      contentType,
      sizeBytes,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
    };

    await new Promise<void>((resolve, reject) => {
      const req = store.put(row);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    // Create and cache object URL
    const objectUrl = URL.createObjectURL(blob);
    objectUrlCache.set(url, objectUrl);

    return objectUrl;
  } catch (err) {
    console.warn('[imageCache] Failed to cache image:', url, err);
    return null;
  }
}

/**
 * Get cached image as object URL (returns null if not cached)
 */
export async function getCachedImage(url: string): Promise<string | null> {
  if (!url) return null;

  // Check in-memory cache first
  const cached = objectUrlCache.get(url);
  if (cached) return cached;

  try {
    const db = await getDb();
    const tx = db.transaction('images', 'readwrite');
    const store = tx.objectStore('images');

    const row = (await new Promise<ImageCacheRow | undefined>((resolve, reject) => {
      const req = store.get(url);
      req.onsuccess = () => resolve(req.result as ImageCacheRow | undefined);
      req.onerror = () => reject(req.error);
    })) as ImageCacheRow | undefined;

    if (!row) return null;

    // Update last accessed
    row.lastAccessed = Date.now();
    await new Promise<void>((resolve, reject) => {
      const req = store.put(row);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    // Create object URL
    const objectUrl = URL.createObjectURL(row.blob);
    objectUrlCache.set(url, objectUrl);

    return objectUrl;
  } catch {
    return null;
  }
}

/**
 * Get image src for display (returns cached object URL or original URL)
 */
export async function getImageSrc(url: string): Promise<string> {
  if (!url) return '';

  const cached = await getCachedImage(url);
  if (cached) return cached;

  // Try to cache in background if online
  if (isOnlineNow()) {
    cacheImage(url).catch(() => {});
  }

  return url;
}

/**
 * Batch cache multiple images
 */
export async function cacheImages(urls: string[]): Promise<(string | null)[]> {
  if (!Array.isArray(urls) || urls.length === 0) return [];

  if (!isOnlineNow()) {
    // Return existing cached URLs only
    return Promise.all(urls.map(url => getCachedImage(url)));
  }

  // Cache up to 10 images at a time
  const toCache = urls.slice(0, 10);
  const results = await Promise.all(
    toCache.map(url => cacheImage(url).catch(() => null))
  );

  return results;
}

/**
 * Check if image is cached
 */
export async function isImageCached(url: string): Promise<boolean> {
  if (!url) return false;

  // Check memory cache first
  if (objectUrlCache.has(url)) return true;

  try {
    const db = await getDb();
    const tx = db.transaction('images', 'readonly');
    const store = tx.objectStore('images');

    const count = await new Promise<number>((resolve, reject) => {
      const req = store.count(url);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return count > 0;
  } catch {
    return false;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{ count: number; sizeBytes: number; sizeMB: string; maxMB: number }> {
  try {
    const db = await getDb();
    const tx = db.transaction('images', 'readonly');
    const store = tx.objectStore('images');

    const rows = (await new Promise<ImageCacheRow[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as ImageCacheRow[]);
      req.onerror = () => reject(req.error);
    })) as ImageCacheRow[];

    const count = rows.length;
    const sizeBytes = rows.reduce((sum, row) => sum + (row.sizeBytes || 0), 0);

    return {
      count,
      sizeBytes,
      sizeMB: (sizeBytes / (1024 * 1024)).toFixed(2),
      maxMB: MAX_CACHE_SIZE_MB,
    };
  } catch {
    return { count: 0, sizeBytes: 0, sizeMB: '0.00', maxMB: MAX_CACHE_SIZE_MB };
  }
}

/**
 * Clear all cached images
 */
export async function clearImageCache(): Promise<void> {
  try {
    // Revoke all object URLs
    objectUrlCache.forEach(url => URL.revokeObjectURL(url));
    objectUrlCache.clear();

    const db = await getDb();
    const tx = db.transaction('images', 'readwrite');
    const store = tx.objectStore('images');

    await new Promise<void>((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Best effort
  }
}

/**
 * Preload images for offline viewing
 */
export async function preloadRecipeImages(recipes: Array<{ image_url?: string; image?: string }>): Promise<void> {
  if (!Array.isArray(recipes) || recipes.length === 0) return;

  const urls = recipes
    .map(r => r.image_url || r.image)
    .filter((url): url is string => Boolean(url))
    .slice(0, 20);

  // Cache without blocking
  cacheImages(urls).catch(() => {});
}

/**
 * Clean up object URLs on app unload (call in cleanup)
 */
export function revokeAllObjectUrls(): void {
  objectUrlCache.forEach(url => URL.revokeObjectURL(url));
  objectUrlCache.clear();
}

// Export default for convenience
export default {
  cacheImage,
  getCachedImage,
  getImageSrc,
  cacheImages,
  isImageCached,
  getCacheStats,
  clearImageCache,
  preloadRecipeImages,
  revokeAllObjectUrls,
};

// Image cache for CookMate offline-first mode (Mobile)
// Stores images in file system with SQLite metadata tracking
// Provides LRU eviction and offline image display

import * as FileSystem from 'expo-file-system/legacy';
import { getDb } from './db';

const IMAGE_CACHE_DIR = `${FileSystem.cacheDirectory}cookmate-images/`;
const MAX_CACHE_SIZE_MB = 50; // Maximum cache size in MB
const MAX_CACHE_BYTES = MAX_CACHE_SIZE_MB * 1024 * 1024;

let cacheDirReady = false;

/**
 * Ensure cache directory exists
 */
async function ensureCacheDir() {
  if (cacheDirReady) return;
  const dirInfo = await FileSystem.getInfoAsync(IMAGE_CACHE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(IMAGE_CACHE_DIR, { intermediates: true });
  }
  cacheDirReady = true;
}

/**
 * Generate local file path for a URL
 */
function getLocalPath(url) {
  // Create a hash of the URL for filename
  const hash = url.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0) | 0;
  }, 0).toString(16);
  const extension = url.split('.').pop()?.split('?')[0] || 'jpg';
  return `${IMAGE_CACHE_DIR}${hash}.${extension}`;
}

/**
 * Get total cache size in bytes
 */
async function getCacheSize() {
  try {
    const db = await getDb();
    const row = await db.getFirstAsync(
      'SELECT SUM(size_bytes) as total FROM image_cache_metadata'
    );
    return Number(row?.total || 0);
  } catch {
    return 0;
  }
}

/**
 * Evict oldest accessed images to make room for new ones
 */
async function evictIfNeeded(requiredBytes) {
  const currentSize = await getCacheSize();
  if (currentSize + requiredBytes <= MAX_CACHE_BYTES) return;

  const db = await getDb();
  const bytesToFree = (currentSize + requiredBytes) - MAX_CACHE_BYTES;
  let freed = 0;

  // Get oldest accessed images
  const rows = await db.getAllAsync(
    'SELECT url, local_path, size_bytes FROM image_cache_metadata ORDER BY last_accessed ASC'
  );

  for (const row of rows) {
    if (freed >= bytesToFree) break;

    try {
      await FileSystem.deleteAsync(row.local_path, { idempotent: true });
      await db.runAsync('DELETE FROM image_cache_metadata WHERE url = ?', [row.url]);
      freed += Number(row.size_bytes);
    } catch {
      // Continue to next item if deletion fails
    }
  }
}

/**
 * Download and cache an image from URL
 */
export async function cacheImage(url) {
  if (!url) return null;

  try {
    await ensureCacheDir();

    const localPath = getLocalPath(url);
    const db = await getDb();

    // Check if already cached
    const existing = await db.getFirstAsync(
      'SELECT local_path FROM image_cache_metadata WHERE url = ?',
      [url]
    );

    if (existing) {
      const fileInfo = await FileSystem.getInfoAsync(existing.local_path);
      if (fileInfo.exists) {
        // Update last accessed
        await db.runAsync(
          'UPDATE image_cache_metadata SET last_accessed = ? WHERE url = ?',
          [Date.now(), url]
        );
        return existing.local_path;
      }
      // File was deleted, remove metadata
      await db.runAsync('DELETE FROM image_cache_metadata WHERE url = ?', [url]);
    }

    // Check if online
    const { isOnlineNow } = await import('./network');
    if (!isOnlineNow()) {
      return null; // Can't download while offline
    }

    // Download the image
    const downloadResult = await FileSystem.downloadAsync(url, localPath);

    if (downloadResult.status !== 200) {
      return null;
    }

    // Get file size
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    const sizeBytes = fileInfo.exists ? fileInfo.size : 0;

    // Evict if needed before saving metadata
    await evictIfNeeded(sizeBytes);

    // Save metadata
    await db.runAsync(
      `INSERT INTO image_cache_metadata (url, local_path, size_bytes, created_at, last_accessed)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(url) DO UPDATE SET
         local_path = excluded.local_path,
         size_bytes = excluded.size_bytes,
         last_accessed = excluded.last_accessed`,
      [url, localPath, sizeBytes, Date.now(), Date.now()]
    );

    return localPath;
  } catch (err) {
    console.warn('[imageCache] Failed to cache image:', url, err);
    return null;
  }
}

/**
 * Get cached image path (returns null if not cached)
 */
export async function getCachedImage(url) {
  if (!url) return null;

  try {
    const db = await getDb();
    const row = await db.getFirstAsync(
      'SELECT local_path FROM image_cache_metadata WHERE url = ?',
      [url]
    );

    if (!row) return null;

    const fileInfo = await FileSystem.getInfoAsync(row.local_path);
    if (!fileInfo.exists) {
      // Clean up stale metadata
      await db.runAsync('DELETE FROM image_cache_metadata WHERE url = ?', [url]);
      return null;
    }

    // Update last accessed
    await db.runAsync(
      'UPDATE image_cache_metadata SET last_accessed = ? WHERE url = ?',
      [Date.now(), url]
    );

    return row.local_path;
  } catch {
    return null;
  }
}

/**
 * Get image URI for display (React Native Image source)
 * Returns cached path if available, otherwise original URL
 */
export async function getImageUri(url) {
  if (!url) return null;

  const cached = await getCachedImage(url);
  if (cached) {
    return { uri: cached };
  }

  // Not cached - try to cache in background if online
  const { isOnlineNow } = await import('./network');
  if (isOnlineNow()) {
    cacheImage(url).catch(() => {});
  }

  return { uri: url };
}

/**
 * Batch cache multiple images (for recipe lists)
 */
export async function cacheImages(urls) {
  if (!Array.isArray(urls) || urls.length === 0) return [];

  const { isOnlineNow } = await import('./network');
  if (!isOnlineNow()) {
    // Return existing cached paths only
    return Promise.all(urls.map(url => getCachedImage(url)));
  }

  // Cache up to 10 images at a time to avoid overwhelming the network
  const limit = 10;
  const toCache = urls.slice(0, limit);

  const results = await Promise.all(
    toCache.map(url => cacheImage(url).catch(() => null))
  );

  return results;
}

/**
 * Check if image is cached
 */
export async function isImageCached(url) {
  if (!url) return false;
  const cached = await getCachedImage(url);
  return cached !== null;
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
  try {
    const db = await getDb();
    const row = await db.getFirstAsync(
      'SELECT COUNT(*) as count, SUM(size_bytes) as total_bytes FROM image_cache_metadata'
    );
    return {
      count: Number(row?.count || 0),
      sizeBytes: Number(row?.total_bytes || 0),
      sizeMB: Number((row?.total_bytes || 0) / (1024 * 1024)).toFixed(2),
      maxMB: MAX_CACHE_SIZE_MB,
    };
  } catch {
    return { count: 0, sizeBytes: 0, sizeMB: '0.00', maxMB: MAX_CACHE_SIZE_MB };
  }
}

/**
 * Clear all cached images
 */
export async function clearImageCache() {
  try {
    const db = await getDb();
    const rows = await db.getAllAsync('SELECT local_path FROM image_cache_metadata');

    // Delete files
    await Promise.all(
      rows.map(row =>
        FileSystem.deleteAsync(row.local_path, { idempotent: true }).catch(() => {})
      )
    );

    // Clear metadata
    await db.runAsync('DELETE FROM image_cache_metadata');

    cacheDirReady = false;
  } catch {
    // Best effort
  }
}

/**
 * Preload images for offline viewing of specific recipes
 */
export async function preloadRecipeImages(recipes) {
  if (!Array.isArray(recipes) || recipes.length === 0) return;

  const urls = recipes
    .map(r => r.image_url || r.image)
    .filter(Boolean)
    .slice(0, 20); // Limit to prevent excessive caching

  // Cache without blocking
  cacheImages(urls).catch(() => {});
}

// Export default for convenience
export default {
  cacheImage,
  getCachedImage,
  getImageUri,
  cacheImages,
  isImageCached,
  getCacheStats,
  clearImageCache,
  preloadRecipeImages,
};

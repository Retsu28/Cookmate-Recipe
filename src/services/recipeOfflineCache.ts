// Offline recipe download service for the web.
// Stores recipe JSON + image in IndexedDB (recipeCache / imageCache),
// and downloads the MP4 video as a Blob directly into IndexedDB (videoStore).
// Uses downloadStore to track what is downloaded with storage metadata.
// Blob URL playback works persistently after browser refresh / reopen.

import { recipeCache, videoStore, downloadStore } from '@/offline/db';
import type { DownloadRow } from '@/offline/db';
import { cacheImage, isImageCached } from '@/offline/imageCache';

// In-memory Blob URL cache — revoked on removal to free memory
const blobUrlCache = new Map<number, string>();

// ---------- public API ----------

export async function isRecipeDownloaded(id: number): Promise<boolean> {
  return downloadStore.isDownloaded(id);
}

/**
 * Check browser storage quota
 */
async function checkBrowserStorage(): Promise<{ usedMB: number; availableMB: number; isLowSpace: boolean }> {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const usedBytes = estimate.usage || 0;
      const quotaBytes = estimate.quota || (1024 * 1024 * 1024); // Default 1GB
      
      const usedMB = Math.round(usedBytes / (1024 * 1024));
      const availableMB = Math.round((quotaBytes - usedBytes) / (1024 * 1024));
      
      return {
        usedMB,
        availableMB,
        isLowSpace: availableMB < 100, // Warning if less than 100MB
      };
    }
  } catch { /* ignore */ }
  
  // Fallback if storage API not available
  return { usedMB: 0, availableMB: 500, isLowSpace: false };
}

/**
 * Estimate download size
 */
function estimateDownloadSize(recipe: Record<string, unknown>): number {
  let sizeMB = 0.5; // Base recipe JSON
  
  const imageUrl = (recipe.image_url ?? recipe.image) as string | null;
  if (imageUrl) {
    sizeMB += 0.5; // Image ~500KB
  }
  
  const videoFilename = recipe.video_filename as string | null;
  if (videoFilename) {
    sizeMB += 15; // Average video 15MB
  }
  
  return sizeMB;
}

export async function downloadRecipeForOffline(
  recipe: Record<string, unknown>,
  onProgress?: (pct: number) => void,
): Promise<void> {
  const id = recipe.id as number;
  
  // Check storage space before downloading
  const storage = await checkBrowserStorage();
  const estimatedSize = estimateDownloadSize(recipe);
  
  if (storage.availableMB < estimatedSize) {
    throw new Error(
      `Not enough storage space. Need ~${estimatedSize.toFixed(1)}MB, ` +
      `only ${storage.availableMB.toFixed(1)}MB available. ` +
      `Please free up space by removing some downloaded recipes.`
    );
  }
  
  if (storage.isLowSpace) {
    console.warn(`[recipeOfflineCache] Low storage warning: ${storage.usedMB}MB used`);
  }
  
  onProgress?.(5);

  // 1. Store recipe JSON in IndexedDB
  await recipeCache.upsert(id, recipe);
  onProgress?.(25);

  // 2. Cache hero image in IndexedDB blob store
  const imageUrl = (recipe.image_url ?? recipe.image) as string | null;
  if (imageUrl && !(await isImageCached(imageUrl))) {
    await cacheImage(imageUrl).catch(() => {});
  }
  onProgress?.(45);

  // 3. Download video as Blob into IndexedDB for persistent offline playback
  let hasVideo = false;
  let videoSizeBytes = 0;
  const videoFilename = recipe.video_filename as string | null;

  if (videoFilename) {
    try {
      // Check if already stored
      const existing = await videoStore.get(id);
      if (existing) {
        hasVideo = true;
        videoSizeBytes = existing.sizeBytes;
        console.log(`[recipeOfflineCache] Video already cached for recipe ${id}`);
      } else {
        // Try multiple strategies for video download
        let blob: Blob | null = null;
        const videoUrls: string[] = [];

        // Primary: Direct URL if full URL
        if (videoFilename.startsWith('http')) {
          videoUrls.push(videoFilename);
        }
        // Fallback: API proxy endpoint
        videoUrls.push(`/api/video/proxy?url=${encodeURIComponent(videoFilename)}`);

        for (const videoUrl of videoUrls) {
          try {
            console.log(`[recipeOfflineCache] Trying video download: ${videoUrl}`);
            const res = await fetch(videoUrl, {
              mode: videoUrl.startsWith('/api/') ? 'same-origin' : 'cors',
              credentials: videoUrl.startsWith('/api/') ? 'include' : 'omit',
            });

            if (res.ok) {
              blob = await res.blob();
              console.log(`[recipeOfflineCache] Video download success: ${blob.size} bytes`);
              break;
            } else {
              console.warn(`[recipeOfflineCache] Video download failed: ${res.status} ${res.statusText}`);
            }
          } catch (fetchErr) {
            console.warn(`[recipeOfflineCache] Video fetch error for ${videoUrl}:`, fetchErr);
            continue;
          }
        }

        if (blob && blob.size > 0) {
          videoSizeBytes = blob.size;
          await videoStore.put({
            recipeId: id,
            blob,
            mimeType: blob.type || 'video/mp4',
            sizeBytes: blob.size,
            cachedAt: Date.now(),
          });
          hasVideo = true;
          console.log(`[recipeOfflineCache] Video saved to IndexedDB for recipe ${id}`);
        }
      }
    } catch (e) {
      console.warn('[recipeOfflineCache] Video download failed:', e);
    }
  }
  onProgress?.(90);

  // 4. Record in downloads store
  const dlRow: DownloadRow = {
    recipeId: id,
    title: recipe.title as string,
    imageUrl: imageUrl,
    hasVideo,
    videoSizeBytes,
    totalSizeBytes: videoSizeBytes, // approximate — image blob sizes not counted separately
    downloadedAt: Date.now(),
  };
  await downloadStore.put(dlRow);
  onProgress?.(100);
}

export async function removeRecipeFromOffline(id: number): Promise<void> {
  // Revoke Blob URL if one was created
  const blobUrl = blobUrlCache.get(id);
  if (blobUrl) {
    URL.revokeObjectURL(blobUrl);
    blobUrlCache.delete(id);
  }

  await Promise.all([
    recipeCache.delete(id).catch(() => {}),
    videoStore.delete(id).catch(() => {}),
    downloadStore.delete(id).catch(() => {}),
  ]);
}

/**
 * Returns a Blob URL for offline video playback.
 * The URL is cached in memory so repeated calls are cheap.
 * The Blob itself lives in IndexedDB and survives browser restarts.
 */
export async function getOfflineVideoBlobUrl(id: number): Promise<string | null> {
  try {
    // Check in-memory cache first
    if (blobUrlCache.has(id)) {
      console.log(`[recipeOfflineCache] Using cached Blob URL for recipe ${id}`);
      return blobUrlCache.get(id)!;
    }

    // Get from IndexedDB
    const row = await videoStore.get(id);
    if (!row) {
      console.warn(`[recipeOfflineCache] No cached video found for recipe ${id}`);
      return null;
    }

    // Validate blob
    if (!row.blob || row.blob.size === 0) {
      console.warn(`[recipeOfflineCache] Empty or invalid blob for recipe ${id}`);
      return null;
    }

    // Create and cache object URL
    const url = URL.createObjectURL(row.blob);
    blobUrlCache.set(id, url);
    console.log(`[recipeOfflineCache] Created Blob URL for recipe ${id}: ${url.substring(0, 50)}...`);
    return url;
  } catch (err) {
    console.error(`[recipeOfflineCache] Error creating Blob URL for recipe ${id}:`, err);
    return null;
  }
}

export async function getOfflineRecipeList(): Promise<DownloadRow[]> {
  return downloadStore.getAll();
}

/**
 * Clean up all cached Blob URLs to prevent memory leaks.
 * Call this when the app is unloading or when memory cleanup is needed.
 */
export function cleanupOfflineVideoUrls(): void {
  console.log(`[recipeOfflineCache] Cleaning up ${blobUrlCache.size} Blob URLs`);
  blobUrlCache.forEach((url, id) => {
    URL.revokeObjectURL(url);
    console.log(`[recipeOfflineCache] Revoked Blob URL for recipe ${id}`);
  });
  blobUrlCache.clear();
}

export async function getOfflineStorageEstimate(): Promise<{ usedMB: number; quota: number | null }> {
  try {
    const rows = await downloadStore.getAll();
    const usedBytes = rows.reduce((acc, r) => acc + (r.totalSizeBytes || 0), 0);
    let quota: number | null = null;
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      quota = est.quota ?? null;
    }
    return { usedMB: Math.round(usedBytes / (1024 * 1024) * 10) / 10, quota };
  } catch {
    return { usedMB: 0, quota: null };
  }
}

/**
 * Estimate download size for a recipe (for UI display)
 */
export function estimateDownloadSizeMB(recipe: Record<string, unknown>): number {
  return estimateDownloadSize(recipe);
}

/**
 * Check available storage space (for UI display)
 */
export async function getAvailableStorageMB(): Promise<number> {
  const storage = await checkBrowserStorage();
  return storage.availableMB;
}

// Default export for convenience
export default {
  isRecipeDownloaded,
  downloadRecipeForOffline,
  removeRecipeFromOffline,
  getOfflineVideoBlobUrl,
  getOfflineRecipeList,
  getOfflineStorageEstimate,
  cleanupOfflineVideoUrls,
  estimateDownloadSizeMB,
  getAvailableStorageMB,
};

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

export async function downloadRecipeForOffline(
  recipe: Record<string, unknown>,
  onProgress?: (pct: number) => void,
): Promise<void> {
  const id = recipe.id as number;
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
      } else {
        const videoUrl = videoFilename.startsWith('http')
          ? videoFilename
          : `/video/${videoFilename}`;

        const res = await fetch(videoUrl, { mode: 'cors', credentials: 'omit' });
        if (res.ok) {
          const blob = await res.blob();
          videoSizeBytes = blob.size;
          await videoStore.put({
            recipeId: id,
            blob,
            mimeType: blob.type || 'video/mp4',
            sizeBytes: blob.size,
            cachedAt: Date.now(),
          });
          hasVideo = true;
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
  if (blobUrlCache.has(id)) return blobUrlCache.get(id)!;
  const row = await videoStore.get(id);
  if (!row) return null;
  const url = URL.createObjectURL(row.blob);
  blobUrlCache.set(id, url);
  return url;
}

export async function getOfflineRecipeList(): Promise<DownloadRow[]> {
  return downloadStore.getAll();
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

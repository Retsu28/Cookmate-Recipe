// Explicit "Download for Offline" feature for mobile.
// Saves recipe JSON into the existing SQLite recipeCache,
// downloads the hero image via imageCache, and downloads
// the cooking video and sound into documentDirectory/CookMate/downloads/{recipeId}/.

import {
  getInfoAsync,
  makeDirectoryAsync,
  readAsStringAsync,
  writeAsStringAsync,
  downloadAsync,
  copyAsync,
  deleteAsync,
  documentDirectory,
} from 'expo-file-system/legacy';
import { recipeCache } from './db';
import { cacheImage } from './imageCache';
import { isOnlineNow } from './network';
import { apiBaseUrl } from '../api/api';
import Constants from 'expo-constants';

// Check if running in Expo Go (dev mode) vs standalone app
const isExpoGo = Constants.appOwnership === 'expo';

// Lazy getters — documentDirectory is null at module-init in standalone APK builds
function getDownloadsDir() {
  // Main downloads folder: /data/data/com.cookmate/files/CookMate/downloads/
  const baseDir = documentDirectory || '';
  if (!baseDir) {
    console.warn('[recipeDownload] documentDirectory is null! Using fallback.');
  }
  return `${baseDir}CookMate/downloads/`;
}

// Per-recipe folder: /data/data/com.cookmate/files/CookMate/downloads/recipe_123/
function getRecipeDir(recipeId) {
  return `${getDownloadsDir()}recipe_${recipeId}/`;
}

// ---------- helpers ----------
async function ensureDownloadsDir() {
  const dir = getDownloadsDir();
  const info = await getInfoAsync(dir);
  if (!info.exists) {
    await makeDirectoryAsync(dir, { intermediates: true });
  }
}

async function ensureRecipeDir(recipeId) {
  await ensureDownloadsDir();
  const dir = getRecipeDir(recipeId);
  const info = await getInfoAsync(dir);
  if (!info.exists) {
    await makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
}

// Extract a safe flat filename from a full URL or plain name.
// e.g. "https://res.cloudinary.com/.../recipe_123.mp4" → "recipe_123.mp4"
function safeFilename(raw) {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const parts = url.pathname.split('/');
    return parts[parts.length - 1] || null;
  } catch {
    return raw.split('/').pop() || raw;
  }
}

function videoLocalPath(recipeId, flatName) {
  // Per-recipe folder: downloads/recipe_123/recipe_123_video.mp4
  return `${getRecipeDir(recipeId)}${flatName}`;
}

function soundLocalPath(recipeId) {
  // Per-recipe folder: downloads/recipe_123/sound.wav
  return `${getRecipeDir(recipeId)}sound.wav`;
}

// Persist index in a JSON file alongside the recipe folder
function getMetaPath() {
  const baseDir = documentDirectory || '';
  if (!baseDir) {
    console.warn('[getMetaPath] documentDirectory is null, using fallback path');
  }
  return `${baseDir}CookMate/offline_meta.json`;
}

async function readMeta() {
  try {
    const metaPath = getMetaPath();
    // Guard against null documentDirectory
    if (!documentDirectory) {
      console.warn('[readMeta] documentDirectory is null, returning empty array');
      return [];
    }
    console.log('[readMeta] Reading from:', metaPath);
    const info = await getInfoAsync(metaPath);
    console.log('[readMeta] File exists:', info.exists);
    if (!info.exists) {
      console.log('[readMeta] No meta file yet, returning empty array');
      return [];
    }
    const raw = await readAsStringAsync(metaPath);
    const parsed = JSON.parse(raw);
    console.log('[readMeta] Parsed', parsed.length, 'entries');
    return parsed;
  } catch (err) {
    console.error('[readMeta] ERROR:', err?.message || err);
    return [];
  }
}

async function writeMeta(list) {
  try {
    // Guard against null documentDirectory
    if (!documentDirectory) {
      console.warn('[writeMeta] documentDirectory is null, cannot write meta');
      return;
    }
    await ensureDownloadsDir();
    await writeAsStringAsync(getMetaPath(), JSON.stringify(list));
  } catch (e) {
    console.warn('[recipeDownload] writeMeta failed:', e?.message || e);
  }
}

// ---------- public API ----------

export async function isRecipeDownloaded(id) {
  const meta = await readMeta();
  return meta.some((m) => m.id === id);
}

/**
 * Check available storage space
 */
async function checkStorageSpace() {
  try {
    // Get app storage info if available (Android)
    const docDir = documentDirectory;
    const { cacheDirectory } = await import('expo-file-system/legacy');
    const cacheDir = cacheDirectory;
    
    const docInfo = await getInfoAsync(docDir);
    const cacheInfo = await getInfoAsync(cacheDir);
    
    // Rough estimate - this varies by platform
    const totalBytes = (docInfo.size || 0) + (cacheInfo.size || 0);
    const estimatedUsedMB = Math.round(totalBytes / (1024 * 1024));
    
    return {
      usedMB: estimatedUsedMB,
      // Most devices have at least 100MB available for apps
      availableMB: Math.max(100, 500 - estimatedUsedMB),
      isLowSpace: estimatedUsedMB > 400, // Warning if over 400MB
    };
  } catch (e) {
    return { usedMB: 0, availableMB: 500, isLowSpace: false };
  }
}

/**
 * Estimate download size
 */
function estimateDownloadSize(recipe) {
  let sizeMB = 0.5; // Base recipe JSON size
  
  // Image ~100KB - 1MB
  if (recipe.image || recipe.image_url) {
    sizeMB += 0.5;
  }
  
  // Video varies greatly (assume 5-30MB)
  if (recipe.video_filename) {
    sizeMB += 15; // Average video size
  }
  
  return sizeMB;
}

export async function downloadRecipeForOffline(recipe, onProgress) {
  if (!isOnlineNow()) throw new Error('Cannot download while offline.');

  const id = recipe.id;
  
  // Check storage space before downloading
  const storage = await checkStorageSpace();
  const estimatedSize = estimateDownloadSize(recipe);
  
  if (storage.availableMB < estimatedSize) {
    throw new Error(
      `Not enough storage space. Need ~${estimatedSize.toFixed(1)}MB, ` +
      `only ${storage.availableMB.toFixed(1)}MB available. ` +
      `Please free up space or remove some downloaded recipes.`
    );
  }
  
  if (storage.isLowSpace) {
    console.warn(`[recipeDownload] Low storage warning: ${storage.usedMB}MB used`);
  }
  
  onProgress?.(5);

  // 1. Store recipe JSON in SQLite
  await recipeCache.upsert(id, recipe);
  onProgress?.(25);

  // 2. Cache hero image
  const imageUrl = recipe.image || recipe.image_url || null;
  if (imageUrl) {
    await cacheImage(imageUrl).catch(() => {});
  }
  onProgress?.(50);

  // 3. Download video file to device storage
  let hasVideo = false;
  let localVideoPath = null;
  const videoFilename = recipe.video_filename || null;

  if (videoFilename) {
    let retries = 0;
    const maxRetries = isExpoGo ? 1 : 2; // Less retries in Expo Go
    
    while (retries <= maxRetries) {
      try {
        await ensureRecipeDir(id);
        // video_filename in DB is a full Cloudinary URL — extract a safe flat filename
        const flatName = safeFilename(videoFilename);
        if (!flatName) throw new Error('Cannot determine video filename');
        const localPath = videoLocalPath(id, flatName);
        
        console.log(`[recipeDownload] Video check (attempt ${retries + 1}/${maxRetries + 1}): ${localPath}`);
        const fileInfo = await getInfoAsync(localPath);

        if (!fileInfo.exists) {
          // Download directly from Cloudinary if it's a full URL, otherwise proxy via API
          const videoUrl = videoFilename.startsWith('http')
            ? videoFilename
            : `${apiBaseUrl}/video/${videoFilename}`;

          console.log(`[recipeDownload] Downloading video from: ${videoUrl}`);
          console.log(`[recipeDownload] Mode: ${isExpoGo ? 'Expo Go (dev)' : 'Standalone'}`);
          
          const result = await downloadAsync(videoUrl, localPath);
          console.log(`[recipeDownload] Video download result: status=${result.status}, uri=${result.uri}`);

          if (result.status === 200) {
            hasVideo = true;
            localVideoPath = localPath;
            break; // Success, exit retry loop
          } else {
            console.warn(`[recipeDownload] Video download failed with status ${result.status}`);
            await deleteAsync(localPath, { idempotent: true });
            retries++;
          }
        } else {
          hasVideo = true;
          localVideoPath = localPath;
          console.log(`[recipeDownload] Video already cached at: ${localPath}`);
          break; // Already exists, exit retry loop
        }
      } catch (videoErr) {
        console.warn(`[recipeDownload] Video download attempt ${retries + 1} failed:`, videoErr?.message || videoErr);
        
        // In Expo Go, some video downloads fail due to CORS or network issues
        // This is expected - we'll just mark as no video for offline
        if (isExpoGo && retries >= maxRetries) {
          console.log('[recipeDownload] Expo Go mode: Video download skipped (expected in dev mode)');
        }
        
        // Clean up any partial download
        try {
          const flatName = safeFilename(videoFilename);
          if (flatName) {
            const localPath = videoLocalPath(id, flatName);
            await deleteAsync(localPath, { idempotent: true });
          }
        } catch { /* ignore cleanup errors */ }
        
        retries++;
        if (retries <= maxRetries) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  }
  // 4. Download/copy interval sound for cooking timer
  let localSoundPath = null;
  try {
    await ensureRecipeDir(id);
    const soundPath = soundLocalPath(id);
    const soundInfo = await getInfoAsync(soundPath);
    
    if (!soundInfo.exists) {
      // Copy bundled sound to offline storage
      const bundledSound = require('../../sound/custom_sound.wav');
      // bundledSound is a number (asset reference) - we need to get the actual file
      // For Expo assets, we use Asset.fromModule
      const { Asset } = await import('expo-asset');
      const asset = Asset.fromModule(bundledSound);
      
      if (!asset.localUri) {
        await asset.downloadAsync();
      }
      
      if (asset.localUri) {
        // Use copyAsync for local file:// URLs (downloadAsync only works with http/https)
        await copyAsync({ from: asset.localUri, to: soundPath });
        localSoundPath = soundPath;
        console.log(`[recipeDownload] Sound copied to: ${soundPath}`);
      }
    } else {
      localSoundPath = soundPath;
      console.log(`[recipeDownload] Sound already cached at: ${soundPath}`);
    }
  } catch (soundErr) {
    console.warn('[recipeDownload] Sound copy failed:', soundErr?.message || soundErr);
    // Non-critical - cooking mode can fall back to bundled sound
  }
  
  onProgress?.(95);

  // 5. Update index
  const meta = await readMeta();
  const idx = meta.findIndex((m) => m.id === id);
  const entry = {
    id,
    title: recipe.title,
    cachedAt: Date.now(),
    hasVideo,
    localVideoPath,
    localSoundPath,
    imageUrl: recipe.image || recipe.image_url || null,
    instruction_timestamps: recipe.instruction_timestamps || [],
    instructions: recipe.instructions || [],
    steps: recipe.steps || [],
  };
  if (idx >= 0) meta[idx] = entry; else meta.push(entry);
  await writeMeta(meta);
  onProgress?.(100);

  return entry;
}

export async function removeRecipeFromOffline(id) {
  // Remove entire recipe folder (video + sound + any other files)
  const recipeDir = getRecipeDir(id);
  try {
    const dirInfo = await getInfoAsync(recipeDir);
    if (dirInfo.exists) {
      await deleteAsync(recipeDir, { idempotent: true });
      console.log(`[recipeDownload] Deleted recipe folder: ${recipeDir}`);
    }
  } catch (err) {
    console.warn('[recipeDownload] Failed to delete recipe folder:', err?.message || err);
  }

  // Remove from SQLite (best-effort — cache will just re-fetch on next online visit)
  await recipeCache.delete(id).catch(() => {});

  // Update index
  const meta = await readMeta();
  await writeMeta(meta.filter((m) => m.id !== id));
}

export async function getLocalVideoPath(id) {
  const meta = await readMeta();
  const entry = meta.find((m) => m.id === id);
  return entry?.localVideoPath || null;
}

export async function getLocalSoundPath(id) {
  const meta = await readMeta();
  const entry = meta.find((m) => m.id === id);
  return entry?.localSoundPath || null;
}

export async function getLocalTimestamps(id) {
  const meta = await readMeta();
  const entry = meta.find((m) => m.id === id);
  return entry?.instruction_timestamps || null;
}

export async function getLocalInstructions(id) {
  const meta = await readMeta();
  const entry = meta.find((m) => m.id === id);
  return entry?.instructions || entry?.steps || null;
}

/**
 * Get any available interval sound path (for offline cooking mode fallback)
 * This returns the path to the sound file from any downloaded recipe
 */
export async function getSharedIntervalSoundPath() {
  const meta = await readMeta();
  // Find any recipe that has the sound downloaded
  const entryWithSound = meta.find((m) => m.localSoundPath);
  return entryWithSound?.localSoundPath || null;
}

/**
 * Get recipe folder path (for debugging/inspection)
 */
export function getRecipeFolderPath(recipeId) {
  return getRecipeDir(recipeId);
}

export async function getOfflineRecipeList() {
  console.log('[getOfflineRecipeList] Fetching offline recipes...');
  const result = await readMeta();
  console.log('[getOfflineRecipeList] Found', result.length, 'recipes');
  return result;
}

/**
 * Get storage stats for downloaded content
 */
export async function getDownloadStorageStats() {
  try {
    const meta = await readMeta();
    let videoSizeMB = 0;
    let imageSizeMB = 0;
    
    // Calculate video and sound sizes
    let soundSizeMB = 0;
    for (const entry of meta) {
      if (entry.localVideoPath) {
        try {
          const info = await getInfoAsync(entry.localVideoPath);
          if (info.exists) {
            videoSizeMB += (info.size || 0) / (1024 * 1024);
          }
        } catch { /* ignore */ }
      }
      if (entry.localSoundPath) {
        try {
          const info = await getInfoAsync(entry.localSoundPath);
          if (info.exists) {
            soundSizeMB += (info.size || 0) / (1024 * 1024);
          }
        } catch { /* ignore */ }
      }
    }
    
    const storage = await checkStorageSpace();
    const totalSizeMB = videoSizeMB + soundSizeMB;
    
    return {
      recipeCount: meta.length,
      videoCount: meta.filter(m => m.hasVideo).length,
      videoSizeMB: Math.round(videoSizeMB * 10) / 10,
      soundSizeMB: Math.round(soundSizeMB * 10) / 10,
      imageSizeMB: Math.round(imageSizeMB * 10) / 10,
      totalSizeMB: Math.round(totalSizeMB * 10) / 10,
      availableMB: storage.availableMB,
      isLowSpace: storage.isLowSpace,
    };
  } catch (e) {
    return {
      recipeCount: 0,
      videoCount: 0,
      videoSizeMB: 0,
      imageSizeMB: 0,
      totalSizeMB: 0,
      availableMB: 500,
      isLowSpace: false,
    };
  }
}

/**
 * Estimate download size for a recipe
 */
export function estimateDownloadSizeMB(recipe) {
  return estimateDownloadSize(recipe);
}

// Explicit "Download for Offline" feature for mobile.
// Saves recipe JSON into the existing SQLite recipeCache,
// downloads the hero image via imageCache, and downloads
// the cooking video into documentDirectory/CookMate/recipes/.

import * as FileSystem from 'expo-file-system';
import { recipeCache } from './db';
import { cacheImage } from './imageCache';
import { isOnlineNow } from './network';
import { apiBaseUrl } from '../api/api';

// Lazy getters — documentDirectory is null at module-init in standalone APK builds
function getRecipesDir() {
  return `${FileSystem.documentDirectory}CookMate/recipes/`;
}

// ---------- helpers ----------
async function ensureDir() {
  const dir = getRecipesDir();
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
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

function videoLocalPath(flatName) {
  return `${getRecipesDir()}${flatName}`;
}

// Persist index in a JSON file alongside the recipe folder
function getMetaPath() {
  return `${FileSystem.documentDirectory}CookMate/offline_meta.json`;
}

async function readMeta() {
  try {
    const metaPath = getMetaPath();
    const info = await FileSystem.getInfoAsync(metaPath);
    if (!info.exists) return [];
    const raw = await FileSystem.readAsStringAsync(metaPath);
    return JSON.parse(raw);
  } catch { return []; }
}

async function writeMeta(list) {
  try {
    await ensureDir();
    await FileSystem.writeAsStringAsync(getMetaPath(), JSON.stringify(list));
  } catch (e) {
    console.warn('[recipeDownload] writeMeta failed:', e?.message || e);
  }
}

// ---------- public API ----------

export async function isRecipeDownloaded(id) {
  const meta = await readMeta();
  return meta.some((m) => m.id === id);
}

export async function downloadRecipeForOffline(recipe, onProgress) {
  if (!isOnlineNow()) throw new Error('Cannot download while offline.');

  const id = recipe.id;
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
    try {
      await ensureDir();
      // video_filename in DB is a full Cloudinary URL — extract a safe flat filename
      const flatName = safeFilename(videoFilename);
      if (!flatName) throw new Error('Cannot determine video filename');
      const localPath = videoLocalPath(flatName);
      const fileInfo = await FileSystem.getInfoAsync(localPath);

      if (!fileInfo.exists) {
        // Download directly from Cloudinary if it's a full URL, otherwise proxy via API
        const videoUrl = videoFilename.startsWith('http')
          ? videoFilename
          : `${apiBaseUrl}/video/${videoFilename}`;

        const result = await FileSystem.downloadAsync(videoUrl, localPath);
        if (result.status === 200) {
          hasVideo = true;
          localVideoPath = localPath;
        } else {
          await FileSystem.deleteAsync(localPath, { idempotent: true });
        }
      } else {
        hasVideo = true;
        localVideoPath = localPath;
      }
    } catch (videoErr) {
      console.warn('[recipeDownload] Video download failed:', videoErr?.message || videoErr);
    }
  }
  onProgress?.(90);

  // 4. Update index
  const meta = await readMeta();
  const idx = meta.findIndex((m) => m.id === id);
  const entry = {
    id,
    title: recipe.title,
    cachedAt: Date.now(),
    hasVideo,
    localVideoPath,
  };
  if (idx >= 0) meta[idx] = entry; else meta.push(entry);
  await writeMeta(meta);
  onProgress?.(100);

  return entry;
}

export async function removeRecipeFromOffline(id) {
  // Remove video file
  const meta = await readMeta();
  const entry = meta.find((m) => m.id === id);
  if (entry?.localVideoPath) {
    await FileSystem.deleteAsync(entry.localVideoPath, { idempotent: true }).catch(() => {});
  }

  // Remove from SQLite (best-effort — cache will just re-fetch on next online visit)
  await recipeCache.delete(id).catch(() => {});

  // Update index
  await writeMeta(meta.filter((m) => m.id !== id));
}

export async function getLocalVideoPath(id) {
  const meta = await readMeta();
  const entry = meta.find((m) => m.id === id);
  return entry?.localVideoPath || null;
}

export async function getOfflineRecipeList() {
  return readMeta();
}

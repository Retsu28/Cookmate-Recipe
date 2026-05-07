// Offline action sync queue for CookMate.
// Actions performed while offline are persisted in SQLite (`sync_queue`) and
// replayed in FIFO order when the connection is restored. Failed items stay
// in the queue and are retried on the next connectivity change.
//
// This module is additive — no existing API service is modified. To use it:
//
//   import { enqueueAction, registerHandler } from '../offline/syncQueue';
//   registerHandler('SAVE_RECIPE', async (payload) => savedApi.save(payload));
//   await enqueueAction('SAVE_RECIPE', { recipeId: 42 });

import NetInfo from '@react-native-community/netinfo';
import { queue } from './db';
import { isOnlineNow } from './network';

const handlers = new Map();
let flushing = false;
let started = false;
let netUnsubscribe = null;

export function registerHandler(type, fn) {
  if (!type || typeof fn !== 'function') return;
  handlers.set(String(type), fn);
}

export function unregisterHandler(type) {
  handlers.delete(String(type));
}

export async function enqueueAction(type, payload) {
  const id = await queue.enqueue(type, payload);
  if (isOnlineNow()) {
    // Opportunistic flush; ignore errors so the caller isn't blocked.
    flushQueue().catch(() => {});
  }
  return id;
}

export async function flushQueue() {
  if (flushing) return { processed: 0, remaining: await queue.size() };
  if (!isOnlineNow()) return { processed: 0, remaining: await queue.size(), skipped: 'offline' };

  flushing = true;
  let processed = 0;
  try {
    const items = await queue.list({ limit: 100 });
    for (const item of items) {
      if (!isOnlineNow()) break;
      const handler = handlers.get(item.type);
      if (!handler) {
        // Unknown type — leave it in the queue so a future build can handle it.
        continue;
      }
      try {
        await handler(item.payload, item);
        await queue.remove(item.id);
        processed += 1;
      } catch (err) {
        // Keep the item; it will be retried on the next flush.
        // Break on network errors so we don't hammer the API while offline.
        if (isLikelyNetworkError(err)) break;
      }
    }
  } finally {
    flushing = false;
  }

  return { processed, remaining: await queue.size() };
}

function isLikelyNetworkError(err) {
  if (!err) return false;
  const message = String(err.message || '').toLowerCase();
  return (
    err.code === 'ECONNABORTED' ||
    err.code === 'ERR_NETWORK' ||
    message.includes('network') ||
    message.includes('timeout')
  );
}

// Auto-flush on connectivity regain. Safe to call multiple times.
export function startAutoFlush() {
  if (started) return;
  started = true;
  netUnsubscribe = NetInfo.addEventListener((info) => {
    if (!info) return;
    const online = info.isConnected === true && info.isInternetReachable !== false;
    if (online) flushQueue().catch(() => {});
  });
  // Initial attempt in case we launched while already online.
  flushQueue().catch(() => {});
}

export function stopAutoFlush() {
  started = false;
  if (netUnsubscribe) {
    netUnsubscribe();
    netUnsubscribe = null;
  }
}

export async function queueSize() {
  return queue.size();
}

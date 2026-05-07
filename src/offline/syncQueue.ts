// Offline action sync queue for CookMate web.
// Mirrors `mobile/src/offline/syncQueue.js`:
//
//   Actions performed while offline are persisted in IndexedDB (`sync_queue`)
//   and replayed in FIFO order when the browser comes back online. Failed
//   items stay in the queue and are retried on the next connectivity change.
//
// Usage:
//   registerHandler('SAVE_RECIPE', async (payload) => api.post('/api/saves', payload));
//   await enqueueAction('SAVE_RECIPE', { recipeId: 42 });

import { queue } from './db';
import { isOnlineNow } from './network';

type Handler = (payload: unknown, item: { id?: number; type: string; createdAt: number }) => Promise<unknown>;

const handlers = new Map<string, Handler>();
let flushing = false;
let started = false;
let onlineListener: (() => void) | null = null;

export function registerHandler(type: string, fn: Handler): void {
  if (!type || typeof fn !== 'function') return;
  handlers.set(String(type), fn);
}

export function unregisterHandler(type: string): void {
  handlers.delete(String(type));
}

export async function enqueueAction(type: string, payload: unknown): Promise<number | null> {
  const id = await queue.enqueue(type, payload);
  if (isOnlineNow()) {
    flushQueue().catch(() => {});
  }
  return id;
}

export async function flushQueue(): Promise<{ processed: number; remaining: number; skipped?: string }> {
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
        // Unknown type — leave it for a future build that registers a handler.
        continue;
      }
      try {
        await handler(item.payload, item);
        await queue.remove(item.id);
        processed += 1;
      } catch (err) {
        if (isLikelyNetworkError(err)) break;
        // Keep the item for retry on the next flush.
      }
    }
  } finally {
    flushing = false;
  }

  return { processed, remaining: await queue.size() };
}

function isLikelyNetworkError(err: unknown): boolean {
  if (!err) return false;
  const anyErr = err as { code?: string; message?: unknown; name?: string };
  const message = String(anyErr.message ?? '').toLowerCase();
  return (
    anyErr.code === 'ECONNABORTED' ||
    anyErr.code === 'ERR_NETWORK' ||
    anyErr.name === 'TypeError' || // fetch() throws TypeError when offline
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('failed to fetch')
  );
}

export function startAutoFlush(): void {
  if (started) return;
  if (typeof window === 'undefined') return;
  started = true;
  onlineListener = () => {
    flushQueue().catch(() => {});
  };
  window.addEventListener('online', onlineListener);
  // Initial attempt in case we launched while already online.
  flushQueue().catch(() => {});
}

export function stopAutoFlush(): void {
  started = false;
  if (onlineListener && typeof window !== 'undefined') {
    window.removeEventListener('online', onlineListener);
  }
  onlineListener = null;
}

export async function queueSize(): Promise<number> {
  return queue.size();
}

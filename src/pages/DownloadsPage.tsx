import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Download, Trash2, Play, HardDrive, RefreshCw, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  getOfflineRecipeList,
  removeRecipeFromOffline,
  getOfflineStorageEstimate,
} from '@/services/recipeOfflineCache';
import type { DownloadRow } from '@/offline/db';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { getImageSrc } from '@/offline/imageCache';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ts: number): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ts));
}

export default function DownloadsPage() {
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const [downloads, setDownloads] = useState<DownloadRow[]>([]);
  const [storage, setStorage] = useState<{ usedMB: number; quota: number | null }>({ usedMB: 0, quota: null });
  const [removing, setRemoving] = useState<Set<number>>(new Set());
  const [imageUrls, setImageUrls] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    const [rows, est] = await Promise.all([getOfflineRecipeList(), getOfflineStorageEstimate()]);
    setDownloads(rows.sort((a, b) => b.downloadedAt - a.downloadedAt));
    setStorage(est);

    // Resolve cached image URLs
    const urls: Record<number, string> = {};
    await Promise.all(rows.map(async (r) => {
      if (r.imageUrl) {
        const cached = await getImageSrc(r.imageUrl).catch(() => null);
        urls[r.recipeId] = cached ?? r.imageUrl;
      }
    }));
    setImageUrls(urls);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRemove = async (recipeId: number, title: string) => {
    setRemoving(prev => new Set(prev).add(recipeId));
    try {
      await removeRecipeFromOffline(recipeId);
      toast.success(`"${title}" removed from offline storage`);
      await load();
    } catch {
      toast.error('Failed to remove download');
    } finally {
      setRemoving(prev => { const s = new Set(prev); s.delete(recipeId); return s; });
    }
  };

  const quotaMB = storage.quota ? Math.round(storage.quota / (1024 * 1024)) : null;
  const pct = quotaMB ? Math.min(100, Math.round((storage.usedMB / quotaMB) * 100)) : null;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-950 rounded-xl">
              <Download size={22} className="text-orange-500" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-stone-900 dark:text-stone-100">Downloads</h1>
              <p className="text-sm text-stone-500 dark:text-stone-400">Recipes available offline</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={load} className="gap-2 text-stone-500">
            <RefreshCw size={15} />
            Refresh
          </Button>
        </div>

        {/* Offline banner */}
        {!isOnline && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
            <WifiOff size={16} />
            You're offline — downloaded recipes are still accessible below.
          </div>
        )}

        {/* Storage usage */}
        <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 font-semibold text-stone-700 dark:text-stone-300">
              <HardDrive size={16} className="text-orange-400" />
              Storage Used
            </div>
            <span className="text-stone-500 dark:text-stone-400">
              {storage.usedMB} MB{quotaMB ? ` / ${quotaMB} MB` : ''}
            </span>
          </div>
          {pct !== null && (
            <div className="h-2 w-full rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${pct > 90 ? 'bg-red-400' : 'bg-orange-400'}`}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6 }}
              />
            </div>
          )}
          {pct !== null && pct > 90 && (
            <p className="text-xs text-red-500 font-semibold">
              ⚠️ Low storage space - free up space or remove downloads
            </p>
          )}
          <p className="text-xs text-stone-400 dark:text-stone-500">
            {downloads.length} recipe{downloads.length !== 1 ? 's' : ''} downloaded
          </p>
        </div>

        {/* Downloads list */}
        {downloads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
            <div className="p-5 bg-orange-50 dark:bg-stone-800 rounded-full">
              <Download size={32} className="text-orange-300" />
            </div>
            <p className="font-semibold text-stone-600 dark:text-stone-400">No downloads yet</p>
            <p className="text-sm text-stone-400 dark:text-stone-500 max-w-xs">
              Open any recipe and tap "Download for Offline" to save it for use without internet.
            </p>
            <Button variant="outline" onClick={() => navigate('/recipes')} className="mt-2">
              Browse Recipes
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {downloads.map((dl) => (
                <motion.div
                  key={dl.recipeId}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center gap-4 rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-sm"
                >
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-orange-50 dark:bg-stone-800">
                    {imageUrls[dl.recipeId] ? (
                      <img
                        src={imageUrls[dl.recipeId]}
                        alt={dl.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Download size={20} className="text-orange-200" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-stone-900 dark:text-stone-100 truncate">{dl.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {dl.hasVideo && (
                        <span className="text-xs bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full font-semibold">
                          Video
                        </span>
                      )}
                      {dl.totalSizeBytes > 0 && (
                        <span className="text-xs text-stone-400">{formatBytes(dl.totalSizeBytes)}</span>
                      )}
                      <span className="text-xs text-stone-400">{formatDate(dl.downloadedAt)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950 font-semibold"
                      onClick={() => navigate(`/recipe/${dl.recipeId}`)}
                    >
                      <Play size={14} />
                      Open
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
                      disabled={removing.has(dl.recipeId)}
                      onClick={() => handleRemove(dl.recipeId, dl.title)}
                    >
                      {removing.has(dl.recipeId) ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </Layout>
  );
}

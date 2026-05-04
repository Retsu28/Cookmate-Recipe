import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Camera,
  ChefHat,
  Eye,
  Loader2,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import api from '@/services/api';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { AdminSectionCard } from '../components/AdminSectionCard';
import { AdminStatCard } from '../components/AdminStatCard';
import { AdminTable, type AdminTableColumn } from '../components/AdminTable';
import { StatusBadge } from '../components/StatusBadge';
import type { StatusTone } from '../data/adminMockData';

interface AdminCameraSave {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  sourceType: 'upload' | 'capture' | string;
  thumbnailImageData: string | null;
  detectedIngredientName: string | null;
  detectedIngredientDescription: string | null;
  detectedIngredients: string[];
  suggestedRecipe: string | null;
  recipeMatchCount: number;
  confidence: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface AdminCameraStats {
  totalSaves: number;
  uniqueUsers: number;
  savesToday: number;
  withRecipeMatches: number;
}

interface AdminCameraResponse {
  saves: AdminCameraSave[];
  stats: AdminCameraStats;
}

const emptyStats: AdminCameraStats = {
  totalSaves: 0,
  uniqueUsers: 0,
  savesToday: 0,
  withRecipeMatches: 0,
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function cameraStatusTone(status: string): StatusTone {
  const normalized = status.toLowerCase();
  if (normalized.includes('matched')) return 'success';
  if (normalized.includes('only')) return 'warning';
  if (normalized.includes('no food')) return 'danger';
  return 'neutral';
}

function confidenceTone(confidence: string | null): StatusTone {
  if (confidence === 'high') return 'success';
  if (confidence === 'medium') return 'warning';
  if (confidence === 'low') return 'danger';
  return 'neutral';
}

function sourceLabel(sourceType: string) {
  return sourceType === 'capture' ? 'Camera capture' : 'Image upload';
}

export default function AIActivityMonitoring() {
  const [saves, setSaves] = useState<AdminCameraSave[]>([]);
  const [stats, setStats] = useState<AdminCameraStats>(emptyStats);
  const [selectedSave, setSelectedSave] = useState<AdminCameraSave | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchActivity = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await api.get<AdminCameraResponse>('/api/admin/ai-camera-saves?limit=80');
      const nextSaves = data.saves || [];
      setSaves(nextSaves);
      setStats(data.stats || emptyStats);
      setSelectedSave((current) => nextSaves.find((save) => save.id === current?.id) || nextSaves[0] || null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load AI Camera activity.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const filteredSaves = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return saves;

    return saves.filter((save) => {
      const searchable = [
        save.userName,
        save.userEmail,
        save.status,
        save.suggestedRecipe || '',
        ...save.detectedIngredients,
      ].join(' ').toLowerCase();

      return searchable.includes(needle);
    });
  }, [saves, search]);

  const statCards = useMemo(() => [
    {
      id: 'total',
      label: 'Saved camera scans',
      value: stats.totalSaves.toLocaleString(),
      change: 'Live My Saves',
      description: 'AI Camera results saved by users.',
      tone: 'success' as const,
      icon: Camera,
    },
    {
      id: 'users',
      label: 'Users monitored',
      value: stats.uniqueUsers.toLocaleString(),
      change: 'User preview',
      description: 'Accounts with saved AI Camera snapshots.',
      tone: 'info' as const,
      icon: Users,
    },
    {
      id: 'today',
      label: 'Saved today',
      value: stats.savesToday.toLocaleString(),
      change: 'Recent activity',
      description: 'New saved scans from the current day.',
      tone: 'warning' as const,
      icon: Sparkles,
    },
    {
      id: 'matches',
      label: 'Recipe matches',
      value: stats.withRecipeMatches.toLocaleString(),
      change: 'Suggestions',
      description: 'Saved scans that produced recipe matches.',
      tone: 'success' as const,
      icon: ChefHat,
    },
  ], [stats]);

  const columns: AdminTableColumn<AdminCameraSave>[] = useMemo(() => [
    {
      header: 'Preview',
      render: (save) => (
        <button
          className="flex items-center gap-3 text-left"
          onClick={() => setSelectedSave(save)}
          type="button"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-orange-100 bg-orange-50">
            {save.thumbnailImageData ? (
              <img src={save.thumbnailImageData} alt="" className="h-full w-full object-cover" />
            ) : (
              <Camera size={22} className="text-orange-400" />
            )}
          </div>
          <div>
            <p className="font-extrabold text-stone-900">#{save.id}</p>
            <p className="text-xs font-medium text-stone-400">{sourceLabel(save.sourceType)}</p>
          </div>
        </button>
      ),
    },
    {
      header: 'User',
      render: (save) => (
        <div>
          <p className="font-extrabold text-stone-900">{save.userName}</p>
          <p className="text-xs font-medium text-stone-400">#{save.userId} &middot; {save.userEmail}</p>
        </div>
      ),
    },
    {
      header: 'Detected ingredients',
      render: (save) => (
        <div className="flex max-w-xs flex-wrap gap-1.5">
          {save.detectedIngredients.length > 0 ? (
            save.detectedIngredients.slice(0, 4).map((ingredient) => (
              <StatusBadge key={ingredient} tone="neutral">{ingredient}</StatusBadge>
            ))
          ) : (
            <span className="text-sm font-medium text-stone-400">No ingredient saved</span>
          )}
          {save.detectedIngredients.length > 4 && (
            <StatusBadge tone="neutral">+{save.detectedIngredients.length - 4}</StatusBadge>
          )}
        </div>
      ),
    },
    {
      header: 'Suggested recipe',
      render: (save) => (
        <span className="font-bold text-stone-700">
          {save.suggestedRecipe || (save.recipeMatchCount > 0 ? `${save.recipeMatchCount} recipe matches` : 'No recipe match')}
        </span>
      ),
    },
    {
      header: 'Status',
      render: (save) => <StatusBadge tone={cameraStatusTone(save.status)}>{save.status}</StatusBadge>,
    },
    {
      header: 'Saved',
      render: (save) => <span className="font-bold text-stone-700">{formatDateTime(save.createdAt)}</span>,
    },
    {
      header: 'Actions',
      render: (save) => (
        <Button
          className="rounded-full"
          size="sm"
          variant={selectedSave?.id === save.id ? 'secondary' : 'ghost'}
          onClick={() => setSelectedSave(save)}
        >
          <Eye size={14} /> Preview
        </Button>
      ),
    },
  ], [selectedSave?.id]);

  return (
    <div>
      <AdminPageHeader
        title="AI Activity Monitoring"
        description="Monitor live AI Camera My Saves across users, including saved photo previews, detected ingredients, and recipe suggestions."
        actions={
          <Button
            className="rounded-full bg-orange-500 px-5 font-bold text-white hover:bg-orange-600"
            disabled={refreshing}
            onClick={() => fetchActivity(true)}
          >
            {refreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat, index) => (
          <AdminStatCard key={stat.id} {...stat} index={index} />
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <AdminSectionCard
          title="User Save Preview"
          description="Selected snapshot from the same saved AI Camera results users see in My Saves."
        >
          {loading ? (
            <div className="flex items-center justify-center py-16 text-stone-400">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : selectedSave ? (
            <motion.div
              key={selectedSave.id}
              className="space-y-5"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="aspect-square overflow-hidden rounded-[1.5rem] border border-orange-100 bg-orange-50">
                {selectedSave.thumbnailImageData ? (
                  <img src={selectedSave.thumbnailImageData} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-orange-400">
                    <Camera size={44} />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-400">User</p>
                  <p className="mt-1 text-lg font-extrabold text-stone-900">{selectedSave.userName}</p>
                  <p className="text-sm font-medium text-stone-400">{selectedSave.userEmail}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <StatusBadge tone={cameraStatusTone(selectedSave.status)}>{selectedSave.status}</StatusBadge>
                  <StatusBadge tone="neutral">{sourceLabel(selectedSave.sourceType)}</StatusBadge>
                  {selectedSave.confidence && (
                    <StatusBadge tone={confidenceTone(selectedSave.confidence)}>
                      {selectedSave.confidence} confidence
                    </StatusBadge>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-400">Saved</p>
                    <p className="mt-2 font-extrabold text-stone-900">{formatDateTime(selectedSave.createdAt)}</p>
                  </div>
                  <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-400">Matches</p>
                    <p className="mt-2 font-extrabold text-stone-900">{selectedSave.recipeMatchCount}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-400">Detected</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedSave.detectedIngredients.length > 0 ? (
                      selectedSave.detectedIngredients.map((ingredient) => (
                        <StatusBadge key={ingredient} tone="neutral">{ingredient}</StatusBadge>
                      ))
                    ) : (
                      <span className="text-sm font-medium text-stone-400">No ingredient saved</span>
                    )}
                  </div>
                  {selectedSave.detectedIngredientDescription && (
                    <p className="mt-3 text-sm leading-relaxed text-stone-500">
                      {selectedSave.detectedIngredientDescription}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-700">Suggested recipe</p>
                  <p className="mt-2 font-extrabold text-stone-900">
                    {selectedSave.suggestedRecipe || 'No recipe match saved'}
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-orange-200 bg-orange-50/60 px-6 py-16 text-center">
              <ShieldCheck size={34} className="text-orange-400" />
              <p className="mt-3 font-extrabold text-stone-900">No saved AI Camera activity yet</p>
              <p className="mt-1 max-w-sm text-sm leading-relaxed text-stone-500">
                User saves will appear here after AI Camera results are saved.
              </p>
            </div>
          )}
        </AdminSectionCard>

        <AdminSectionCard
          title="AI Camera My Saves"
          description={`${filteredSaves.length} of ${saves.length} saved user snapshots shown.`}
          action={
            <div className="flex min-w-[220px] items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 shadow-sm">
              <Search size={14} className="text-stone-400" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-stone-700 outline-none placeholder:text-stone-400"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search user or ingredient"
                type="text"
                value={search}
              />
            </div>
          }
        >
          {loading ? (
            <div className="flex items-center justify-center py-16 text-stone-400">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : (
            <AdminTable
              data={filteredSaves}
              columns={columns}
              getRowKey={(save) => save.id}
              emptyMessage="No AI Camera saves found."
            />
          )}
        </AdminSectionCard>
      </div>
    </div>
  );
}

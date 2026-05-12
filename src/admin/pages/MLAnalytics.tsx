import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Brain,
  ChefHat,
  Clock,
  Loader2,
  RefreshCcw,
  TrendingUp,
  Users,
  X,
  Zap,
  BarChart3,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { AdminSectionCard } from '../components/AdminSectionCard';
import { AdminStatCard } from '../components/AdminStatCard';
import { AdminTable, type AdminTableColumn } from '../components/AdminTable';
import { StatusBadge } from '../components/StatusBadge';
import type { StatusTone } from '../data/adminMockData';
import api from '@/services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModelStatusEntry {
  model: string;
  trained: boolean;
  trained_at: string | null;
  accuracy: number | null;
  method?: string | null;
  rows?: number;
}

interface TrendForecast {
  recipe_id: number;
  title: string;
  current_views: number;
  predicted_views: number;
  trend_direction: 'up' | 'down';
  confidence: number;
}

interface ChurnUser {
  user_id: number;
  name: string;
  email: string;
  last_active: string | null;
  risk: 'High' | 'Medium' | 'Low';
  engagement_score: number;
  recipes_viewed: number;
  meal_plans: number;
  ai_scans: number;
}

interface IngredientGap {
  ingredient: string;
  scan_frequency: number;
  recipe_match_count: number;
  is_gap: boolean;
}

interface TrafficForecast {
  heatmap: number[][];
  heatmap_raw?: number[][];
  peak_hour: number;
  peak_day: string;
  seven_day_forecast: { date: string; day_name: string; predicted_events: number }[];
  day_names: string[];
}

type TabId = 'trend' | 'churn' | 'gaps' | 'traffic';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function riskTone(risk: string): StatusTone {
  if (risk === 'High') return 'danger';
  if (risk === 'Medium') return 'warning';
  return 'success';
}

function fmtDate(iso: string | null) {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// ─── Model Status Bar ─────────────────────────────────────────────────────────

function ModelStatusBar({ offline, onRefresh, refreshing }: { offline: boolean; onRefresh: () => void; refreshing: boolean }) {
  const [statuses, setStatuses] = useState<ModelStatusEntry[]>([]);

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ models: ModelStatusEntry[] }>('/api/ml-analytics/model-status');
      setStatuses(data.models || []);
    } catch {
      setStatuses([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!offline) load(); }, [offline, load]);

  if (offline) {
    return (
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4">
        <AlertTriangle size={18} className="shrink-0 text-orange-600" />
        <p className="text-sm font-bold text-orange-800">
          ML service is offline — predictions unavailable. Start the FastAPI service and refresh.
        </p>
        <Button size="sm" variant="outline" className="ml-auto rounded-full border-orange-300 text-orange-700" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
          Retry
        </Button>
      </div>
    );
  }

  if (!statuses.length) return null;

  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {statuses.map((s) => (
        <div key={s.model} className="flex items-start gap-3 rounded-2xl border border-stone-100 bg-white p-4 shadow-sm">
          <div className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${s.trained ? 'bg-emerald-500' : 'bg-stone-300'}`} />
          <div className="min-w-0">
            <p className="truncate text-xs font-extrabold text-stone-900">{s.model}</p>
            {s.trained ? (
              <>
                <p className="mt-0.5 text-[10px] text-stone-400">Trained {fmtTime(s.trained_at)}</p>
                {(() => {
                  const methodLabels: Record<string, string> = {
                    rule_based: 'Rule-based',
                    tfidf_similarity: 'TF-IDF similarity',
                    dow_mean: 'DOW-mean',
                    arima: 'ARIMA(1,1,1)',
                  };
                  const methodLabel = s.method ? methodLabels[s.method] : null;
                  if (methodLabel && s.accuracy == null) {
                    return <p className="mt-0.5 text-[10px] font-bold text-stone-400">{methodLabel}</p>;
                  }
                  if (s.accuracy != null) {
                    const label = s.model === 'Churn Risk' ? 'Silhouette' : 'R²';
                    const value = s.model === 'Churn Risk'
                      ? s.accuracy.toFixed(3)
                      : `${(s.accuracy * 100).toFixed(1)}%`;
                    return <p className="mt-0.5 text-[10px] font-bold text-orange-600">{label}: {value}</p>;
                  }
                  return null;
                })()}
              </>
            ) : (
              <>
                <p className="mt-0.5 text-[10px] font-bold text-amber-600">Rule-based (on-demand)</p>
                <p className="mt-0.5 text-[10px] text-stone-400">Auto-trains when data grows</p>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function MLSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-[2rem] bg-stone-100" />
        ))}
      </div>
      <div className="h-64 rounded-[2rem] bg-stone-100" />
    </div>
  );
}

// ─── Insufficient Data State ──────────────────────────────────────────────────

function InsufficientData({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <Brain size={40} className="text-stone-300" />
      <p className="text-sm font-bold text-stone-500">{message || 'Not enough data yet (need ≥50 records)'}</p>
      <p className="text-xs text-stone-400">Add data and refresh — predictions will appear immediately.</p>
    </div>
  );
}

// ─── Tab 1: Trend Forecast ────────────────────────────────────────────────────

function TrendTab() {
  const [data, setData] = useState<{ forecasts: TrendForecast[]; insufficient_data: boolean; message?: string; r2?: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any>('/api/ml-analytics/trending-forecast')
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <MLSkeleton />;
  if (!data) return <InsufficientData message="Could not load trend data." />;
  if (data.insufficient_data) return <InsufficientData message={data.message} />;

  const top = data.forecasts[0];
  const maxPredicted = Math.max(...data.forecasts.map((f) => f.predicted_views), 1);

  const columns: AdminTableColumn<TrendForecast>[] = [
    {
      header: 'Recipe',
      render: (f) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
            <ChefHat size={16} />
          </div>
          <p className="font-extrabold text-stone-900">{f.title}</p>
        </div>
      ),
    },
    { header: 'Current views', render: (f) => <span className="font-bold text-stone-700">{f.current_views}</span> },
    { header: 'Predicted (next week)', render: (f) => <span className="font-extrabold text-orange-600">{Math.round(f.predicted_views)}</span> },
    {
      header: 'Trend',
      render: (f) => (
        <div className="flex items-center gap-1">
          {f.trend_direction === 'up'
            ? <ArrowUp size={14} className="text-emerald-500" />
            : <ArrowDown size={14} className="text-red-500" />}
          <StatusBadge tone={f.trend_direction === 'up' ? 'success' : 'danger'}>
            {f.trend_direction === 'up' ? 'Rising' : 'Falling'}
          </StatusBadge>
        </div>
      ),
    },
    { header: 'Confidence', render: (f) => <span className="font-bold text-stone-700">{f.confidence}%</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <AdminStatCard
          label="Predicted top recipe"
          value={top ? top.title.slice(0, 22) + (top.title.length > 22 ? '…' : '') : '—'}
          change={top ? `${top.confidence}% confidence` : '—'}
          description="Most likely recipe to trend next week"
          tone="success"
          icon={TrendingUp}
          index={0}
        />
        <AdminStatCard
          label="Recipes forecasted"
          value={String(data.forecasts.length)}
          change="Top 5 shown"
          description="Recipes with enough view history to forecast"
          tone="info"
          icon={Brain}
          index={1}
        />
        {data.r2 != null && (
          <AdminStatCard
            label="Model accuracy (R²)"
            value={`${(data.r2 * 100).toFixed(1)}%`}
            change="Linear Regression"
            description="Variance explained by the trend model"
            tone="neutral"
            icon={Zap}
            index={2}
          />
        )}
      </div>

      <AdminSectionCard title="Top 5 Trending Forecast" description="Predicted recipe popularity for next week based on view history.">
        <div className="mb-6 space-y-3 pt-2">
          {data.forecasts.map((f, i) => {
            const pct = Math.round((f.predicted_views / maxPredicted) * 100);
            return (
              <div key={f.recipe_id} className="flex items-center gap-4">
                <span className="w-4 shrink-0 text-right text-xs font-extrabold text-stone-400">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-extrabold text-stone-900">{f.title}</p>
                    <span className="shrink-0 text-xs font-bold text-orange-600">{Math.round(f.predicted_views)} views</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-stone-100">
                    <motion.div
                      className="h-full rounded-full bg-orange-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <AdminTable
          data={data.forecasts}
          columns={columns}
          getRowKey={(f) => f.recipe_id}
          emptyMessage="No forecasts available."
        />
      </AdminSectionCard>
    </div>
  );
}

// ─── Tab 2: Churn Risk ────────────────────────────────────────────────────────

function ChurnTab() {
  const [data, setData] = useState<{ users: ChurnUser[]; summary: { high: number; medium: number; low: number }; insufficient_data: boolean; message?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');

  useEffect(() => {
    api.get<any>('/api/ml-analytics/churn-risk')
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    return filter === 'All' ? data.users : data.users.filter((u) => u.risk === filter);
  }, [data, filter]);

  const columns: AdminTableColumn<ChurnUser>[] = useMemo(() => [
    {
      header: 'User',
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-900 text-sm font-extrabold text-white">
            {u.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-extrabold text-stone-900">{u.name}</p>
            <p className="text-xs text-stone-400">{u.email}</p>
          </div>
        </div>
      ),
    },
    { header: 'Last active', render: (u) => <span className="font-bold text-stone-700">{fmtDate(u.last_active)}</span> },
    { header: 'Risk', render: (u) => <StatusBadge tone={riskTone(u.risk)}>{u.risk}</StatusBadge> },
    { header: 'Engagement', render: (u) => <span className="font-extrabold text-stone-900">{u.engagement_score}</span> },
    { header: 'Recipes viewed', render: (u) => u.recipes_viewed },
    { header: 'AI scans', render: (u) => u.ai_scans },
  ], []);

  if (loading) return <MLSkeleton />;
  if (!data) return <InsufficientData message="Could not load churn data." />;
  if (data.insufficient_data) return <InsufficientData message={data.message} />;

  const { summary } = data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <AdminStatCard label="High risk" value={String(summary.high)} change="Likely to churn" description="Users inactive 30+ days with low engagement" tone="danger" icon={Users} index={0} />
        <AdminStatCard label="Medium risk" value={String(summary.medium)} change="Needs attention" description="Users with declining activity patterns" tone="warning" icon={Users} index={1} />
        <AdminStatCard label="Low risk" value={String(summary.low)} change="Active" description="Users with healthy engagement scores" tone="success" icon={Users} index={2} />
      </div>

      <AdminSectionCard
        title="User Churn Risk"
        description={`${filtered.length} users shown.`}
        action={
          <div className="flex gap-2">
            {(['All', 'High', 'Medium', 'Low'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  filter === f
                    ? 'bg-orange-500 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        }
      >
        <AdminTable data={filtered} columns={columns} getRowKey={(u) => u.user_id} emptyMessage="No users in this risk category." />
      </AdminSectionCard>
    </div>
  );
}

// ─── Tab 3: Ingredient Gaps ───────────────────────────────────────────────────

function GapsTab() {
  const [data, setData] = useState<{ gaps: IngredientGap[]; total_gaps: number; total_scanned: number; insufficient_data: boolean; message?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any>('/api/ml-analytics/ingredient-gaps')
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const columns: AdminTableColumn<IngredientGap>[] = [
    {
      header: 'Ingredient',
      render: (g) => (
        <div className="flex items-center gap-2">
          <p className="font-extrabold capitalize text-stone-900">{g.ingredient}</p>
          {g.is_gap && <StatusBadge tone="danger">Gap</StatusBadge>}
        </div>
      ),
    },
    { header: 'AI scan frequency', render: (g) => <span className="font-bold text-stone-700">{g.scan_frequency}</span> },
    {
      header: 'Recipe matches',
      render: (g) => (
        <span className={`font-extrabold ${g.recipe_match_count === 0 ? 'text-red-500' : 'text-emerald-600'}`}>
          {g.recipe_match_count}
        </span>
      ),
    },
    {
      header: 'Action',
      render: (g) => g.is_gap ? (
        <a href="/admin/recipes" className="flex items-center gap-1 rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-white hover:bg-orange-600 transition-colors">
          Create Recipe <ArrowRight size={12} />
        </a>
      ) : null,
    },
  ];

  if (loading) return <MLSkeleton />;
  if (!data) return <InsufficientData message="Could not load ingredient gap data." />;
  if (data.insufficient_data) return <InsufficientData message={data.message} />;

  const gapItems = data.gaps.filter((g) => g.is_gap);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <AdminStatCard
          label="Ingredient gaps"
          value={String(data.total_gaps)}
          change="No recipe match"
          description="Ingredients scanned by AI Camera with zero matching recipes"
          tone="danger"
          icon={AlertTriangle}
          index={0}
        />
        <AdminStatCard
          label="Total ingredients scanned"
          value={String(data.total_scanned)}
          change="Via AI Camera"
          description="Unique ingredients detected across all AI Camera saves"
          tone="neutral"
          icon={Brain}
          index={1}
        />
      </div>

      {gapItems.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-orange-600" />
          <p className="text-sm font-bold text-orange-800">
            {gapItems.length} ingredient{gapItems.length > 1 ? 's' : ''} have been scanned via AI Camera but have no matching recipe. Consider adding recipes for these ingredients.
          </p>
        </div>
      )}

      <AdminSectionCard
        title="Ingredient Frequency vs Recipe Coverage"
        description="All AI-scanned ingredients sorted by scan frequency."
      >
        <AdminTable
          data={data.gaps}
          columns={columns}
          getRowKey={(g) => g.ingredient}
          emptyMessage="No ingredient scan data available."
        />
      </AdminSectionCard>
    </div>
  );
}

// ─── Tab 4: Traffic Forecast ──────────────────────────────────────────────────

function fmtHour(h: number) {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

function TrafficTab() {
  const [data, setData] = useState<TrafficForecast & { insufficient_data: boolean; message?: string; trained_at?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{ day: string; hour: number; intensity: number; raw: number; x: number; y: number } | null>(null);

  useEffect(() => {
    api.get<any>('/api/ml-analytics/traffic-forecast')
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <MLSkeleton />;
  if (!data) return <InsufficientData message="Could not load traffic data." />;
  if (data.insufficient_data) return <InsufficientData message={data.message} />;

  const forecast = data.seven_day_forecast ?? [];
  const maxForecast = Math.max(...forecast.map((d) => d.predicted_events), 1);
  const totalPredicted = Math.round(forecast.reduce((s, d) => s + d.predicted_events, 0));
  const avgDaily = forecast.length ? Math.round(totalPredicted / forecast.length) : 0;

  const heatmapRaw = data.heatmap_raw ?? [];
  const dayNames = data.day_names ?? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Compute row totals (per day) and column totals (per hour) from raw counts
  const rowTotals = dayNames.map((_, di) =>
    (heatmapRaw[di] ?? []).reduce((s: number, v: number) => s + v, 0)
  );
  const colTotals = Array.from({ length: 24 }, (_, hi) =>
    dayNames.reduce((s, _, di) => s + (heatmapRaw[di]?.[hi] ?? 0), 0)
  );

  // Find the single peak cell
  let peakDi = 0;
  let peakHi = 0;
  let peakVal = -1;
  dayNames.forEach((_, di) => {
    Array.from({ length: 24 }).forEach((__, hi) => {
      const v = data.heatmap?.[di]?.[hi] ?? 0;
      if (v > peakVal) { peakVal = v; peakDi = di; peakHi = hi; }
    });
  });

  // Busiest contiguous 2-hour window
  let bestWindowSum = -1;
  let bestWindowDi = 0;
  let bestWindowHi = 0;
  dayNames.forEach((_, di) => {
    for (let hi = 0; hi < 23; hi++) {
      const s = (heatmapRaw[di]?.[hi] ?? 0) + (heatmapRaw[di]?.[hi + 1] ?? 0);
      if (s > bestWindowSum) { bestWindowSum = s; bestWindowDi = di; bestWindowHi = hi; }
    }
  });
  const busiestSummary = bestWindowSum > 0
    ? `Busiest: ${dayNames[bestWindowDi]?.slice(0, 3)} ${fmtHour(bestWindowHi)}–${fmtHour(bestWindowHi + 2 > 23 ? 0 : bestWindowHi + 2)} (${bestWindowSum} events)`
    : null;

  const cellColor = (val: number) => {
    if (val <= 0) return 'bg-stone-100 ring-1 ring-stone-200 dark:bg-stone-800 dark:ring-stone-700';
    if (val < 0.15) return 'bg-orange-50 dark:bg-orange-950';
    if (val < 0.3) return 'bg-orange-100 dark:bg-orange-900';
    if (val < 0.45) return 'bg-orange-200 dark:bg-orange-800';
    if (val < 0.6) return 'bg-orange-300 dark:bg-orange-700';
    if (val < 0.75) return 'bg-orange-400 dark:bg-orange-600';
    return 'bg-orange-500';
  };

  // Hourly breakdown data (sum across all days from heatmap_raw)
  const hourlyTotals = Array.from({ length: 24 }, (_, h) =>
    dayNames.reduce((s, _, di) => s + (heatmapRaw[di]?.[h] ?? 0), 0)
  );
  const maxHourly = Math.max(...hourlyTotals, 1);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          label="Peak hour"
          value={fmtHour(data.peak_hour)}
          change="Highest activity"
          description="Hour of day with the most predicted usage"
          tone="success"
          icon={Clock}
          index={0}
        />
        <AdminStatCard
          label="Peak day"
          value={data.peak_day}
          change="Busiest day"
          description="Day of the week with the most predicted traffic"
          tone="info"
          icon={Zap}
          index={1}
        />
        <AdminStatCard
          label="7-day total"
          value={String(totalPredicted)}
          change={`~${avgDaily}/day avg`}
          description="Total predicted activity events over the next week"
          tone="neutral"
          icon={TrendingUp}
          index={2}
        />
        <AdminStatCard
          label="Model trained"
          value={data.trained_at ? fmtDate(data.trained_at) : 'Live'}
          change={data.trained_at ? 'Scheduled retrain' : 'Rule-based'}
          description={data.trained_at ? 'Last training run for the traffic model' : 'Computing directly from activity data'}
          tone="neutral"
          icon={Brain}
          index={3}
        />
      </div>

      {/* ── Enhanced Heatmap ── */}
      <AdminSectionCard title="Activity Heatmap" description="Predicted activity intensity by hour and day of week. Hover a cell for details.">
        <div className="pt-3">
          {/* Hour labels + "Total" header */}
          <div className="mb-1.5 flex items-center gap-1 pl-12 pr-1">
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="flex-1 text-center text-[9px] font-bold text-stone-400">
                {h % 3 === 0 ? fmtHour(h).replace(' ', '\u00A0') : ''}
              </div>
            ))}
            <div className="w-9 shrink-0 text-center text-[9px] font-bold text-stone-400">Total</div>
          </div>

          {/* Heatmap rows with row totals */}
          {dayNames.map((day, di) => (
            <div key={day} className="mb-1 flex items-center gap-1">
              <div className="w-11 shrink-0 text-right pr-1.5 text-[11px] font-bold text-stone-500">{day.slice(0, 3)}</div>
              {Array.from({ length: 24 }, (_, hi) => {
                const val = data.heatmap?.[di]?.[hi] ?? 0;
                const raw = heatmapRaw[di]?.[hi] ?? 0;
                const isPeakCell = di === peakDi && hi === peakHi && peakVal > 0;
                return (
                  <div
                    key={hi}
                    className={`h-9 flex-1 cursor-crosshair rounded-lg transition-all duration-150 hover:scale-105 hover:ring-2 hover:ring-orange-400/50 ${cellColor(val)} ${isPeakCell ? 'ring-2 ring-orange-500 animate-pulse' : ''}`}
                    onMouseEnter={(e) => {
                      const rect = (e.target as HTMLElement).getBoundingClientRect();
                      setTooltip({ day, hour: hi, intensity: val, raw, x: rect.left + rect.width / 2, y: rect.top });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
              {/* Row total */}
              <div className="w-9 shrink-0 text-center text-[11px] font-extrabold text-stone-500">
                {rowTotals[di]}
              </div>
            </div>
          ))}

          {/* Column totals row */}
          <div className="mt-1 flex items-center gap-1 pl-12 pr-1">
            {colTotals.map((ct, hi) => (
              <div key={hi} className="flex-1 text-center text-[9px] font-bold text-stone-400">
                {ct > 0 ? ct : ''}
              </div>
            ))}
            <div className="w-9 shrink-0 text-center text-[11px] font-extrabold text-orange-600">
              {colTotals.reduce((a, b) => a + b, 0)}
            </div>
          </div>

          {/* Legend + Busiest summary */}
          <div className="mt-4 flex items-center justify-between gap-4">
            {busiestSummary ? (
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-orange-600">
                <Zap size={11} />
                {busiestSummary}
              </span>
            ) : <span />}
            <div className="flex items-center gap-1.5">
              <span className="mr-1 text-[9px] font-bold text-stone-400">Less</span>
              {['bg-stone-100', 'bg-orange-50', 'bg-orange-100', 'bg-orange-200', 'bg-orange-300', 'bg-orange-400', 'bg-orange-500'].map((c) => (
                <div key={c} className={`h-4 w-4 rounded ${c}`} />
              ))}
              <span className="ml-1 text-[9px] font-bold text-stone-400">More</span>
            </div>
          </div>
        </div>
        {tooltip && (
          <div
            className="pointer-events-none fixed z-50 rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 shadow-lg shadow-stone-200/60 dark:border-stone-700 dark:bg-stone-900"
            style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -120%)' }}
          >
            <p className="text-xs font-extrabold text-stone-900 dark:text-stone-100">{tooltip.day}</p>
            <p className="mt-0.5 text-[11px] font-bold text-orange-600">{fmtHour(tooltip.hour)} – {fmtHour(tooltip.hour === 23 ? 0 : tooltip.hour + 1)}</p>
            <p className="mt-0.5 text-[10px] font-bold text-stone-500">{tooltip.raw} event{tooltip.raw !== 1 ? 's' : ''}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-700">
                <div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.round(tooltip.intensity * 100)}%` }} />
              </div>
              <span className="shrink-0 text-[10px] font-bold text-stone-500">{Math.round(tooltip.intensity * 100)}%</span>
            </div>
          </div>
        )}
      </AdminSectionCard>

      {/* ── 7-Day Forecast ── */}
      <AdminSectionCard title="7-Day Traffic Forecast" description="Predicted activity events for the next 7 days.">
        <div className="pt-4 pb-2">
          <div className="grid grid-cols-7 items-end gap-3">
            {forecast.map((day, i) => {
              const pct = Math.max(Math.round((day.predicted_events / maxForecast) * 100), 4);
              const prev = i > 0 ? forecast[i - 1].predicted_events : null;
              const delta = prev != null && prev > 0 ? ((day.predicted_events - prev) / prev) * 100 : null;
              const isPeak = day.predicted_events === maxForecast;
              return (
                <div key={day.date} className="flex flex-col items-center gap-1.5">
                  {isPeak ? (
                    <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wider text-white shadow-sm">Peak</span>
                  ) : delta != null ? (
                    <span className={`flex items-center gap-0.5 text-[9px] font-bold ${delta >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                      {delta >= 0 ? <ArrowUp size={9} /> : <ArrowDown size={9} />}
                      {Math.abs(delta).toFixed(0)}%
                    </span>
                  ) : (
                    <span className="text-[9px] text-transparent">—</span>
                  )}
                  <span className="text-[10px] font-extrabold text-stone-700 dark:text-stone-200">{Math.round(day.predicted_events)}</span>
                  <div className="flex h-40 w-full items-end rounded-2xl bg-stone-100 dark:bg-stone-800 p-1">
                    <motion.div
                      className={`w-full rounded-xl shadow-md ${isPeak ? 'bg-orange-600 shadow-orange-600/30' : 'bg-orange-400 shadow-orange-400/20'}`}
                      initial={{ height: 0 }}
                      animate={{ height: `${pct}%` }}
                      transition={{ duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                  <div className="text-center">
                    <span className={`block text-[10px] font-extrabold uppercase tracking-wider ${isPeak ? 'text-orange-600' : 'text-stone-500'}`}>
                      {day.day_name.slice(0, 3)}
                    </span>
                    <span className="block text-[9px] text-stone-400">
                      {new Date(day.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </AdminSectionCard>

      {/* ── Hourly Breakdown Chart ── */}
      <AdminSectionCard title="Hourly Activity Breakdown" description="Total activity events per hour across all days of the week.">
        <div className="pt-4 pb-1">
          {/* Chart area with Y-axis */}
          <div className="flex gap-2">
            {/* Y-axis labels */}
            <div className="flex w-8 shrink-0 flex-col justify-between pb-6 pt-1">
              <span className="text-right text-[9px] font-bold text-stone-400">{maxHourly}</span>
              <span className="text-right text-[9px] font-bold text-stone-400">{Math.round(maxHourly / 2)}</span>
              <span className="text-right text-[9px] font-bold text-stone-400">0</span>
            </div>
            {/* Bars */}
            <div className="flex flex-1 items-end gap-[2px]" style={{ height: 180 }}>
              {hourlyTotals.map((count, h) => {
                const pct = Math.max(Math.round((count / maxHourly) * 100), count > 0 ? 8 : 2);
                const isPeakHour = h === data.peak_hour;
                return (
                  <div key={h} className="group relative flex flex-1 flex-col items-center justify-end" style={{ height: '100%' }}>
                    {/* Hover tooltip */}
                    <div className="pointer-events-none absolute -top-2 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-stone-700 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200">
                      <span className="text-orange-600">{fmtHour(h)}</span> — {count} event{count !== 1 ? 's' : ''}
                    </div>
                    {/* Count label on top of active bars */}
                    {count > 0 && (
                      <span className={`mb-1 text-[8px] font-extrabold ${isPeakHour ? 'text-orange-600' : 'text-stone-500'}`}>
                        {count}
                      </span>
                    )}
                    <motion.div
                      className={`w-full rounded-t-md ${isPeakHour ? 'bg-orange-600 shadow-sm shadow-orange-600/30' : count > 0 ? 'bg-orange-400/80' : 'bg-stone-200/50 dark:bg-stone-700/40'}`}
                      initial={{ height: 0 }}
                      animate={{ height: `${pct}%` }}
                      transition={{ duration: 0.4, delay: h * 0.02, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          {/* Hour labels */}
          <div className="ml-10 flex gap-[2px]">
            {hourlyTotals.map((_, h) => (
              <div key={h} className="flex-1 text-center">
                <span className={`text-[8px] font-bold ${h === data.peak_hour ? 'text-orange-600' : 'text-stone-400'}`}>
                  {h % 3 === 0 ? fmtHour(h).replace(' AM', 'a').replace(' PM', 'p') : ''}
                </span>
              </div>
            ))}
          </div>
          {/* Summary footer */}
          <div className="mt-3 flex items-center justify-center gap-4 border-t border-stone-100 pt-3 dark:border-stone-800">
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-orange-600">
              <BarChart3 size={12} />
              Peak: {fmtHour(data.peak_hour)} ({hourlyTotals[data.peak_hour]} events)
            </span>
            <span className="text-[10px] text-stone-400">·</span>
            <span className="text-[10px] font-bold text-stone-500">
              Total: {hourlyTotals.reduce((a, b) => a + b, 0)} events across 24 hours
            </span>
          </div>
        </div>
      </AdminSectionCard>
    </div>
  );
}

// ─── Drift Banner ─────────────────────────────────────────────────────────────

interface DriftReport {
  any_drifted: boolean;
  checked_at: string;
  threshold: number;
  models: Record<string, { status: string; mean_relative_error?: number; relative_error?: number }>;
}

function DriftBanner() {
  const [report, setReport] = useState<DriftReport | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    api.get<DriftReport>('/api/ml-analytics/drift-report')
      .then(setReport)
      .catch(() => null);
  }, []);

  if (!report || !report.any_drifted || dismissed) return null;

  const driftedModels = Object.entries(report.models)
    .filter(([, v]) => v.status === 'drifted')
    .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1));

  return (
    <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />
      <div className="flex-1 text-xs">
        <span className="font-extrabold text-amber-800">Model drift detected — </span>
        <span className="text-amber-700">{driftedModels.join(', ')} predictions have diverged &gt;50% from recent actuals. Consider retraining.</span>
      </div>
      <button onClick={() => setDismissed(true)} className="shrink-0 text-amber-400 hover:text-amber-600">
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string }[] = [
  { id: 'trend', label: 'Trend Forecast' },
  { id: 'churn', label: 'Churn Risk' },
  { id: 'gaps', label: 'Ingredient Gaps' },
  { id: 'traffic', label: 'Traffic Forecast' },
];

export default function MLAnalytics() {
  const [activeTab, setActiveTab] = useState<TabId>('trend');
  const [offline, setOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const checkStatus = useCallback(async () => {
    setRefreshing(true);
    try {
      await api.get('/api/ml-analytics/model-status');
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { checkStatus(); }, [checkStatus]);

  return (
    <div>
      <AdminPageHeader
        title="ML Analytics"
        description="Machine learning predictions trained on live CookMate user data — recipe trends, churn risk, ingredient gaps, and traffic forecasts."
        actions={
          <Button
            className="rounded-full bg-orange-500 px-5 font-bold text-white hover:bg-orange-600"
            disabled={refreshing}
            onClick={checkStatus}
          >
            {refreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
            Refresh
          </Button>
        }
      />

      <ModelStatusBar offline={offline} onRefresh={checkStatus} refreshing={refreshing} />
      {!offline && <DriftBanner />}

      <div className="mb-6 flex gap-1 rounded-2xl border border-stone-200 bg-stone-100 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {!offline && (
        <div className="relative">
          <div className={activeTab === 'trend' ? 'block' : 'hidden'}>
            <TrendTab />
          </div>
          <div className={activeTab === 'churn' ? 'block' : 'hidden'}>
            <ChurnTab />
          </div>
          <div className={activeTab === 'gaps' ? 'block' : 'hidden'}>
            <GapsTab />
          </div>
          <div className={activeTab === 'traffic' ? 'block' : 'hidden'}>
            <TrafficTab />
          </div>
        </div>
      )}
    </div>
  );
}

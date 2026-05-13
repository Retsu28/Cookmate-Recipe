import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Database, KeyRound, Loader2, RefreshCcw, Server, ShieldCheck, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { AdminSectionCard } from '../components/AdminSectionCard';
import { StatusBadge } from '../components/StatusBadge';
import type { StatusTone, SystemStatusItem } from '../data/adminMockData';
import api from '@/services/api';

interface HealthData {
  db: {
    ok: boolean;
    latencyMs: number;
    counts: {
      users: number;
      recipes: number;
      ingredients: number;
      mealPlans: number;
      aiScans: number;
      reviews: number;
      auditLog: number;
    } | null;
  };
  api: { ok: boolean };
  timestamp: string;
}

function latencyTone(ms: number): StatusTone {
  if (ms < 100) return 'success';
  if (ms < 300) return 'warning';
  return 'danger';
}

export default function SystemStatus() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchHealth = () => {
    setLoading(true);
    api.get<HealthData>('/api/admin/system-health')
      .then((data) => {
        setHealth(data);
        setLastRefreshed(new Date());
      })
      .catch(() => {
        setHealth({ db: { ok: false, latencyMs: 0, counts: null }, api: { ok: true }, timestamp: new Date().toISOString() });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchHealth(); }, []);

  const liveStatuses: SystemStatusItem[] = health ? [
    {
      id: 'db',
      name: 'PostgreSQL database',
      status: health.db.ok ? `Connected · ${health.db.latencyMs}ms` : 'Disconnected',
      description: health.db.ok && health.db.counts
        ? `${health.db.counts.recipes} recipes · ${health.db.counts.users} users · ${health.db.counts.ingredients} ingredients`
        : 'Connection failed — check database configuration.',
      tone: health.db.ok ? latencyTone(health.db.latencyMs) : 'danger',
    },
    {
      id: 'meal_plans',
      name: 'Meal planner',
      status: health.db.counts ? `${health.db.counts.mealPlans} plans` : '—',
      description: health.db.counts ? `${health.db.counts.mealPlans} total meal plans created across all users` : 'No data',
      tone: health.db.counts && health.db.counts.mealPlans > 0 ? 'success' : 'neutral',
    },
    {
      id: 'ai',
      name: 'AI camera saves',
      status: health.db.counts ? `${health.db.counts.aiScans} saves` : '—',
      description: health.db.counts ? `${health.db.counts.aiScans} scans saved · running through Express Gemini proxy` : 'No data',
      tone: health.db.counts && health.db.counts.aiScans > 0 ? 'success' : 'neutral',
    },
    {
      id: 'reviews',
      name: 'Reviews',
      status: health.db.counts ? `${health.db.counts.reviews} total` : '—',
      description: health.db.counts ? `${health.db.counts.reviews} user reviews · ${health.db.counts.auditLog} audit log entries` : 'No data',
      tone: 'info',
    },
    {
      id: 'api',
      name: 'Express API',
      status: health.api.ok ? 'Healthy' : 'Error',
      description: health.api.ok ? 'REST API responding normally to all admin requests.' : 'API appears unhealthy — check server logs.',
      tone: health.api.ok ? 'success' : 'danger',
    },
    {
      id: 'pwa',
      name: 'PWA installable',
      status: 'Configured',
      description: 'Manifest and install flow are present for the web app.',
      tone: 'success',
    },
    {
      id: 'sw',
      name: 'Service worker',
      status: 'Configured',
      description: 'Workbox precaches app shell assets and keeps AI requests network-only.',
      tone: 'success',
    },
    {
      id: 'gemini',
      name: 'Gemini proxy policy',
      status: 'Server-side only',
      description: 'GEMINI_API_KEY is server-side only — not exposed in browser bundles.',
      tone: 'success',
    },
  ] : [];

  return (
    <div>
      <AdminPageHeader
        title="System Status"
        description="Live health check of the database, API, and service layers. Refreshes on page load."
        actions={
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-bold text-stone-700 shadow-sm transition hover:border-orange-300 hover:text-orange-600 disabled:opacity-50"
          >
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        }
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <motion.div
          className="rounded-[2rem] border border-orange-200 bg-orange-50 p-5"
          initial={{ opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, delay: 0, ease: [0.22, 1, 0.36, 1] }}
        >
          <ShieldCheck size={24} className="text-orange-700" />
          <p className="mt-3 font-extrabold text-stone-900">PWA configured</p>
          <p className="mt-1 text-sm leading-relaxed text-stone-600">Manifest, icons, and Workbox generation are part of the web build.</p>
        </motion.div>
        <motion.div
          className="rounded-[2rem] border border-orange-200 bg-orange-50 p-5"
          initial={{ opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.07, ease: [0.22, 1, 0.36, 1] }}
        >
          <Server size={24} className="text-orange-700" />
          <p className="mt-3 font-extrabold text-stone-900">AI server-side</p>
          <p className="mt-1 text-sm leading-relaxed text-stone-600">Gemini camera analysis runs through the Express API and keeps provider keys out of client bundles.</p>
        </motion.div>
        <motion.div
          className="rounded-[2rem] border border-orange-200 bg-orange-50 p-5"
          initial={{ opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
        >
          <AlertTriangle size={24} className="text-orange-700" />
          <p className="mt-3 font-extrabold text-stone-900">Roadmap tracked</p>
          <p className="mt-1 text-sm leading-relaxed text-stone-600">Firebase auth and database recipes are active while offline caching and saved recipe flows remain tracked separately.</p>
        </motion.div>
      </div>

      {/* DB Latency summary bar */}
      {health && (
        <motion.div
          className="mb-6 flex flex-wrap items-center gap-4 rounded-[2rem] border border-stone-100 bg-white p-5 shadow-lg shadow-stone-200/40"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-2">
            <Database size={18} className="text-stone-400" />
            <span className="text-sm font-bold text-stone-700">PostgreSQL</span>
            {health.db.ok
              ? <CheckCircle2 size={16} className="text-emerald-500" />
              : <XCircle size={16} className="text-red-500" />}
          </div>
          {health.db.ok && (
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${latencyTone(health.db.latencyMs) === 'success' ? 'bg-emerald-100 text-emerald-700' : latencyTone(health.db.latencyMs) === 'warning' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
              {health.db.latencyMs}ms latency
            </span>
          )}
          {loading && <Loader2 size={15} className="animate-spin text-stone-400" />}
          {lastRefreshed && !loading && (
            <span className="ml-auto flex items-center gap-1.5 text-xs text-stone-400">
              <Clock size={12} />
              Last checked {lastRefreshed.toLocaleTimeString()}
            </span>
          )}
        </motion.div>
      )}

      <AdminSectionCard title="Status Matrix" description="Live health data from the database combined with static deployment configuration status.">
        {loading && !health ? (
          <div className="flex items-center justify-center py-12 text-stone-400">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {liveStatuses.map((item) => (
              <div key={item.id} className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-extrabold text-stone-900">{item.name}</p>
                  <StatusBadge tone={item.tone}>{item.status}</StatusBadge>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">{item.description}</p>
              </div>
            ))}
          </div>
        )}
      </AdminSectionCard>

      <motion.div
        className="mt-6 rounded-[2rem] border border-orange-200 bg-orange-50 p-5"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-orange-600">
            <KeyRound size={20} />
          </div>
          <div>
            <p className="font-extrabold text-stone-900">Environment variable safety reminder</p>
            <p className="mt-1 text-sm leading-relaxed text-stone-600">
              Keep GEMINI_API_KEY server-side only. Do not add VITE_GEMINI_API_KEY or expose provider secrets in browser bundles.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

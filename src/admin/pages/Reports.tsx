import { useEffect, useState } from 'react';
import { Activity, BarChart3, Camera, CalendarDays, TrendingUp, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { AdminSectionCard } from '../components/AdminSectionCard';
import { MetricBarList } from '../components/MetricBarList';
import type { ReportMetric } from '../data/adminMockData';
import api from '@/services/api';

interface ReportCard {
  label: string;
  value: string;
  detail: string;
  icon: React.ElementType;
  live?: boolean;
}

interface ReportsData {
  popularRecipes: ReportMetric[];
  mostPlanned: ReportMetric[];
  userActivity: ReportMetric[];
}

export default function Reports() {
  const [cards, setCards] = useState<ReportCard[]>([
    { label: 'Recipe engagement', value: '—', detail: 'Loading…', icon: BarChart3 },
    { label: 'AI camera saves', value: '—', detail: 'Loading…', icon: Camera },
    { label: 'Meal plans created', value: '—', detail: 'Loading…', icon: CalendarDays },
    { label: 'Peak traffic', value: '—', detail: 'Loading…', icon: Activity },
  ]);
  const [popularRecipes, setPopularRecipes] = useState<ReportMetric[]>([]);
  const [mostPlanned, setMostPlanned] = useState<ReportMetric[]>([]);
  const [userActivity, setUserActivity] = useState<ReportMetric[]>([]);

  useEffect(() => {
    Promise.allSettled([
      api.get<ReportsData>('/api/admin/reports'),
      api.get<{ forecasts: { predicted_views: number }[]; insufficient_data?: boolean }>('/api/ml-analytics/trending-forecast'),
      api.get<{ peak_hour: number; peak_day: string; insufficient_data?: boolean }>('/api/ml-analytics/traffic-forecast'),
    ]).then(([reportsResult, trendResult, trafficResult]) => {
      if (reportsResult.status === 'fulfilled') {
        const d = reportsResult.value;
        setPopularRecipes(d.popularRecipes || []);
        setMostPlanned(d.mostPlanned || []);
        setUserActivity(d.userActivity || []);

        const actViews = d.userActivity.find((a) => a.id === 'browse')?.detail ?? '—';
        const actScans = d.userActivity.find((a) => a.id === 'camera')?.detail ?? '—';
        const actPlans = d.userActivity.find((a) => a.id === 'planner')?.detail ?? '—';

        setCards((prev) => {
          const next = [...prev];
          next[0] = { label: 'Recipe views', value: actViews.split(' ')[0], detail: 'Total unique recipe views', icon: BarChart3, live: true };
          next[1] = { label: 'AI camera saves', value: actScans.split(' ')[0], detail: 'Total scans saved', icon: Camera, live: true };
          next[2] = { label: 'Meal plans', value: actPlans.split(' ')[0], detail: 'Total meal plans created', icon: CalendarDays, live: true };
          return next;
        });
      }

      if (trendResult.status === 'fulfilled' && !trendResult.value.insufficient_data) {
        const totalPredicted = trendResult.value.forecasts.reduce((s, f) => s + (f.predicted_views ?? 0), 0);
        if (totalPredicted > 0) {
          setCards((prev) => {
            const next = [...prev];
            next[0] = { label: 'Predicted recipe views', value: totalPredicted.toLocaleString(), detail: 'ML forecast — next 7 days', icon: TrendingUp, live: true };
            return next;
          });
        }
      }

      if (trafficResult.status === 'fulfilled' && !trafficResult.value.insufficient_data) {
        const { peak_hour, peak_day } = trafficResult.value;
        setCards((prev) => {
          const next = [...prev];
          next[3] = { label: 'Peak traffic', value: `${peak_day} ${peak_hour}:00`, detail: 'ML traffic forecast — busiest slot', icon: Zap, live: true };
          return next;
        });
      }
    });
  }, []);

  return (
    <div>
      <AdminPageHeader
        title="Reports"
        description="Live recipe views, meal plans, AI usage, and engagement. ML forecast cards are powered by the ML service."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            className="rounded-[2rem] border border-stone-100 bg-white p-5 shadow-lg shadow-stone-200/40 transition-shadow hover:shadow-xl"
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                <card.icon size={20} />
              </div>
              {card.live && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Live</span>
              )}
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-400">{card.label}</p>
            <p className="mt-2 text-3xl font-extrabold text-stone-900">{card.value}</p>
            <p className="mt-1 text-sm text-stone-500">{card.detail}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <AdminSectionCard title="Most Viewed Recipes" description="Top recipes by unique user views — live from the database.">
          {popularRecipes.length === 0
            ? <p className="py-8 text-center text-sm text-stone-400">No view data yet.</p>
            : <MetricBarList items={popularRecipes} />}
        </AdminSectionCard>
        <AdminSectionCard title="Most Planned Recipes" description="Recipes added to meal plans most often — live from the database.">
          {mostPlanned.length === 0
            ? <p className="py-8 text-center text-sm text-stone-400">No meal plan data yet.</p>
            : <MetricBarList items={mostPlanned} />}
        </AdminSectionCard>
        <AdminSectionCard title="User Activity" description="Live workflow engagement counts from the database.">
          <MetricBarList items={userActivity} />
        </AdminSectionCard>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Activity, BarChart3, Camera, Search, TrendingUp, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { AdminSectionCard } from '../components/AdminSectionCard';
import { MetricBarList } from '../components/MetricBarList';
import { popularRecipes, searchTerms, userActivity } from '../data/adminMockData';
import api from '@/services/api';

interface ReportCard {
  label: string;
  value: string;
  detail: string;
  icon: React.ElementType;
  live?: boolean;
}

export default function Reports() {
  const [cards, setCards] = useState<ReportCard[]>([
    { label: 'Recipe engagement', value: '42.8k', detail: 'mock monthly views', icon: BarChart3 },
    { label: 'AI usage', value: '8.1k', detail: 'network-only scan events', icon: Camera },
    { label: 'Search activity', value: '12.4k', detail: 'mock query events', icon: Search },
    { label: 'Guided cooking', value: '66%', detail: 'step mode completion', icon: Activity },
  ]);

  useEffect(() => {
    Promise.allSettled([
      api.get<{ forecasts: { predicted_views: number }[]; insufficient_data?: boolean }>('/api/ml-analytics/trending-forecast'),
      api.get<{ peak_hour: number; peak_day: string; insufficient_data?: boolean }>('/api/ml-analytics/traffic-forecast'),
    ]).then(([trendResult, trafficResult]) => {
      setCards((prev) => {
        const next = [...prev];

        if (trendResult.status === 'fulfilled' && !trendResult.value.insufficient_data) {
          const totalPredicted = trendResult.value.forecasts.reduce((s, f) => s + (f.predicted_views ?? 0), 0);
          next[0] = {
            label: 'Predicted recipe views',
            value: totalPredicted > 0 ? `${totalPredicted.toLocaleString()}` : next[0].value,
            detail: 'ML forecast — next 7 days',
            icon: TrendingUp,
            live: true,
          };
        }

        if (trafficResult.status === 'fulfilled' && !trafficResult.value.insufficient_data) {
          const { peak_hour, peak_day } = trafficResult.value;
          next[3] = {
            label: 'Peak traffic',
            value: `${peak_day} ${peak_hour}:00`,
            detail: 'ML traffic forecast — busiest slot',
            icon: Zap,
            live: true,
          };
        }

        return next;
      });
    });
  }, []);

  return (
    <div>
      <AdminPageHeader
        title="Reports"
        description="Review popular recipes, searched terms, AI usage, user activity, and engagement. Live cards are powered by the ML service."
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
        <AdminSectionCard title="Popular Recipes" description="Most viewed recipe content.">
          <MetricBarList items={popularRecipes} />
        </AdminSectionCard>
        <AdminSectionCard title="Most Searched Terms" description="Common user search intent.">
          <MetricBarList items={searchTerms} />
        </AdminSectionCard>
        <AdminSectionCard title="User Activity" description="Workflow-level engagement preview.">
          <MetricBarList items={userActivity} />
        </AdminSectionCard>
      </div>
    </div>
  );
}

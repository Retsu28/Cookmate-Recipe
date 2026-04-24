import {
  Activity,
  BookOpen,
  Camera,
  ChefHat,
  Heart,
  Server,
  Smartphone,
  Users,
} from 'lucide-react';
import { AdminPageHeader } from './components/AdminPageHeader';
import { AdminSectionCard } from './components/AdminSectionCard';
import { AdminStatCard } from './components/AdminStatCard';
import { MetricBarList } from './components/MetricBarList';
import { StatusBadge } from './components/StatusBadge';
import {
  overviewStats,
  popularRecipes,
  recentActivity,
  systemStatuses,
  weeklyPlannedMeals,
} from './data/adminMockData';

const statIcons = [BookOpen, Users, Camera, Heart, Smartphone, Server];

export default function AdminOverview() {
  const healthItems = systemStatuses.slice(0, 4);

  return (
    <div>
      <AdminPageHeader
        title="Admin Dashboard"
        description="Monitor CookMate recipes, AI activity, PWA readiness, and content operations without changing the public cooking experience."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {overviewStats.map((stat, index) => (
          <AdminStatCard key={stat.id} {...stat} icon={statIcons[index] ?? Activity} />
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <AdminSectionCard
          title="Weekly Meal Planning"
          description="Monitoring preview for planned meals. The architecture still marks deeper offline and favorites flows as planned."
        >
          <div className="grid grid-cols-7 items-end gap-3 pt-4">
            {weeklyPlannedMeals.map((day) => (
              <div key={day.id} className="flex flex-col items-center gap-2">
                <div className="flex h-44 w-full items-end rounded-2xl bg-stone-100 p-1">
                  <div
                    className="w-full rounded-xl bg-orange-500 shadow-lg shadow-orange-500/20"
                    style={{ height: `${day.value}%` }}
                  />
                </div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-stone-500">{day.label}</span>
              </div>
            ))}
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          title="System Health"
          description="Truthful architecture status for PWA, Gemini, and roadmap features."
        >
          <div className="space-y-3">
            {healthItems.map((item) => (
              <div key={item.id} className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-stone-900">{item.name}</p>
                  <StatusBadge tone={item.tone}>{item.status}</StatusBadge>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">{item.description}</p>
              </div>
            ))}
          </div>
        </AdminSectionCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <AdminSectionCard title="Popular Recipes" description="Visual stats use mock admin data and can be swapped for analytics later.">
          <MetricBarList items={popularRecipes} />
        </AdminSectionCard>

        <AdminSectionCard title="Recent Activity" description="Operational events shown as safe demo records.">
          <div className="space-y-4">
            {recentActivity.map((item) => (
              <div key={item.id} className="flex gap-4 rounded-2xl border border-stone-100 bg-white p-4">
                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                  <ChefHat size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-bold text-stone-900">{item.title}</p>
                    <StatusBadge tone={item.tone}>{item.time}</StatusBadge>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-stone-500">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </AdminSectionCard>
      </div>
    </div>
  );
}

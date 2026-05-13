import { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  CalendarDays,
  Camera,
  ChefHat,
  Loader2,
  MessageSquare,
  Package,
  Users,
} from 'lucide-react';
import { AdminPageHeader } from './components/AdminPageHeader';
import { AdminSectionCard } from './components/AdminSectionCard';
import { AdminStatCard } from './components/AdminStatCard';
import { MetricBarList } from './components/MetricBarList';
import { StatusBadge } from './components/StatusBadge';
import api from '@/services/api';

interface StatsData {
  total: number;
  published: number;
  featured: number;
  categories: { category: string; count: string }[];
  difficulties: { difficulty: string; count: string }[];
  recentRecipes: { id: number; title: string; category: string | null; difficulty: string | null; created_at: string }[];
  topTags: { tag: string; count: string }[];
}

interface WidgetData {
  weeklyChart: { id: string; label: string; value: number; rawValue: number }[];
  health: {
    userCount: number;
    recipeCount: number;
    ingredientCount: number;
    mealPlanCount: number;
    aiScanCount: number;
    reviewCount: number;
  };
  userStats: { totalUsers: number; newThisWeek: number };
  reviewsToday: number;
}

const statIcons = [BookOpen, Users, Package, CalendarDays, Camera, MessageSquare];

export default function AdminOverview() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [widgets, setWidgets] = useState<WidgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<StatsData>('/api/recipes/stats').catch(() => null),
      api.get<WidgetData>('/api/admin/overview-widgets').catch(() => null),
    ]).then(([s, w]) => {
      if (s === null && w === null) {
        setError(true);
      } else {
        setStats(s);
        setWidgets(w);
      }
    }).finally(() => setLoading(false));
  }, []);

  const h = widgets?.health;

  const overviewStats = stats && h ? [
    { id: 'recipes',     label: 'Total recipes',    value: String(stats.total),               change: `${stats.published} published`,                           description: 'Philippine food recipes from PostgreSQL',          tone: 'success' as const },
    { id: 'users',       label: 'Total users',       value: String(h.userCount),               change: `+${widgets!.userStats.newThisWeek} this week`,            description: 'Registered CookMate accounts',                     tone: 'info'    as const },
    { id: 'ingredients', label: 'Ingredients',       value: String(h.ingredientCount),         change: 'In ingredients table',                                    description: 'Unique ingredients tracked in the database',       tone: 'neutral' as const },
    { id: 'meal_plans',  label: 'Meal plans',        value: String(h.mealPlanCount),           change: 'All-time',                                                description: 'Total meal plans created by all users',            tone: 'success' as const },
    { id: 'ai_scans',    label: 'AI camera saves',   value: String(h.aiScanCount),             change: 'All-time saves',                                          description: 'Total camera scan saves across all users',         tone: 'info'    as const },
    { id: 'reviews',     label: 'Reviews',           value: String(h.reviewCount),             change: `${widgets!.reviewsToday} today`,                          description: 'User ratings and comments on recipes',             tone: h.reviewCount > 0 ? 'success' as const : 'neutral' as const },
  ] : [];

  const popularRecipes = stats ? stats.categories.slice(0, 6).map(c => ({
    id: c.category,
    label: c.category,
    value: Math.round((parseInt(c.count) / stats.total) * 100),
    detail: `${c.count} recipes`,
  })) : [];

  const recentRecipeItems = stats ? stats.recentRecipes.map(r => ({
    id: r.id,
    title: r.title,
    description: `${r.category || 'Uncategorized'} · ${r.difficulty || 'Unknown'}`,
    time: new Date(r.created_at).toLocaleDateString(),
    tone: 'success' as const,
  })) : [];

  const weeklyChart = widgets?.weeklyChart ?? [];

  const healthRows = h ? [
    { id: 'db',          name: 'PostgreSQL',         status: 'Connected',      description: `${h.recipeCount} recipes · ${h.userCount} users · ${h.ingredientCount} ingredients`,                  tone: 'success' as const },
    { id: 'meal_plans',  name: 'Meal Planner',       status: `${h.mealPlanCount} plans`, description: `${h.mealPlanCount} total meal plans created`,                                               tone: h.mealPlanCount > 0 ? 'success' as const : 'neutral' as const },
    { id: 'ai',          name: 'AI Camera saves',    status: `${h.aiScanCount} saves`,   description: `${h.aiScanCount} scans saved across all users`,                                              tone: h.aiScanCount > 0 ? 'success' as const : 'neutral' as const },
    { id: 'reviews',     name: 'Reviews',            status: `${h.reviewCount} total`,   description: `${h.reviewCount} reviews · ${widgets?.reviewsToday ?? 0} submitted today`,                  tone: 'info'    as const },
  ] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin text-orange-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <AdminPageHeader
          title="Admin Dashboard"
          description="Monitor CookMate recipes, users, and content operations."
        />
        <div className="flex flex-col items-center gap-4 rounded-[2rem] border border-red-200 bg-red-50 p-10 text-center">
          <AlertTriangle size={36} className="text-red-500" />
          <p className="text-lg font-extrabold text-stone-900">Failed to load dashboard data</p>
          <p className="text-sm text-stone-500">The API server may be down or unreachable. Check that the Express server is running on port 5000 and try refreshing.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 rounded-full border border-red-200 bg-white px-5 py-2 text-sm font-bold text-red-600 shadow-sm transition hover:bg-red-50"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="Admin Dashboard"
        description="Monitor CookMate recipes, users, and content operations. All data is live from the PostgreSQL database."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {overviewStats.map((stat, index) => (
          <AdminStatCard key={stat.id} {...stat} icon={statIcons[index] ?? Activity} index={index} />
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <AdminSectionCard
          title="Weekly Meal Planning"
          description="Meals planned per day over the last 7 days — live from the database."
        >
          {weeklyChart.length === 0 ? (
            <p className="py-8 text-center text-sm text-stone-400">No meal plans in the last 7 days.</p>
          ) : (
            <div className="grid grid-cols-7 items-end gap-3 pt-4">
              {weeklyChart.map((day) => (
                <div key={day.id} className="flex flex-col items-center gap-2">
                  <span className="text-[10px] font-bold text-stone-400">{day.rawValue > 0 ? day.rawValue : ''}</span>
                  <div className="flex h-44 w-full items-end rounded-2xl bg-stone-100 p-1">
                    <div
                      className="w-full rounded-xl bg-orange-500 shadow-lg shadow-orange-500/20 transition-all duration-500"
                      style={{ height: `${day.value}%` }}
                    />
                  </div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-stone-500">{day.label}</span>
                </div>
              ))}
            </div>
          )}
        </AdminSectionCard>

        <AdminSectionCard
          title="System Health"
          description="Live counts from PostgreSQL — all data is real-time."
        >
          <div className="space-y-3">
            {healthRows.map((item) => (
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
        <AdminSectionCard title="Recipe Categories" description="Category distribution from the PostgreSQL recipe database.">
          <MetricBarList items={popularRecipes} />
        </AdminSectionCard>

        <AdminSectionCard title="Recently Added Recipes" description="Latest recipes added to the database.">
          <div className="space-y-4">
            {recentRecipeItems.length === 0 && (
              <p className="py-8 text-center text-sm text-stone-400">No recipes yet. Run the CSV import to populate.</p>
            )}
            {recentRecipeItems.map((item) => (
              <div key={item.id} className="flex gap-4 rounded-2xl border border-stone-100 bg-white p-4">
                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-orange-200/60 bg-gradient-to-tr from-orange-100 to-amber-50 text-orange-600 shadow-sm">
                  <ChefHat size={18} strokeWidth={2.5} />
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

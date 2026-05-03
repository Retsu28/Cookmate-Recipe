import { useState, useEffect } from 'react';
import {
  Activity,
  BookOpen,
  Camera,
  ChefHat,
  Heart,
  Loader2,
  Server,
  Smartphone,
  Star,
  Users,
} from 'lucide-react';
import { AdminPageHeader } from './components/AdminPageHeader';
import { AdminSectionCard } from './components/AdminSectionCard';
import { AdminStatCard } from './components/AdminStatCard';
import { MetricBarList } from './components/MetricBarList';
import { StatusBadge } from './components/StatusBadge';
import {
  systemStatuses,
  weeklyPlannedMeals,
} from './data/adminMockData';
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

const statIcons = [BookOpen, Star, ChefHat, Heart, Smartphone, Server];

export default function AdminOverview() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<StatsData>('/api/recipes/stats')
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const healthItems = systemStatuses.slice(0, 4);

  const overviewStats = stats ? [
    { id: 'recipes', label: 'Total recipes', value: String(stats.total), change: `${stats.published} published`, description: 'Philippine food recipes from PostgreSQL database', tone: 'success' as const },
    { id: 'featured', label: 'Featured recipes', value: String(stats.featured), change: 'Curated selections', description: 'Recipes highlighted on homepage and mobile', tone: 'success' as const },
    { id: 'categories', label: 'Categories', value: String(stats.categories.length), change: stats.categories.slice(0, 2).map(c => c.category).join(', '), description: 'Unique recipe categories from database', tone: 'info' as const },
    { id: 'difficulties', label: 'Difficulty levels', value: String(stats.difficulties.length), change: stats.difficulties.map(d => `${d.difficulty}: ${d.count}`).join(', '), description: 'Distribution across Easy, Medium, Hard', tone: 'neutral' as const },
    { id: 'tags', label: 'Top tags', value: String(stats.topTags.length), change: stats.topTags.slice(0, 3).map(t => t.tag).join(', '), description: 'Most common recipe tags', tone: 'info' as const },
    { id: 'db', label: 'Database', value: 'Connected', change: 'PostgreSQL', description: 'Recipe data is stored in and served from PostgreSQL', tone: 'success' as const },
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="Admin Dashboard"
        description="Monitor CookMate recipes, categories, and content operations. All data below is live from the PostgreSQL database."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {overviewStats.map((stat, index) => (
          <AdminStatCard key={stat.id} {...stat} icon={statIcons[index] ?? Activity} index={index} />
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
          description="Architecture status for PWA, Gemini, and roadmap features."
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

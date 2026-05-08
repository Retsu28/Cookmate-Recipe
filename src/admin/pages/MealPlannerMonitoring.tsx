import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock, Loader2, ShoppingCart, Utensils, Users } from 'lucide-react';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { AdminSectionCard } from '../components/AdminSectionCard';
import { AdminStatCard } from '../components/AdminStatCard';
import { MetricBarList } from '../components/MetricBarList';
import { StatusBadge } from '../components/StatusBadge';
import mealPlannerService, { type AdminMealPlannerMonitoring } from '@/services/mealPlannerService';

function formatDate(value: string | null | undefined) {
  if (!value) return 'No activity yet';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function MealPlannerMonitoring() {
  const [data, setData] = useState<AdminMealPlannerMonitoring | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    mealPlannerService
      .getAdminMonitoring()
      .then((response) => {
        if (!cancelled) {
          setData(response);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load monitoring data.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const statCards = useMemo(() => {
    if (!data) return [];
    return [
      {
        label: 'Total meal plans',
        value: String(data.stats.totalMealPlans),
        change: 'Live',
        description: 'Meals scheduled by all CookMate users',
        tone: 'success' as const,
        icon: CalendarDays,
      },
      {
        label: 'Grocery generations',
        value: String(data.stats.totalGroceryGenerations),
        change: 'Generated',
        description: 'Times users requested aggregated grocery lists',
        tone: 'info' as const,
        icon: ShoppingCart,
      },
      {
        label: 'Planner users',
        value: String(data.stats.activePlannerUsers),
        change: 'Active',
        description: 'Users with planner or grocery activity',
        tone: 'neutral' as const,
        icon: Users,
      },
      {
        label: 'Top meal type',
        value: data.stats.mostPlannedMealType,
        change: 'Most used',
        description: 'Meal slot with the most plans created',
        tone: 'success' as const,
        icon: Utensils,
      },
    ];
  }, [data]);

  return (
    <div>
      <AdminPageHeader
        title="Meal Planner Monitoring"
        description="Monitor recipe planning, grocery generation, and user planner activity from the live meal planner flow."
        actions={<StatusBadge tone={error ? 'warning' : 'success'}>{error ? 'Needs attention' : 'Live Data'}</StatusBadge>}
      />

      {loading ? (
        <div className="flex items-center justify-center py-24 text-orange-500">
          <Loader2 size={32} className="animate-spin" />
        </div>
      ) : error ? (
        <AdminSectionCard title="Meal Planner Data" description="The monitoring endpoint did not return data.">
          <p className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            {error}
          </p>
        </AdminSectionCard>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((stat, index) => (
              <AdminStatCard key={stat.label} {...stat} index={index} />
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <AdminSectionCard title="Most Planned Recipes" description="Recipes users add to their planners most often.">
              {data.mostPlannedRecipes.length === 0 ? (
                <p className="py-8 text-center text-sm text-stone-400">No planned recipes yet.</p>
              ) : (
                <MetricBarList
                  items={data.mostPlannedRecipes.map((item) => ({
                    id: String(item.id),
                    label: item.label,
                    value: Number(item.value),
                    detail: item.detail,
                  }))}
                />
              )}
            </AdminSectionCard>

            <AdminSectionCard title="Meal Type Breakdown" description="Distribution across breakfast, lunch, and dinner.">
              {data.mealTypeBreakdown.length === 0 ? (
                <p className="py-8 text-center text-sm text-stone-400">No meal type activity yet.</p>
              ) : (
                <MetricBarList
                  items={data.mealTypeBreakdown.map((item) => ({
                    id: item.meal_type,
                    label: item.label,
                    value: item.count,
                    detail: `${item.count} plans`,
                  }))}
                />
              )}
            </AdminSectionCard>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <AdminSectionCard title="Recent Planner Activity" description="Latest recipes users scheduled into their meal planners.">
              <div className="space-y-4">
                {data.recentActivity.length === 0 ? (
                  <p className="py-8 text-center text-sm text-stone-400">No recent planner activity.</p>
                ) : (
                  data.recentActivity.map((item) => (
                    <div key={item.id} className="flex gap-4 rounded-2xl border border-stone-100 bg-white p-4">
                      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                        <Clock size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="font-bold text-stone-900">{item.recipe.title}</p>
                          <StatusBadge tone="success">{item.meal_type_label}</StatusBadge>
                        </div>
                        <p className="mt-1 text-sm text-stone-500">
                          {item.user.name} planned this for {item.planned_date} - {formatDate(item.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </AdminSectionCard>

            <AdminSectionCard title="User Planner Activity" description="Users with the most planner and grocery activity.">
              <div className="space-y-3">
                {data.userPlannerActivity.length === 0 ? (
                  <p className="py-8 text-center text-sm text-stone-400">No active planner users yet.</p>
                ) : (
                  data.userPlannerActivity.map((user) => (
                    <div key={user.id} className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-extrabold text-stone-900">{user.name}</p>
                          <p className="truncate text-xs font-medium text-stone-400">{user.email}</p>
                        </div>
                        <StatusBadge tone="info">{user.plan_count} plans</StatusBadge>
                      </div>
                      <p className="mt-3 text-sm text-stone-500">
                        {user.grocery_generations} grocery generations - Last planned {formatDate(user.last_planned_at)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </AdminSectionCard>
          </div>
        </>
      ) : null}
    </div>
  );
}

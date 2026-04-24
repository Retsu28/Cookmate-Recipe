import { CalendarDays, Clock, Utensils } from 'lucide-react';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { AdminSectionCard } from '../components/AdminSectionCard';
import { MetricBarList } from '../components/MetricBarList';
import { StatusBadge } from '../components/StatusBadge';
import { popularRecipes, weeklyPlannedMeals } from '../data/adminMockData';

const engagementCards = [
  { label: 'Weekly planned meals', value: '514', detail: 'Mock monitoring count', icon: CalendarDays },
  { label: 'Most planned slot', value: 'Dinner', detail: 'Highest engagement', icon: Utensils },
  { label: 'Reminder coverage', value: 'Ready', detail: 'UI only, no push backend', icon: Clock },
];

export default function MealPlannerMonitoring() {
  return (
    <div>
      <AdminPageHeader
        title="Meal Planner Monitoring"
        description="Monitor meal planning behavior while keeping the feature status honest: deeper planner automation and offline support remain planned."
        actions={<StatusBadge tone="warning">Planned / Monitoring Ready</StatusBadge>}
      />

      <div className="grid gap-4 md:grid-cols-3">
        {engagementCards.map((card) => (
          <div key={card.label} className="rounded-[2rem] border border-stone-100 bg-white p-5 shadow-lg shadow-stone-200/40">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
              <card.icon size={22} />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-400">{card.label}</p>
            <p className="mt-2 text-3xl font-extrabold text-stone-900">{card.value}</p>
            <p className="mt-2 text-sm text-stone-500">{card.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <AdminSectionCard title="Weekly Planned Meals" description="Visual demo of planned meals across the current week.">
          <div className="grid grid-cols-7 items-end gap-3">
            {weeklyPlannedMeals.map((day) => (
              <div key={day.id} className="text-center">
                <div className="flex h-40 items-end rounded-2xl bg-stone-100 p-1">
                  <div className="w-full rounded-xl bg-orange-500" style={{ height: `${day.value}%` }} />
                </div>
                <p className="mt-2 text-xs font-extrabold uppercase tracking-wider text-stone-500">{day.label}</p>
              </div>
            ))}
          </div>
        </AdminSectionCard>

        <AdminSectionCard title="Most Planned Recipes" description="Mock ranking for future meal planner analytics.">
          <MetricBarList items={popularRecipes} />
        </AdminSectionCard>
      </div>
    </div>
  );
}

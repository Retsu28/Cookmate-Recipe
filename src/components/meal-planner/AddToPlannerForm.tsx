import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { OFFLINE_MESSAGE } from '@/offline/network';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import {
  getDeviceTimezone,
  mealPlannerService,
  mealTypeLabels,
  type MealPlan,
  type MealType,
} from '@/services/mealPlannerService';
import { type PlannerRecipeSummary } from './AddToPlannerModal';

const mealTypes = Object.entries(mealTypeLabels) as Array<[MealType, string]>;

const defaultTimes: Record<MealType, { start: string; end: string }> = {
  breakfast: { start: '07:00', end: '08:00' },
  lunch: { start: '11:00', end: '14:00' },
  dinner: { start: '18:00', end: '20:00' },
};

function todayInputValue() {
  return format(new Date(), 'yyyy-MM-dd');
}

export function AddToPlannerForm({
  recipe,
  onCancel,
  onPlanned,
}: {
  recipe: PlannerRecipeSummary;
  onCancel: () => void;
  onPlanned?: (plan: MealPlan) => void;
}) {
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const [plannedDate, setPlannedDate] = useState(todayInputValue);
  const [mealType, setMealType] = useState<MealType>('dinner');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [customTimeEnabled, setCustomTimeEnabled] = useState(false);
  const [startTime, setStartTime] = useState(defaultTimes.dinner.start);
  const [endTime, setEndTime] = useState(defaultTimes.dinner.end);
  const [saving, setSaving] = useState(false);

  const canSave = useMemo(
    () => Boolean(recipe?.id && plannedDate && mealType && isOnline && !saving),
    [recipe?.id, plannedDate, mealType, isOnline, saving],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isOnline) {
      toast.error('You are offline', { description: OFFLINE_MESSAGE });
      return;
    }

    if (!recipe.id || !plannedDate || !mealType) {
      toast.error('Choose a date and meal type first.');
      return;
    }

    setSaving(true);
    try {
      const data = await mealPlannerService.createPlan({
        recipe_id: recipe.id,
        planned_date: plannedDate,
        meal_type: mealType,
        reminder_enabled: reminderEnabled,
        custom_time_enabled: customTimeEnabled,
        start_time: startTime,
        end_time: endTime,
        timezone: getDeviceTimezone(),
      });
      toast.success('Added to Meal Planner', {
        description: `${recipe.title} is planned for ${mealTypeLabels[mealType]}.`,
        action: {
          label: 'Open Planner',
          onClick: () => navigate('/planner'),
        },
      });
      onPlanned?.(data.plan);
      onCancel();
    } catch (err) {
      toast.error('Could not save meal plan', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 w-full overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-lg shadow-orange-100/20 animate-fade-up sm:mt-4 dark:border-stone-700 dark:bg-stone-900"
    >
      <div className="space-y-4 p-3 sm:p-4">
        {!isOnline ? (
          <div className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-medium text-orange-800 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200">
            {OFFLINE_MESSAGE}
          </div>
        ) : null}

        <label className="block min-w-0 space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
            Date
          </span>
          <input
            type="date"
            value={plannedDate}
            onChange={(event) => setPlannedDate(event.target.value)}
            className="h-11 w-full min-w-0 rounded-xl border border-orange-100 bg-white px-3 text-sm font-bold text-stone-800 outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            required
          />
        </label>

        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
            Meal Type
          </span>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(6.25rem,1fr))] gap-2">
            {mealTypes.map(([value, label]) => {
              const active = mealType === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setMealType(value);
                    if (!customTimeEnabled) {
                      setStartTime(defaultTimes[value].start);
                      setEndTime(defaultTimes[value].end);
                    }
                  }}
                  className={cn(
                    'h-11 min-w-0 rounded-xl border px-2 text-[11px] font-extrabold uppercase leading-none tracking-[0.04em] transition-all',
                    active
                      ? 'border-orange-500 bg-orange-500 text-white shadow-md shadow-orange-500/20'
                      : 'border-orange-100 bg-white text-stone-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700',
                  )}
                  aria-pressed={active}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 rounded-xl border border-orange-100 bg-orange-50/50 p-3 dark:border-stone-700 dark:bg-stone-800/50">
          <button
            type="button"
            role="switch"
            aria-checked={reminderEnabled}
            onClick={() => setReminderEnabled((value) => !value)}
            className="flex items-center justify-between gap-3 text-left"
          >
            <span className="text-xs font-extrabold text-stone-700 dark:text-stone-200">Meal reminder</span>
            <span className={cn('flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition-colors', reminderEnabled ? 'bg-orange-500' : 'bg-stone-300 dark:bg-stone-700')}>
              <span className={cn('h-4 w-4 rounded-full bg-white transition-transform', reminderEnabled ? 'translate-x-5' : 'translate-x-0')} />
            </span>
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={customTimeEnabled}
            onClick={() => setCustomTimeEnabled((value) => !value)}
            className="flex items-center justify-between gap-3 text-left"
          >
            <span className="text-xs font-extrabold text-stone-700 dark:text-stone-200">Custom time</span>
            <span className={cn('flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition-colors', customTimeEnabled ? 'bg-orange-500' : 'bg-stone-300 dark:bg-stone-700')}>
              <span className={cn('h-4 w-4 rounded-full bg-white transition-transform', customTimeEnabled ? 'translate-x-5' : 'translate-x-0')} />
            </span>
          </button>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(7.25rem,1fr))] gap-2">
            <label className="block min-w-0 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
                Start
              </span>
              <input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                disabled={!customTimeEnabled}
                className="h-11 w-full min-w-0 rounded-xl border border-orange-100 bg-white px-3 text-sm font-bold text-stone-800 outline-none disabled:opacity-60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
              />
            </label>
            <label className="block min-w-0 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
                End
              </span>
              <input
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                disabled={!customTimeEnabled}
                className="h-11 w-full min-w-0 rounded-xl border border-orange-100 bg-white px-3 text-sm font-bold text-stone-800 outline-none disabled:opacity-60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-orange-100 bg-orange-50/50 p-3 sm:flex sm:justify-end sm:p-4 dark:border-stone-700 dark:bg-stone-900/60">
        <Button
          type="button"
          variant="outline"
          className="h-10 min-w-0 rounded-full px-3 text-xs font-bold sm:px-4"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!canSave}
          className="h-10 min-w-0 rounded-full px-3 text-xs font-bold sm:px-4"
        >
          {saving ? (
            <>
              <Loader2 size={14} className="mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Plan'
          )}
        </Button>
      </div>
    </form>
  );
}

export default AddToPlannerForm;

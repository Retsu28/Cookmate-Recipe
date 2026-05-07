import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { OFFLINE_MESSAGE } from '@/offline/network';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import {
  mealPlannerService,
  mealTypeLabels,
  type MealPlan,
  type MealType,
} from '@/services/mealPlannerService';

export interface PlannerRecipeSummary {
  id: number;
  title: string;
  image_url?: string | null;
  category?: string | null;
}

interface AddToPlannerModalProps {
  recipe: PlannerRecipeSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlanned?: (plan: MealPlan) => void;
}

const mealTypes = Object.entries(mealTypeLabels) as Array<[MealType, string]>;

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function AddToPlannerModal({
  recipe,
  open,
  onOpenChange,
  onPlanned,
}: AddToPlannerModalProps) {
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const [plannedDate, setPlannedDate] = useState(todayInputValue);
  const [mealType, setMealType] = useState<MealType>('dinner');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setPlannedDate(todayInputValue());
      setMealType('dinner');
      setSaving(false);
    }
  }, [open, recipe?.id]);

  const canSave = useMemo(
    () => Boolean(recipe?.id && plannedDate && mealType && isOnline && !saving),
    [recipe?.id, plannedDate, mealType, isOnline, saving],
  );

  if (!open || !recipe) return null;

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
      });
      toast.success('Added to Meal Planner', {
        description: `${recipe.title} is planned for ${mealTypeLabels[mealType]}.`,
        action: {
          label: 'Open Planner',
          onClick: () => navigate('/planner'),
        },
      });
      onPlanned?.(data.plan);
      onOpenChange(false);
    } catch (err) {
      toast.error('Could not save meal plan', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-stone-950/45 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-to-planner-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onOpenChange(false);
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-2xl shadow-stone-950/20 dark:border-stone-700 dark:bg-stone-900"
      >
        <div className="flex items-start justify-between gap-4 border-b border-orange-100 p-5 dark:border-stone-700">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300">
              <CalendarDays size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">
                Add to Meal Planner
              </p>
              <h2 id="add-to-planner-title" className="mt-1 text-xl font-extrabold text-stone-900 dark:text-stone-100">
                {recipe.title}
              </h2>
              {recipe.category ? (
                <p className="mt-1 text-sm font-medium text-stone-500 dark:text-stone-400">{recipe.category}</p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="rounded-full p-2 text-stone-400 transition-colors hover:bg-orange-50 hover:text-orange-600 disabled:opacity-50 dark:hover:bg-stone-800 dark:hover:text-orange-300"
            aria-label="Close meal planner dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {!isOnline ? (
            <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-800 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200">
              {OFFLINE_MESSAGE}
            </div>
          ) : null}

          <label className="block space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
              Date
            </span>
            <input
              type="date"
              value={plannedDate}
              onChange={(event) => setPlannedDate(event.target.value)}
              className="h-12 w-full rounded-2xl border border-orange-100 bg-white px-4 text-sm font-bold text-stone-800 outline-none transition-colors focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              required
            />
          </label>

          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
              Meal Type
            </span>
            <div className="grid grid-cols-3 gap-2">
              {mealTypes.map(([value, label]) => {
                const active = mealType === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMealType(value)}
                    className={cn(
                      'h-12 rounded-2xl border text-xs font-extrabold uppercase tracking-widest transition-all',
                      active
                        ? 'border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-500/20'
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
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-orange-100 bg-orange-50/50 p-5 sm:flex-row sm:justify-end dark:border-stone-700 dark:bg-stone-900/60">
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-full px-5 font-bold"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!canSave}
            className="h-11 rounded-full px-5 font-bold"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              'Save Plan'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default AddToPlannerModal;

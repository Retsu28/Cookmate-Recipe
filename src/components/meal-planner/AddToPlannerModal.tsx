import React from 'react';
import { CalendarDays, X } from 'lucide-react';
import { type MealPlan } from '@/services/mealPlannerService';
import { AddToPlannerForm } from './AddToPlannerForm';

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

export function AddToPlannerModal({
  recipe,
  open,
  onOpenChange,
  onPlanned,
}: AddToPlannerModalProps) {
  if (!open || !recipe) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-stone-950/45 p-3 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-to-planner-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-2xl shadow-stone-950/20 dark:border-stone-700 dark:bg-stone-900">
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
            className="rounded-full p-2 text-stone-400 transition-colors hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-stone-800 dark:hover:text-orange-300"
            aria-label="Close meal planner dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <AddToPlannerForm
            recipe={recipe}
            onCancel={() => onOpenChange(false)}
            onPlanned={(plan) => {
              onPlanned?.(plan);
              onOpenChange(false);
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default AddToPlannerModal;

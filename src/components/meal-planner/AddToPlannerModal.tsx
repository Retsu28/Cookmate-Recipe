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
  scrollTracked?: boolean;
}

export function AddToPlannerModal({
  recipe,
  open,
  onOpenChange,
  onPlanned,
  scrollTracked = false,
}: AddToPlannerModalProps) {
  if (!open || !recipe) return null;

  return (
    <div
      className={scrollTracked
        ? 'absolute inset-0 z-[90] flex items-start justify-center bg-stone-950/70 backdrop-blur-sm px-4 py-8'
        : 'fixed inset-x-0 bottom-0 top-0 z-[90] flex items-end justify-center bg-stone-950/70 backdrop-blur-sm px-4 md:left-64 md:top-20 md:items-center'
      }
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-to-planner-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
    >
      <div className={`w-full max-w-sm overflow-hidden rounded-t-[2rem] bg-stone-900 shadow-2xl shadow-stone-950/60 md:rounded-[2rem]${scrollTracked ? ' sticky top-8' : ''}`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500/20 text-orange-400">
              <CalendarDays size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-400">
                Add to Meal Planner
              </p>
              <h2 id="add-to-planner-title" className="mt-0.5 text-lg font-extrabold leading-tight text-white">
                {recipe.title}
              </h2>
              {recipe.category ? (
                <p className="mt-0.5 text-sm font-medium text-stone-400">{recipe.category}</p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full p-1.5 text-stone-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close meal planner dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pb-2 pt-4">
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

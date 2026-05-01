import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, ChefHat, Star } from 'lucide-react';
import type { HomeRecipe } from './types';

interface HomeRecipeCardProps {
  recipe: HomeRecipe;
  width?: 'sm' | 'md' | 'lg';
}

const widthMap = {
  sm: 'w-44 sm:w-48',
  md: 'w-56 sm:w-64',
  lg: 'w-64 sm:w-72',
};

export function HomeRecipeCard({ recipe, width = 'md' }: HomeRecipeCardProps) {
  const computedTime =
    recipe.total_time_minutes ??
    ((recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0));
  const time = computedTime > 0 ? computedTime : null;

  const meta = recipe.category || recipe.region_or_origin || 'Filipino';

  return (
    <Link
      to={`/recipe/${recipe.id}`}
      className={`group flex shrink-0 flex-col gap-3 ${widthMap[width]}`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-orange-100 bg-orange-50 shadow-sm shadow-orange-100/50 transition-all group-hover:-translate-y-1 group-hover:border-orange-300 group-hover:shadow-lg group-hover:shadow-orange-100 dark:border-stone-700 dark:bg-stone-800 dark:shadow-none dark:group-hover:border-orange-500/50">
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={recipe.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-orange-300">
            <ChefHat size={36} />
          </div>
        )}
        {time ? (
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-orange-700 shadow-sm backdrop-blur dark:bg-stone-800 dark:text-orange-400">
            <Clock size={11} />
            <span>{time} min</span>
          </div>
        ) : null}
        {recipe.is_featured ? (
          <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-orange-500/95 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white shadow-sm">
            <Star size={10} fill="currentColor" />
            Featured
          </div>
        ) : null}
      </div>
      <div className="px-1">
        <h4 className="line-clamp-2 text-sm font-bold leading-snug text-stone-900 transition-colors group-hover:text-orange-600 dark:text-stone-100 dark:group-hover:text-orange-400">
          {recipe.title}
        </h4>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
          {meta}
        </p>
      </div>
    </Link>
  );
}

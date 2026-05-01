import React from 'react';
import { Link } from 'react-router-dom';
import {
  ChefHat,
  Soup,
  Cookie,
  CakeSlice,
  Salad,
  CupSoda,
  Drumstick,
  UtensilsCrossed,
  Beef,
  Fish,
  Wheat,
  Sandwich,
} from 'lucide-react';

interface CategoryChipProps {
  category: string;
  count?: number;
  imageUrl?: string | null;
}

// Map common categories to a Lucide icon. Falls back to a chef hat for any
// category we haven't explicitly accounted for.
const CATEGORY_ICONS: { [keyword: string]: React.ComponentType<{ size?: number; className?: string }> } = {
  soup: Soup,
  noodle: Wheat,
  noodles: Wheat,
  pasta: Wheat,
  rice: Wheat,
  appetizer: Sandwich,
  appetizers: Sandwich,
  snack: Cookie,
  snacks: Cookie,
  dessert: CakeSlice,
  desserts: CakeSlice,
  drink: CupSoda,
  drinks: CupSoda,
  beverage: CupSoda,
  vegetable: Salad,
  vegetables: Salad,
  salad: Salad,
  salads: Salad,
  beef: Beef,
  pork: Beef,
  chicken: Drumstick,
  poultry: Drumstick,
  seafood: Fish,
  fish: Fish,
  main: UtensilsCrossed,
  'main dish': UtensilsCrossed,
  'main dishes': UtensilsCrossed,
};

function pickIcon(category: string) {
  const key = category.trim().toLowerCase();
  if (CATEGORY_ICONS[key]) return CATEGORY_ICONS[key];
  for (const k of Object.keys(CATEGORY_ICONS)) {
    if (key.includes(k)) return CATEGORY_ICONS[k];
  }
  return ChefHat;
}

export function CategoryChip({ category, count, imageUrl }: CategoryChipProps) {
  const Icon = pickIcon(category);

  return (
    <Link
      to={`/search?category=${encodeURIComponent(category)}`}
      className="group flex shrink-0 items-center gap-3 rounded-2xl border border-orange-100 bg-white px-4 py-3 shadow-sm shadow-orange-100/50 transition-all hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 hover:shadow-lg hover:shadow-orange-100 dark:border-stone-700 dark:bg-stone-800 dark:shadow-none dark:hover:border-orange-500/50 dark:hover:bg-stone-700"
      aria-label={`Browse ${category} recipes`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 transition-colors group-hover:bg-orange-500 group-hover:text-white dark:bg-orange-500/10 dark:text-orange-400 dark:group-hover:bg-orange-500 dark:group-hover:text-white">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full rounded-xl object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <Icon size={18} />
        )}
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-bold text-stone-900 group-hover:text-orange-700 dark:text-stone-100 dark:group-hover:text-orange-400">
          {category}
        </span>
        {typeof count === 'number' ? (
          <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
            {count} {count === 1 ? 'recipe' : 'recipes'}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

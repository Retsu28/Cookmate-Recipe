import React from 'react';
import { Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const quickMeals = [
  { id: 101, title: 'Garlic Butter Steak Bites', time: '15 min', image: 'https://picsum.photos/seed/steak/400/300' },
  { id: 102, title: 'Creamy Tomato Pasta', time: '20 min', image: 'https://picsum.photos/seed/pasta/400/300' },
  { id: 103, title: 'Shrimp Tacos with Slaw', time: '25 min', image: 'https://picsum.photos/seed/taco/400/300' },
  { id: 104, title: 'Mushroom Risotto', time: '30 min', image: 'https://picsum.photos/seed/risotto/400/300' },
];

export function RecentRecipes() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {quickMeals.map((recipe) => (
        <Link to={`/recipe/${recipe.id}`} key={recipe.id} className="group flex flex-col gap-3">
          <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden relative shadow-sm">
            <img
              src={recipe.image}
              alt={recipe.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
            <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm text-stone-900 font-medium text-xs">
              <Clock className="w-3.5 h-3.5 text-orange-500" />
              {recipe.time}
            </div>
          </div>
          <div className="flex items-start justify-between gap-2 px-1">
            <h4 className="font-bold text-stone-900 leading-snug group-hover:text-orange-600 transition-colors">{recipe.title}</h4>
            <div className="p-1 bg-stone-100 rounded-full text-stone-400 group-hover:bg-orange-100 group-hover:text-orange-500 transition-colors shrink-0">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

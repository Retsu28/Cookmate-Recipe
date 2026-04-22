import React from 'react';
import { Play, Clock } from 'lucide-react';

const recent = [
  { id: 1, title: 'Beef Stir Fry', date: '2 days ago', image: 'https://picsum.photos/seed/beef/100/100' },
  { id: 2, title: 'Greek Salad', date: 'Yesterday', image: 'https://picsum.photos/seed/salad/100/100' },
  { id: 3, title: 'Pancakes', date: 'Today', image: 'https://picsum.photos/seed/pancake/100/100' },
];

export function RecentRecipes() {
  return (
    <div className="space-y-4">
      {recent.map((recipe) => (
        <div key={recipe.id} className="flex items-center gap-4 p-3 bg-white rounded-2xl border border-stone-100 hover:border-orange-200 transition-all cursor-pointer group">
          <div className="w-16 h-16 rounded-xl overflow-hidden relative">
            <img 
              src={recipe.image} 
              alt={recipe.title} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Play size={20} className="text-white fill-white" />
            </div>
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-stone-900">{recipe.title}</h4>
            <p className="text-xs text-stone-400 font-medium">{recipe.date}</p>
          </div>
          <button className="p-2 text-stone-400 hover:text-orange-600">
            <Clock size={18} />
          </button>
        </div>
      ))}
    </div>
  );
}

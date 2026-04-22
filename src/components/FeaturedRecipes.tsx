import React from 'react';
import { Clock, Star, Bookmark } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const featured = [
  {
    id: 1,
    title: 'Creamy Tuscan Chicken',
    time: '35 min',
    difficulty: 'Medium',
    rating: 4.8,
    image: 'https://picsum.photos/seed/tuscan/600/400',
    category: 'Italian'
  },
  {
    id: 2,
    title: 'Spicy Miso Ramen',
    time: '45 min',
    difficulty: 'Hard',
    rating: 4.9,
    image: 'https://picsum.photos/seed/ramen/600/400',
    category: 'Japanese'
  },
  {
    id: 3,
    title: 'Honey Garlic Salmon',
    time: '20 min',
    difficulty: 'Easy',
    rating: 4.7,
    image: 'https://picsum.photos/seed/salmon/600/400',
    category: 'Seafood'
  }
];

export function FeaturedRecipes() {
  return (
    <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
      {featured.map((recipe) => (
        <div 
          key={recipe.id} 
          className="min-w-[320px] bg-white rounded-3xl overflow-hidden border border-stone-100 shadow-sm hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="relative h-48">
            <img 
              src={recipe.image} 
              alt={recipe.title} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
            <div className="absolute top-4 left-4">
              <Badge className="bg-white/90 text-stone-900 backdrop-blur-sm border-none font-bold">
                {recipe.category}
              </Badge>
            </div>
            <button className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-sm rounded-full text-stone-400 hover:text-orange-500 transition-colors shadow-sm">
              <Bookmark size={18} />
            </button>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-lg text-stone-900">{recipe.title}</h3>
              <div className="flex items-center gap-1 text-orange-500">
                <Star size={14} fill="currentColor" />
                <span className="text-xs font-bold">{recipe.rating}</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-stone-400">
              <div className="flex items-center gap-1.5">
                <Clock size={14} />
                <span className="text-xs font-medium">{recipe.time}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  recipe.difficulty === 'Easy' ? 'bg-green-400' : 
                  recipe.difficulty === 'Medium' ? 'bg-orange-400' : 'bg-red-400'
                )} />
                <span className="text-xs font-medium">{recipe.difficulty}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

import { cn } from '@/lib/utils';

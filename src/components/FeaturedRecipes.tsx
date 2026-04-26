import React from 'react';
import { Clock, Star, Bookmark } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {featured.map((recipe) => (
        <Link
          to={`/recipe/${recipe.id}`}
          key={recipe.id}
          className="bg-white rounded-[2rem] overflow-hidden border border-stone-100 shadow-sm hover:shadow-xl hover:border-orange-200 hover:-translate-y-1 transition-all duration-300 group cursor-pointer flex flex-col"
        >
          <div className="relative h-56 w-full">
            <img
              src={recipe.image}
              alt={recipe.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
            <div className="absolute top-4 left-4">
              <Badge className="bg-white/95 text-stone-900 backdrop-blur-md border-none font-bold shadow-sm">
                {recipe.category}
              </Badge>
            </div>
            <button
              onClick={(e) => { e.preventDefault(); /* Handle Save */ }}
              className="absolute top-4 right-4 p-2.5 bg-white/95 backdrop-blur-md rounded-full text-stone-400 hover:text-orange-500 transition-colors shadow-sm"
            >
              <Bookmark size={18} />
            </button>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-between">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-xl text-stone-900 group-hover:text-orange-600 transition-colors leading-tight pr-2">{recipe.title}</h3>
                <div className="flex items-center gap-1 text-orange-500 bg-orange-50 px-2 py-1 rounded-lg shrink-0">
                  <Star size={14} fill="currentColor" />
                  <span className="text-xs font-bold">{recipe.rating}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-5 text-stone-500">
              <div className="flex items-center gap-1.5">
                <Clock size={16} className="text-stone-400" />
                <span className="text-sm font-medium">{recipe.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "w-2.5 h-2.5 rounded-full",
                  recipe.difficulty === 'Easy' ? 'bg-orange-300' :
                    recipe.difficulty === 'Medium' ? 'bg-orange-400' : 'bg-orange-500'
                )} />
                <span className="text-sm font-medium">{recipe.difficulty}</span>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

import React from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-orange-100 bg-white/90 px-8 backdrop-blur">
      <div className="flex-1 max-w-2xl relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
        <Input
          className="h-11 rounded-xl border-orange-100 bg-orange-50/50 pl-10 focus:border-orange-300 focus:ring-orange-500"
          placeholder="Search recipes, ingredients, or cuisines..."
        />
      </div>

      <div className="flex items-center gap-4">
        <button className="rounded-xl border border-orange-100 p-2.5 text-stone-500 transition-colors hover:bg-orange-50 hover:text-orange-600">
          <SlidersHorizontal size={20} />
        </button>
        
        <div className="flex items-center gap-3 pl-4 border-l border-stone-200">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-stone-900 leading-none">Jane Doe</p>
            <p className="text-[10px] font-medium text-stone-500 mt-1">Intermediate Cook</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-stone-200 border-2 border-white shadow-sm overflow-hidden">
            <img 
              src="https://picsum.photos/seed/jane/100/100" 
              alt="Avatar" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </div>
    </header>
  );
}

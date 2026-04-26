import React from 'react';
import { ShoppingCart, ChevronRight, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const dailyPlan = [
  { slot: 'Breakfast', recipe: 'Avocado Toast', time: '10 min', color: 'bg-orange-300' },
  { slot: 'Lunch', recipe: 'Quinoa Salad', time: '15 min', color: 'bg-orange-400' },
  { slot: 'Dinner', recipe: 'Grilled Salmon', time: '25 min', color: 'bg-orange-500' },
  { slot: 'Snack', recipe: 'Greek Yogurt', time: '5 min', color: 'bg-orange-600' },
];

const shoppingList = [
  { item: 'Fresh Salmon', amount: '2 fillets' },
  { item: 'Avocado', amount: '2 pcs' },
  { item: 'Quinoa', amount: '500g' },
  { item: 'Greek Yogurt', amount: '1 tub' },
];

export function RightPanel() {
  return (
    <aside className="w-80 bg-white border-l border-stone-200 p-6 overflow-y-auto hidden xl:block">
      <div className="space-y-8">
        {/* Daily Meal Plan */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-stone-900">Daily Meal Plan</h3>
            <button className="text-orange-600 text-xs font-bold flex items-center gap-1">
              View All <ChevronRight size={14} />
            </button>
          </div>
          <div className="space-y-3">
            {dailyPlan.map((item) => (
              <div key={item.slot} className="group cursor-pointer">
                <div className="flex items-center gap-3 p-3 rounded-xl border border-stone-100 hover:border-orange-200 hover:bg-orange-50/30 transition-all">
                  <div className={`w-1 h-8 rounded-full ${item.color}`} />
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{item.slot}</p>
                    <p className="text-sm font-bold text-stone-900">{item.recipe}</p>
                  </div>
                  <div className="flex items-center gap-1 text-stone-400">
                    <Clock size={12} />
                    <span className="text-[10px] font-medium">{item.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Shopping List Preview */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-stone-900">Shopping List</h3>
              <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none">
                {shoppingList.length}
              </Badge>
            </div>
            <button className="p-1.5 bg-stone-50 rounded-lg text-stone-400 hover:text-orange-600 transition-colors">
              <ShoppingCart size={16} />
            </button>
          </div>
          <div className="bg-stone-50 rounded-2xl p-4 space-y-3">
            {shoppingList.map((item) => (
              <div key={item.item} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-stone-300 group-hover:bg-orange-400 transition-colors" />
                  <span className="text-sm font-medium text-stone-700">{item.item}</span>
                </div>
                <span className="text-xs font-bold text-stone-400">{item.amount}</span>
              </div>
            ))}
            <button className="w-full mt-2 py-2.5 text-xs font-bold text-orange-600 border border-dashed border-orange-200 rounded-xl hover:bg-orange-50 transition-all">
              + Add Item
            </button>
          </div>
        </section>

        {/* Quick Tip */}
        <div className="bg-orange-500 rounded-2xl p-5 text-white shadow-lg shadow-orange-200">
          <p className="text-xs font-bold opacity-80 mb-1 uppercase tracking-widest">CHEF'S TIP</p>
          <p className="text-sm font-medium leading-relaxed">
            "Always salt your pasta water until it tastes like the sea for the best flavor."
          </p>
        </div>
      </div>
    </aside>
  );
}

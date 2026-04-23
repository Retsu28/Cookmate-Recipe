import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Search, Calendar as CalendarIcon, ExternalLink, Check, Plus, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

export default function PlannerPage() {
  const [selectedDay, setSelectedDay] = useState(4); // Today (Thursday 4th in mockup)

  const savedRecipes = [
    { title: 'Miso Glazed Salmon', time: '20 Mins', type: 'High Protein', img: 'https://picsum.photos/seed/miso/200/150' },
    { title: 'Quinoa Power Bowl', time: '15 Mins', type: 'Vegan', img: 'https://picsum.photos/seed/quinoabowl/200/150' },
    { title: 'Sheet Pan Tofu', time: '35 Mins', type: 'Low Carb', img: 'https://picsum.photos/seed/tofu/200/150' },
  ];

  const shoppingList = [
    {
      category: 'PRODUCE', items: [
        { name: 'Fresh Spinach', desc: '2 Large bags', checked: false },
        { name: 'Cherry Tomatoes', desc: '500g', checked: false },
        { name: 'Garlic Bulbs', desc: '3 Units', checked: true },
      ]
    },
    {
      category: 'PANTRY', items: [
        { name: 'Olive Oil', desc: '1 Bottle (Refill)', checked: false },
        { name: 'Quinoa', desc: '1kg Bag', checked: false },
      ]
    }
  ];

  return (
    <Layout>
      <div className="w-full h-full py-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 pb-4 border-b border-stone-200 gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">Meal Planner</h1>
            <button className="flex items-center gap-2 bg-stone-100 hover:bg-stone-200 px-4 py-2 rounded-md font-bold text-sm text-stone-700 transition-colors">
              <CalendarIcon size={16} /> October 2023 ▾
            </button>
          </div>
          <Button variant="outline" className="border-stone-300 text-stone-900 font-bold uppercase tracking-widest text-[10px] rounded-none px-6 h-10">
            Export
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start h-[calc(100vh-200px)] overflow-hidden">

          {/* Left Column - Saved Recipes */}
          <div className="lg:col-span-3 h-full flex flex-col overflow-hidden bg-stone-50 border border-stone-200">
            <div className="p-4 border-b border-stone-200 shrink-0">
              <h3 className="text-[10px] font-bold text-stone-900 uppercase tracking-widest mb-4">Saved Recipes</h3>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search my library..."
                  className="w-full bg-white border border-stone-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {savedRecipes.map((recipe, i) => (
                <div key={i} className="bg-white border border-stone-200 p-3 hover:border-orange-400 cursor-pointer transition-colors group">
                  <div className="w-full aspect-[4/3] bg-stone-200 mb-3 overflow-hidden relative">
                    <img src={recipe.img} alt={recipe.title} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                  </div>
                  <h4 className="font-bold text-xs text-stone-900 uppercase tracking-wide mb-2 leading-tight group-hover:text-orange-600 transition-colors">
                    {recipe.title}
                  </h4>
                  <div className="flex items-center justify-between text-[10px] text-stone-500">
                    <span>{recipe.time}</span>
                    <span>{recipe.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Center Column - Calendar */}
          <div className="lg:col-span-6 h-full flex flex-col bg-white border border-stone-200 overflow-hidden">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between shrink-0">
              <div className="flex border border-stone-900">
                <button className="bg-stone-900 text-white px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest">Monthly</button>
                <button className="bg-stone-100 text-stone-500 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest hover:bg-stone-200">Weekly</button>
              </div>
              <div className="flex items-center gap-4">
                <button className="text-stone-400 hover:text-stone-900">‹</button>
                <span className="font-bold text-stone-900 uppercase tracking-widest text-[10px]">Today</span>
                <button className="text-stone-400 hover:text-stone-900">›</button>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-7 grid-rows-[auto_1fr_1fr] bg-stone-100 gap-px border-b border-stone-200 overflow-y-auto">
              {/* Days Header */}
              {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
                <div key={day} className="bg-white p-3 text-center text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                  {day}
                </div>
              ))}

              {/* Calendar Grid - Static Mockup for wireframe */}
              {Array.from({ length: 14 }).map((_, i) => {
                const dayNum = i < 6 ? 25 + i : i - 5;
                const isToday = dayNum === 4;
                const isSelected = selectedDay === dayNum;

                return (
                  <div
                    key={i}
                    onClick={() => setSelectedDay(dayNum)}
                    className={cn(
                      "bg-white p-2 min-h-[120px] transition-colors cursor-pointer",
                      isToday ? "ring-2 ring-inset ring-stone-900 bg-stone-50" : "hover:bg-stone-50",
                      i < 5 ? "opacity-50" : ""
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn(
                        "text-xs font-bold w-6 h-6 flex items-center justify-center",
                        isToday ? "bg-stone-900 text-white rounded-full" : "text-stone-700"
                      )}>
                        {dayNum}
                      </span>
                      {isToday && <span className="bg-stone-900 text-white text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5">Today</span>}
                    </div>

                    {/* Render mock recipe pills */}
                    {dayNum === 1 && <div className="bg-stone-900 text-white text-[10px] px-1.5 py-1 mb-1 truncate">Pesto...</div>}
                    {dayNum === 1 && <div className="bg-stone-200 text-stone-900 text-[10px] px-1.5 py-1 truncate">Greens...</div>}
                    {dayNum === 3 && <div className="bg-stone-600 text-white text-[10px] px-1.5 py-1 truncate">Chicken...</div>}
                    {dayNum === 4 && <div className="bg-stone-900 text-white text-[10px] px-1.5 py-1 mb-2 truncate">Steak...</div>}

                    {/* Drop zone placeholder */}
                    {isToday && (
                      <div className="border border-dashed border-stone-300 text-stone-400 text-[10px] p-2 text-center mt-auto">
                        Drop recipe here
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column - Shopping List */}
          <div className="lg:col-span-3 h-full flex flex-col bg-white border border-stone-200 overflow-hidden relative">
            <div className="p-5 border-b border-stone-200 flex items-center justify-between shrink-0">
              <h3 className="text-[10px] font-bold text-stone-900 uppercase tracking-widest">Shopping List</h3>
              <ExternalLink size={16} className="text-stone-400" />
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {shoppingList.map((section, i) => (
                <div key={i}>
                  <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-4">{section.category}</p>
                  <div className="space-y-4">
                    {section.items.map((item, j) => (
                      <label key={j} className="flex items-start gap-3 cursor-pointer group">
                        <div className={cn(
                          "w-4 h-4 mt-0.5 flex items-center justify-center border transition-colors shrink-0",
                          item.checked ? "bg-stone-900 border-stone-900" : "border-stone-300 bg-white group-hover:border-stone-500"
                        )}>
                          {item.checked && <Check size={12} className="text-white" />}
                        </div>
                        <div className={cn("transition-all", item.checked ? "opacity-40 line-through" : "")}>
                          <p className="text-xs font-bold text-stone-900 mb-0.5 leading-none">{item.name}</p>
                          <p className="text-[10px] text-stone-500">{item.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-5 border-t border-stone-200 space-y-3 shrink-0 bg-white">
              <Button variant="outline" className="w-full border-stone-200 border-dashed text-stone-600 hover:text-stone-900 hover:bg-stone-50 font-bold uppercase tracking-widest text-[10px] rounded-none py-6">
                + Add Manual Item
              </Button>
              <Button className="w-full bg-stone-900 hover:bg-orange-600 text-white font-bold uppercase tracking-widest text-[10px] rounded-none py-6 transition-colors">
                Sync to Phone
              </Button>
            </div>

            {/* Floating Action Button from wireframe */}
            <div className="absolute bottom-5 right-5 w-12 h-12 bg-stone-900 shadow-xl flex items-center justify-center cursor-pointer hover:scale-105 hover:bg-orange-600 transition-all">
              <Star size={20} className="text-white" />
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}

import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Check, X } from 'lucide-react';
import { cn, getInitial } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('Dietary Preferences');
  const { user } = useAuth();
  const fullName = user?.name?.trim() || 'CookMate Chef';
  const initial = getInitial(user?.name);

  return (
    <Layout>
      <div className="w-full max-w-5xl mx-auto py-8">
        <h1 className="text-3xl font-extrabold text-stone-900 mb-8 tracking-tight">Profile & Settings</h1>

        {/* Header Card */}
        <div className="bg-white p-8 mb-8 flex flex-col sm:flex-row items-center sm:items-start gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-stone-100 -skew-x-12 translate-x-10 -z-10" />
          <div className="relative shrink-0">
            <div
              aria-label={`${fullName} avatar`}
              className="w-32 h-32 bg-stone-900 flex items-center justify-center select-none"
            >
              <span className="text-white text-6xl font-extrabold tracking-tight">
                {initial}
              </span>
            </div>
            <div className="absolute -bottom-2 -right-2 bg-stone-900 text-white p-1.5">
              <span className="sr-only">Edit Profile Picture</span>
              ✏️
            </div>
          </div>
          <div className="flex-1 flex flex-col sm:flex-row justify-between items-center sm:items-start gap-6 w-full">
            <div className="text-center sm:text-left">
              <h2 className="text-4xl font-extrabold text-stone-900 mb-1">{fullName}</h2>
              <p className="text-stone-500 font-medium mb-6">
                {user?.email ? `${user.email} • Home Chef` : 'Home Chef'}
              </p>
              <div className="flex justify-center sm:justify-start gap-8 text-left">
                <div>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Recipes</p>
                  <p className="text-2xl font-bold text-stone-900">142</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Followers</p>
                  <p className="text-2xl font-bold text-stone-900">8.4k</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Avg Rating</p>
                  <p className="text-2xl font-bold text-stone-900">4.9</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
              <Button className="rounded-none bg-stone-900 hover:bg-orange-600 text-white font-bold tracking-widest uppercase text-xs w-full sm:w-40 py-5 transition-colors">
                Edit Profile
              </Button>
              <Button variant="outline" className="rounded-none border-stone-300 text-stone-900 font-bold tracking-widest uppercase text-xs w-full sm:w-40 py-5">
                Share Link
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Sidebar Navigation */}
          <div className="md:col-span-3 space-y-1">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-4 px-4">Category</p>
            {[
              'Personal Info',
              'Dietary Preferences',
              'Kitchen Inventory',
              'Privacy & Security',
              'App Notifications',
              'Logout'
            ].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "w-full text-left px-4 py-3 font-bold text-sm transition-colors",
                  activeTab === tab ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Main Content Area */}
          <div className="md:col-span-9 bg-white p-8">
            {activeTab === 'Dietary Preferences' ? (
              <div className="space-y-10">
                <div>
                  <h3 className="text-2xl font-extrabold text-stone-900 mb-2 tracking-tight">Dietary Preferences</h3>
                  <p className="text-stone-500">Configure your dietary restrictions to help CookMate tailor recipes and AI suggestions to your needs.</p>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-4">Primary Diet Goal</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { title: 'Plant Based', icon: '🥑', desc: 'Focus on vegetables, fruits, and legumes.', active: true },
                      { title: 'Ketogenic', icon: '🥓', desc: 'High-fat, low-carbohydrate approach.', active: false },
                      { title: 'High Protein', icon: '🥩', desc: 'Muscle building and maintenance focus.', active: false },
                    ].map(goal => (
                      <div key={goal.title} className={cn(
                        "p-6 cursor-pointer transition-colors border",
                        goal.active ? "border-stone-900 bg-white" : "border-transparent bg-stone-100 hover:bg-stone-200"
                      )}>
                        <div className="text-2xl mb-4 grayscale">{goal.icon}</div>
                        <h4 className="font-bold text-stone-900 mb-2">{goal.title}</h4>
                        <p className="text-xs text-stone-500 leading-relaxed">{goal.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-4">Exclusions & Allergies</p>
                  <div className="grid grid-cols-2 gap-y-4">
                    {[
                      { label: 'Dairy Free', checked: true },
                      { label: 'Gluten Free', checked: false },
                      { label: 'Peanut Allergy', checked: true },
                      { label: 'Shellfish', checked: false },
                      { label: 'Soy Free', checked: false },
                      { label: 'Tree Nuts', checked: false },
                    ].map(item => (
                      <label key={item.label} className="flex items-center gap-3 cursor-pointer group">
                        <div className={cn(
                          "w-5 h-5 flex items-center justify-center border transition-colors",
                          item.checked ? "bg-stone-900 border-stone-900" : "border-stone-300 bg-white group-hover:border-stone-500"
                        )}>
                          {item.checked && <Check size={14} className="text-white" />}
                        </div>
                        <span className="font-medium text-stone-700 select-none text-sm">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-4">Disliked Ingredients</p>
                  <div className="bg-stone-100 p-4">
                    <p className="text-stone-400 text-sm mb-4">Add ingredients you want to avoid...</p>
                    <div className="flex flex-wrap gap-2">
                      {['CILANTRO', 'OLIVES', 'MUSHROOMS'].map(ing => (
                        <div key={ing} className="flex items-center gap-2 bg-stone-200 px-3 py-1.5 text-xs font-bold text-stone-700">
                          {ing}
                          <button className="hover:text-orange-600"><X size={12} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-4 pt-6 border-t border-stone-100">
                  <Button variant="ghost" className="text-stone-500 font-bold tracking-widest uppercase text-xs">
                    Discard Changes
                  </Button>
                  <Button className="rounded-none bg-stone-900 hover:bg-orange-600 text-white font-bold tracking-widest uppercase text-xs px-8 py-5">
                    Save Preferences
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-stone-400">
                Content for {activeTab}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
          <div className="md:col-span-2 bg-stone-100 p-8 flex flex-col justify-between h-48">
            <p className="text-[10px] font-bold text-stone-900 uppercase tracking-widest mb-4">Activity Heatmap</p>
            <div className="flex items-end gap-2 h-20 w-full">
              {[2, 4, 8, 3, 2, 9, 5, 3, 6, 4, 5, 7, 4, 3].map((val, i) => (
                <div key={i} className="flex-1 bg-stone-300" style={{ height: `${(val / 9) * 100}%` }}>
                  {val > 6 && <div className="w-full h-full bg-stone-900" />}
                </div>
              ))}
            </div>
            <p className="text-[10px] text-stone-500 mt-4">Showing recipe creation and planner interaction over the last 14 days.</p>
          </div>

          <div className="bg-stone-100 p-8 flex flex-col justify-between h-48">
            <p className="text-[10px] font-bold text-stone-900 uppercase tracking-widest">Health Score</p>
            <h3 className="text-5xl font-extrabold text-stone-900">88</h3>
            <div className="space-y-4">
              <p className="text-[10px] text-stone-500 leading-relaxed">Your dietary choices align with 88% of your set nutritional goals for this week.</p>
              <div className="w-full h-1 bg-stone-300">
                <div className="w-[88%] h-full bg-stone-900" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}

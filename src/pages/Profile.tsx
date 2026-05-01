import React, { useState } from 'react';
import { Check, Dumbbell, Flame, Leaf, Pencil, X } from 'lucide-react';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { cn, getInitial } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { ProfilePageSkeleton } from '@/components/SkeletonScreen';
import { useInitialContentLoading } from '@/hooks/useInitialContentLoading';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('Dietary Preferences');
  const { user } = useAuth();
  const isInitialLoading = useInitialContentLoading();
  const fullName = user?.name?.trim() || 'CookMate Chef';
  const initial = getInitial(user?.name);

  if (isInitialLoading) {
    return (
      <Layout>
        <ProfilePageSkeleton />
      </Layout>
    );
  }

  const dietGoals = [
    { title: 'Plant Based', icon: Leaf, desc: 'Focus on vegetables, fruits, and legumes.', active: true },
    { title: 'Ketogenic', icon: Flame, desc: 'High-fat, low-carbohydrate approach.', active: false },
    { title: 'High Protein', icon: Dumbbell, desc: 'Muscle building and maintenance focus.', active: false },
  ];

  return (
    <Layout>
      <div className="mx-auto w-full max-w-5xl py-8 animate-fade-up">
        <h1 className="mb-8 text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">Profile & Settings</h1>

        <div className="relative mb-8 flex flex-col items-center gap-8 overflow-hidden rounded-[2rem] border border-orange-100 bg-white p-8 shadow-xl shadow-orange-100/60 sm:flex-row sm:items-start dark:border-stone-700 dark:bg-stone-800 dark:shadow-none">
          <div className="absolute right-0 top-0 -z-10 h-full w-1/2 -skew-x-12 translate-x-10 bg-orange-50 dark:bg-stone-700/30" />
          <div className="relative shrink-0">
            <div
              aria-label={`${fullName} avatar`}
              className="flex h-32 w-32 select-none items-center justify-center rounded-[2rem] orange-gradient shadow-xl shadow-orange-500/25"
            >
              <span className="text-6xl font-extrabold tracking-tight text-white">
                {initial}
              </span>
            </div>
            <div className="absolute -bottom-2 -right-2 rounded-xl bg-white p-2 text-orange-600 shadow-lg ring-1 ring-orange-100 dark:bg-stone-700 dark:ring-stone-600">
              <span className="sr-only">Edit Profile Picture</span>
              <Pencil size={16} />
            </div>
          </div>
          <div className="flex w-full flex-1 flex-col items-center justify-between gap-6 sm:flex-row sm:items-start">
            <div className="text-center sm:text-left">
              <h2 className="mb-1 text-4xl font-extrabold text-stone-900 dark:text-stone-100">{fullName}</h2>
              <p className="mb-6 font-medium text-stone-500 dark:text-stone-400">
                {user?.email ? `${user.email} - Home Chef` : 'Home Chef'}
              </p>
              <div className="flex justify-center gap-8 text-left sm:justify-start">
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">Recipes</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">142</p>
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">Followers</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">8.4k</p>
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">Avg Rating</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">4.9</p>
                </div>
              </div>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto">
              <Button className="w-full rounded-2xl py-5 text-xs font-bold uppercase tracking-widest sm:w-40">
                Edit Profile
              </Button>
              <Button variant="outline" className="w-full rounded-2xl py-5 text-xs font-bold uppercase tracking-widest sm:w-40">
                Share Link
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
          <div className="space-y-1 md:col-span-3">
            <p className="mb-4 px-4 text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">Category</p>
            {[
              'Personal Info',
              'Dietary Preferences',
              'Kitchen Inventory',
              'Privacy & Security',
              'App Notifications',
              'Logout',
            ].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'w-full rounded-2xl px-4 py-3 text-left text-sm font-bold transition-all',
                  activeTab === tab
                    ? 'orange-gradient text-white shadow-lg shadow-orange-500/20'
                    : 'bg-orange-50/70 text-stone-600 hover:bg-orange-100 hover:text-orange-700 dark:bg-stone-800/70 dark:text-stone-300 dark:hover:bg-stone-700 dark:hover:text-orange-400'
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="rounded-[2rem] border border-orange-100 bg-white p-8 shadow-lg shadow-orange-100/50 md:col-span-9 dark:border-stone-700 dark:bg-stone-800 dark:shadow-none">
            {activeTab === 'Dietary Preferences' ? (
              <div className="space-y-10">
                <div>
                  <h3 className="mb-2 text-2xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">Dietary Preferences</h3>
                  <p className="text-stone-500 dark:text-stone-400">Configure your dietary restrictions to help CookMate tailor recipes and AI suggestions to your needs.</p>
                </div>

                <div>
                  <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">Primary Diet Goal</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {dietGoals.map((goal) => (
                      <div
                        key={goal.title}
                        className={cn(
                          'cursor-pointer rounded-3xl border p-6 transition-all hover-lift',
                          goal.active ? 'border-orange-300 bg-orange-50 shadow-sm dark:border-orange-500/30 dark:bg-orange-500/10' : 'border-orange-100 bg-white hover:bg-orange-50 dark:border-stone-700 dark:bg-stone-700/50 dark:hover:bg-stone-700'
                        )}
                      >
                        <goal.icon className="mb-4 h-7 w-7 text-orange-500" />
                        <h4 className="mb-2 font-bold text-stone-900 dark:text-stone-100">{goal.title}</h4>
                        <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">{goal.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">Exclusions & Allergies</p>
                  <div className="grid grid-cols-2 gap-y-4">
                    {[
                      { label: 'Dairy Free', checked: true },
                      { label: 'Gluten Free', checked: false },
                      { label: 'Peanut Allergy', checked: true },
                      { label: 'Shellfish', checked: false },
                      { label: 'Soy Free', checked: false },
                      { label: 'Tree Nuts', checked: false },
                    ].map((item) => (
                      <label key={item.label} className="group flex cursor-pointer items-center gap-3">
                        <div
                          className={cn(
                            'flex h-5 w-5 items-center justify-center rounded-md border transition-colors',
                            item.checked ? 'border-orange-500 bg-orange-500' : 'border-stone-300 bg-white group-hover:border-orange-400 dark:border-stone-600 dark:bg-stone-700'
                          )}
                        >
                          {item.checked && <Check size={14} className="text-white" />}
                        </div>
                        <span className="select-none text-sm font-medium text-stone-700 dark:text-stone-300">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">Disliked Ingredients</p>
                  <div className="rounded-3xl bg-orange-50/70 p-4 dark:bg-stone-700/50">
                    <p className="mb-4 text-sm text-stone-400 dark:text-stone-500">Add ingredients you want to avoid...</p>
                    <div className="flex flex-wrap gap-2">
                      {['CILANTRO', 'OLIVES', 'MUSHROOMS'].map((ing) => (
                        <div key={ing} className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-stone-700 shadow-sm ring-1 ring-orange-100 dark:bg-stone-600 dark:text-stone-200 dark:ring-stone-500">
                          {ing}
                          <button className="text-orange-400 hover:text-orange-600 dark:text-orange-400"><X size={12} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-4 border-t border-orange-100 pt-6 dark:border-stone-700">
                  <Button variant="ghost" className="text-xs font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">
                    Discard Changes
                  </Button>
                  <Button className="rounded-2xl px-8 py-5 text-xs font-bold uppercase tracking-widest">
                    Save Preferences
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center text-stone-400 dark:text-stone-500">
                Content for {activeTab}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="flex h-48 flex-col justify-between rounded-3xl border border-orange-100 bg-orange-50/70 p-8 md:col-span-2 dark:border-stone-700 dark:bg-stone-800/70">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-orange-700 dark:text-orange-400">Activity Heatmap</p>
            <div className="flex h-20 w-full items-end gap-2">
              {[2, 4, 8, 3, 2, 9, 5, 3, 6, 4, 5, 7, 4, 3].map((val, i) => (
                <div key={i} className="flex-1 rounded-t-full bg-orange-200 dark:bg-stone-700" style={{ height: `${(val / 9) * 100}%` }}>
                  {val > 6 && <div className="h-full w-full rounded-t-full bg-orange-500 dark:bg-orange-500" />}
                </div>
              ))}
            </div>
            <p className="mt-4 text-[10px] text-stone-500 dark:text-stone-400">Showing recipe creation and planner interaction over the last 14 days.</p>
          </div>

          <div className="flex h-48 flex-col justify-between rounded-3xl border border-orange-100 bg-white p-8 shadow-sm shadow-orange-100/50 dark:border-stone-700 dark:bg-stone-800 dark:shadow-none">
            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-700 dark:text-orange-400">Health Score</p>
            <h3 className="text-5xl font-extrabold text-orange-600 dark:text-orange-400">88</h3>
            <div className="space-y-4">
              <p className="text-[10px] leading-relaxed text-stone-500 dark:text-stone-400">Your dietary choices align with 88% of your set nutritional goals for this week.</p>
              <div className="h-1 w-full rounded-full bg-orange-100 dark:bg-stone-700">
                <div className="h-full w-[88%] rounded-full bg-orange-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

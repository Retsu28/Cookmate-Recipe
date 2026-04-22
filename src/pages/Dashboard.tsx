import React from 'react';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { RightPanel } from '../components/RightPanel';
import { FeaturedRecipes } from '../components/FeaturedRecipes';
import { RecentRecipes } from '../components/RecentRecipes';
import { SeasonalIngredients } from '../components/SeasonalIngredients';
import { CookingSkillContent } from '../components/CookingSkillContent';
import { AIChatWidget } from '../components/AIChatWidget';

export default function Dashboard() {
  return (
    <div className="flex h-screen bg-stone-50 font-sans text-stone-900">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <section>
            <h2 className="text-2xl font-serif italic mb-4">Featured Recipes</h2>
            <FeaturedRecipes />
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <section>
              <h2 className="text-xl font-semibold mb-4">Recent Recipes</h2>
              <RecentRecipes />
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-4">Seasonal Ingredients</h2>
              <SeasonalIngredients />
            </section>
          </div>

          <section>
            <h2 className="text-xl font-semibold mb-4">Cooking Skills</h2>
            <CookingSkillContent />
          </section>
        </div>
      </main>

      {/* Right Panel */}
      <RightPanel />

      {/* AI Assistant */}
      <AIChatWidget />
    </div>
  );
}

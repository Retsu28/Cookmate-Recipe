/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import SearchPage from './pages/Search';
import RecipeDetail from './pages/RecipeDetail';
import MealPlanner from './pages/MealPlanner';
import ProfilePage from './pages/Profile';
import NotificationsPage from './pages/Notifications';
import AICamera from './pages/AICamera';
import Settings from './pages/Settings';
import { Toaster } from '@/components/ui/sonner';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/recipe/:id" element={<RecipeDetail />} />
        <Route path="/planner" element={<MealPlanner />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/camera" element={<AICamera />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
      <Toaster position="top-right" />
    </Router>
  );
}

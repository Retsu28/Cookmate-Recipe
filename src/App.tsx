/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import AppShell from './app/AppShell';
import { AuthProvider } from '@/context/AuthContext';
import AuthGate from '@/auth/AuthGate';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const SearchPage = lazy(() => import('./pages/Search'));
const RecipeDetail = lazy(() => import('./pages/RecipeDetail'));
const MealPlanner = lazy(() => import('./pages/MealPlanner'));
const ProfilePage = lazy(() => import('./pages/Profile'));
const NotificationsPage = lazy(() => import('./pages/Notifications'));
const AICamera = lazy(() => import('./pages/AICamera'));
const Settings = lazy(() => import('./pages/Settings'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route element={<AppShell />}>
            {/* Public routes — reachable without a session */}
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<Signup />} />
            <Route path="onboarding" element={<Onboarding />} />

            {/* Protected routes — AuthGate redirects to /login if signed out */}
            <Route element={<AuthGate />}>
              <Route index element={<Dashboard />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="recipe/:id" element={<RecipeDetail />} />
              <Route path="planner" element={<MealPlanner />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="camera" element={<AICamera />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
        <Toaster position="top-right" />
      </Router>
    </AuthProvider>
  );
}

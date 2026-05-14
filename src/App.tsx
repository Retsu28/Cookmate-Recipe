/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense, useState } from 'react'; // lazy/Suspense kept for admin routes
import { PageErrorBoundary } from '@/components/PageErrorBoundary';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import AppShell from './app/AppShell';
import SplashScreen from '@/components/SplashScreen';
import { InstallPrompt } from '@/components/InstallPrompt';
import { PWAUpdatePrompt } from '@/components/PWAUpdatePrompt';
import PlannerReminderBridge from '@/notifications/PlannerReminderBridge';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AIChatProvider } from '@/context/AIChatContext';
import AuthGate, { GuestGate } from '@/auth/AuthGate';
import AdminGate from '@/auth/AdminGate';
import AdminLayout from './admin/AdminLayout';
import { ContentSkeleton } from '@/components/SkeletonScreen';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import MFAVerify from './pages/MFAVerify';

// Core user pages — bundled directly so they are always accessible offline
// (no separate chunk fetch required when the app shell is cached)
import Dashboard from './pages/Dashboard';
import SearchPage from './pages/Search';
import AllRecipesPage from './pages/AllRecipes';
import MealPlanner from './pages/MealPlanner';
import AICamera from './pages/AICamera';
import ProfilePage from './pages/Profile';
import NotificationsPage from './pages/Notifications';
import Settings from './pages/Settings';
import Onboarding from './pages/Onboarding';

import RecipeDetail from './pages/RecipeDetail';
const AdminOverview = lazy(() => import('./admin/AdminOverview'));
const MLAnalytics = lazy(() => import('./admin/pages/MLAnalytics'));
const RecipeManagement = lazy(() => import('./admin/pages/RecipeManagement'));
const IngredientManagement = lazy(() => import('./admin/pages/IngredientManagement'));
const UserManagement = lazy(() => import('./admin/pages/UserManagement'));
const MealPlannerMonitoring = lazy(() => import('./admin/pages/MealPlannerMonitoring'));
const AIActivityMonitoring = lazy(() => import('./admin/pages/AIActivityMonitoring'));
const NotificationManagement = lazy(() => import('./admin/pages/NotificationManagement'));
const Reports = lazy(() => import('./admin/pages/Reports'));
const ReviewsFeedback = lazy(() => import('./admin/pages/ReviewsFeedback'));
const SystemStatus = lazy(() => import('./admin/pages/SystemStatus'));
const AuditLog = lazy(() => import('./admin/pages/AuditLog'));

function PostLoginSplash() {
  const { showPostLoginSplash, finishPostLoginSplash } = useAuth();

  if (!showPostLoginSplash) return null;

  return <SplashScreen onFinished={finishPostLoginSplash} />;
}

function SignOutSplash() {
  const { showLogoutSplash, isLoggingOut, finishLogoutSplash } = useAuth();

  if (!showLogoutSplash) return null;

  return (
    <SplashScreen
      onFinished={finishLogoutSplash}
      minimumDuration={1200}
      message="Signing you out..."
      isReady={!isLoggingOut}
    />
  );
}

export default function App() {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true} storageKey="cookmate:theme">
      {!splashDone && <SplashScreen onFinished={() => setSplashDone(true)} />}
      <AuthProvider>
        <PostLoginSplash />
        <SignOutSplash />
        <Router>
          <AIChatProvider>
          <PlannerReminderBridge />
          <Routes>
            <Route element={<AdminGate />}>
              <Route path="admin" element={<AdminLayout />}>
                <Route index element={<PageErrorBoundary><Suspense fallback={<ContentSkeleton />}><AdminOverview /></Suspense></PageErrorBoundary>} />
                <Route path="recipes" element={<PageErrorBoundary><Suspense fallback={<ContentSkeleton />}><RecipeManagement /></Suspense></PageErrorBoundary>} />
                <Route path="ingredients" element={<PageErrorBoundary><Suspense fallback={<ContentSkeleton />}><IngredientManagement /></Suspense></PageErrorBoundary>} />
                <Route path="users" element={<PageErrorBoundary><Suspense fallback={<ContentSkeleton />}><UserManagement /></Suspense></PageErrorBoundary>} />
                <Route path="meal-planner" element={<PageErrorBoundary><Suspense fallback={<ContentSkeleton />}><MealPlannerMonitoring /></Suspense></PageErrorBoundary>} />
                <Route path="ai-activity" element={<PageErrorBoundary><Suspense fallback={<ContentSkeleton />}><AIActivityMonitoring /></Suspense></PageErrorBoundary>} />
                <Route path="notifications" element={<PageErrorBoundary><Suspense fallback={<ContentSkeleton />}><NotificationManagement /></Suspense></PageErrorBoundary>} />
                <Route path="reports" element={<PageErrorBoundary><Suspense fallback={<ContentSkeleton />}><Reports /></Suspense></PageErrorBoundary>} />
                <Route path="reviews" element={<PageErrorBoundary><Suspense fallback={<ContentSkeleton />}><ReviewsFeedback /></Suspense></PageErrorBoundary>} />
                <Route path="system-status" element={<PageErrorBoundary><Suspense fallback={<ContentSkeleton />}><SystemStatus /></Suspense></PageErrorBoundary>} />
                <Route path="ml-analytics" element={<PageErrorBoundary><Suspense fallback={<ContentSkeleton />}><MLAnalytics /></Suspense></PageErrorBoundary>} />
                <Route path="audit-log" element={<PageErrorBoundary><Suspense fallback={<ContentSkeleton />}><AuditLog /></Suspense></PageErrorBoundary>} />
              </Route>
            </Route>

            <Route element={<AppShell />}>
              {/* Public routes — reachable without a session */}
              <Route element={<GuestGate />}>
                <Route path="login" element={<Login />} />
                <Route path="signup" element={<Signup />} />
                <Route path="forgot-password" element={<ForgotPassword />} />
                <Route path="reset-password" element={<ResetPassword />} />
                <Route path="mfa-verify" element={<MFAVerify />} />
              </Route>

              {/* Protected routes — AuthGate redirects to /login if signed out */}
              <Route element={<AuthGate />}>
                <Route index element={<Dashboard />} />
                <Route path="onboarding" element={<Onboarding />} />
                <Route path="search" element={<SearchPage />} />
                <Route path="recipes" element={<AllRecipesPage />} />
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
          <InstallPrompt />
          <PWAUpdatePrompt />
          </AIChatProvider>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

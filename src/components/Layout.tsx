import React, { createContext, useContext, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home, Search, Calendar, Camera, User, Settings as SettingsIcon,
  Bell, Menu, ShieldCheck, X
} from 'lucide-react';
import { AIChatWidget } from './AIChatWidget';
import { motion, AnimatePresence } from 'motion/react';
import { cn, getInitial } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

export const LayoutShellContext = createContext(false);

export function Layout({ children }: { children: React.ReactNode }) {
  const isNestedInAppShell = useContext(LayoutShellContext);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const profileInitial = getInitial(user?.name);
  const profileLabel = user?.name?.trim() || 'Profile';
  const isAdmin = user?.role === 'admin';

  // When AppShell provides the persistent frame, page-level Layout calls flatten
  // to avoid rendering the same chrome twice.
  if (isNestedInAppShell) {
    return <>{children}</>;
  }

  const baseNavLinks = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Search', path: '/search', icon: Search },
    { name: 'Planner', path: '/planner', icon: Calendar },
    { name: 'AI Camera', path: '/camera', icon: Camera },
    { name: 'Profile', path: '/profile', icon: User },
    { name: 'Settings', path: '/settings', icon: SettingsIcon },
  ];
  const navLinks = isAdmin
    ? [...baseNavLinks, { name: 'Admin Dashboard', path: '/admin', icon: ShieldCheck }]
    : baseNavLinks;

  return (
    <div className="flex h-screen bg-stone-50 text-stone-900 font-sans overflow-hidden">

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-stone-100 border-r border-stone-200 shrink-0 relative z-20">
        <div className="p-8">
          <Link to="/" className="flex flex-col">
            <span className="font-extrabold text-2xl tracking-tight text-stone-900">CookMate</span>
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-[0.2em] mt-1">Kitchen Assistant</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path || (link.path === '/search' && location.pathname.startsWith('/search'));
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                to={link.path}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-all group relative overflow-hidden",
                  isActive ? "text-orange-600 bg-white shadow-sm border border-stone-200/50" : "text-stone-500 hover:text-stone-900 hover:bg-stone-200/50"
                )}
              >
                {isActive && (
                  <motion.div layoutId="activeNavIndicator" className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500 rounded-r-full" />
                )}
                <Icon size={20} className={cn("transition-transform group-hover:scale-110", isActive && "text-orange-500")} />
                {link.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-900/20 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 w-64 bg-stone-100 border-r border-stone-200 flex flex-col z-50 shadow-2xl md:hidden"
          >
            <div className="p-6 flex items-center justify-between">
              <Link to="/" className="flex flex-col" onClick={() => setMobileMenuOpen(false)}>
                <span className="font-extrabold text-2xl tracking-tight text-stone-900">CookMate</span>
              </Link>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-stone-500 hover:text-stone-900 bg-stone-200 rounded-full">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path || (link.path === '/search' && location.pathname.startsWith('/search'));
                const Icon = link.icon;
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-4 px-4 py-4 rounded-2xl font-bold transition-all",
                      isActive ? "bg-white text-orange-600 shadow-sm border border-stone-200" : "text-stone-600 hover:bg-stone-200"
                    )}
                  >
                    <Icon size={22} className={cn(isActive && "text-orange-500")} />
                    {link.name}
                  </Link>
                );
              })}
            </nav>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-stone-50 relative">

        {/* Topbar */}
        <header className="h-20 shrink-0 flex items-center justify-between px-4 sm:px-8 bg-stone-50/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-4 flex-1">
            <button
              className="md:hidden p-2 -ml-2 text-stone-500 hover:bg-stone-200 rounded-xl"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>

            <div className="max-w-md w-full relative hidden sm:block">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search recipes, ingredients..."
                className="w-full bg-stone-200/50 border-none outline-none text-stone-700 placeholder:text-stone-400 rounded-full py-2.5 pl-12 pr-4 font-medium focus:ring-2 focus:ring-orange-500/20 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {isAdmin && (
              <Link
                to="/admin"
                aria-label="Back to admin dashboard"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-stone-200 bg-white px-3 text-xs font-extrabold uppercase tracking-[0.12em] text-stone-700 shadow-sm transition-colors hover:border-orange-300 hover:text-orange-600"
              >
                <ShieldCheck size={16} />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            )}
            <Link
              to="/notifications"
              aria-label="Notifications"
              className="p-2.5 text-stone-500 hover:bg-stone-200 rounded-full transition-colors relative"
            >
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full border-2 border-stone-50" />
            </Link>
            <Link
              to="/profile"
              aria-label={`${profileLabel} profile`}
              className="p-1 rounded-full border-2 border-transparent hover:border-orange-500 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-stone-900 flex items-center justify-center select-none">
                <span className="text-white text-sm font-extrabold tracking-tight">
                  {profileInitial}
                </span>
              </div>
            </Link>
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="px-4 sm:px-8 pb-24 md:pb-12 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>

        <AIChatWidget />
      </div>
    </div>
  );
}

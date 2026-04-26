import React, { createContext, useContext, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home, Search, Calendar, Camera, User, Settings as SettingsIcon,
  Bell, Menu, ShieldCheck, UtensilsCrossed, X
} from 'lucide-react';
import { AIChatWidget } from './AIChatWidget';
import { motion, AnimatePresence } from 'motion/react';
import { cn, getInitial } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { isAdminUser } from '@/services/authService';
import { ThemeToggle } from '@/components/ThemeToggle';

export const LayoutShellContext = createContext(false);

export function Layout({ children }: { children: React.ReactNode }) {
  const isNestedInAppShell = useContext(LayoutShellContext);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const profileInitial = getInitial(user?.name);
  const profileLabel = user?.name?.trim() || 'Profile';
  const isAdmin = isAdminUser(user);

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
  const bottomNavLinks = navLinks.filter((link) => ['Home', 'Search', 'Planner', 'AI Camera', 'Profile'].includes(link.name));

  return (
    <div className="flex h-screen overflow-hidden bg-orange-50/50 font-sans text-stone-900">

      {/* Desktop Sidebar */}
      <aside className="relative z-20 hidden w-64 shrink-0 flex-col border-r border-orange-100 bg-white/90 shadow-xl shadow-orange-100/30 backdrop-blur md:flex">
        <div className="p-8">
          <Link to="/" className="group flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl orange-gradient text-white shadow-lg shadow-orange-500/25 transition-transform group-hover:scale-105">
              <UtensilsCrossed size={22} />
            </div>
            <span className="flex flex-col">
              <span className="text-2xl font-extrabold tracking-tight text-stone-900">CookMate</span>
              <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-600">Kitchen Assistant</span>
            </span>
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
                  "group relative flex items-center gap-4 overflow-hidden rounded-2xl px-4 py-3 font-bold transition-all duration-200",
                  isActive ? "orange-gradient text-white shadow-lg shadow-orange-500/20" : "text-stone-500 hover:bg-orange-50 hover:text-orange-700"
                )}
              >
                {isActive && (
                  <motion.div layoutId="activeNavIndicator" className="absolute inset-y-2 left-1 w-1 rounded-full bg-white/80" />
                )}
                <Icon size={20} className={cn("transition-transform group-hover:scale-110", isActive ? "text-white" : "text-stone-400 group-hover:text-orange-600")} />
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
            className="fixed inset-0 z-40 bg-orange-950/20 backdrop-blur-sm md:hidden"
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
            className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-orange-100 bg-white shadow-2xl md:hidden"
          >
            <div className="flex items-center justify-between p-6">
              <Link to="/" className="flex flex-col" onClick={() => setMobileMenuOpen(false)}>
                <span className="text-2xl font-extrabold tracking-tight text-stone-900">CookMate</span>
                <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-600">Kitchen Assistant</span>
              </Link>
              <button onClick={() => setMobileMenuOpen(false)} className="rounded-full bg-orange-50 p-2 text-orange-600 transition-colors hover:bg-orange-100">
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
                      "flex items-center gap-4 rounded-2xl px-4 py-4 font-bold transition-all",
                      isActive ? "orange-gradient text-white shadow-lg shadow-orange-500/20" : "text-stone-600 hover:bg-orange-50 hover:text-orange-700"
                    )}
                  >
                    <Icon size={22} className={cn(isActive ? "text-white" : "text-stone-400")} />
                    {link.name}
                  </Link>
                );
              })}
            </nav>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="relative flex h-screen flex-1 flex-col overflow-hidden bg-orange-50/40">

        {/* Topbar */}
        <header className="z-10 flex h-20 shrink-0 items-center justify-between border-b border-orange-100/60 bg-orange-50/85 px-4 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-4 flex-1">
            <button
              className="-ml-2 rounded-xl p-2 text-orange-600 transition-colors hover:bg-orange-100 md:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>

            <div className="max-w-md w-full relative hidden sm:block">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search recipes, ingredients..."
                className="w-full rounded-full border border-orange-100 bg-white/75 py-2.5 pl-12 pr-4 font-medium text-stone-700 outline-none shadow-sm placeholder:text-stone-400 transition-all focus:border-orange-300 focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <ThemeToggle />
            {isAdmin && (
              <Link
              to="/admin"
              aria-label="Back to admin dashboard"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-orange-200 bg-white px-3 text-xs font-extrabold uppercase tracking-[0.12em] text-orange-700 shadow-sm transition-colors hover:bg-orange-50"
              >
                <ShieldCheck size={16} />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            )}
            <Link
              to="/notifications"
              aria-label="Notifications"
              className="relative rounded-full bg-white p-2.5 text-stone-500 shadow-sm ring-1 ring-orange-100 transition-colors hover:bg-orange-50 hover:text-orange-600"
            >
              <Bell size={20} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-white" />
            </Link>
            <Link
              to="/profile"
              aria-label={`${profileLabel} profile`}
              className="rounded-full p-1 ring-2 ring-transparent transition-all hover:ring-orange-300"
            >
              <div className="flex h-9 w-9 select-none items-center justify-center rounded-full orange-gradient shadow-lg shadow-orange-500/20">
                <span className="text-white text-sm font-extrabold tracking-tight">
                  {profileInitial}
                </span>
              </div>
            </Link>
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto scrollbar-hide">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto w-full max-w-7xl px-4 pb-28 sm:px-8 md:pb-12"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-[1.5rem] border border-orange-100 bg-white/95 p-1.5 shadow-2xl shadow-orange-950/10 backdrop-blur md:hidden">
          {bottomNavLinks.map((link) => {
            const isActive = location.pathname === link.path || (link.path === '/search' && location.pathname.startsWith('/search'));
            const Icon = link.icon;

            return (
              <Link
                key={link.name}
                to={link.path}
                aria-label={link.name}
                className={cn(
                  "flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-extrabold transition-all",
                  isActive ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "text-stone-500 hover:bg-orange-50 hover:text-orange-700"
                )}
              >
                <Icon size={18} />
                <span className="max-w-full truncate">{link.name === 'AI Camera' ? 'Camera' : link.name}</span>
              </Link>
            );
          })}
        </nav>

        <AIChatWidget />
      </div>
    </div>
  );
}

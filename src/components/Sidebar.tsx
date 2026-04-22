import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Calendar, Camera, User, Settings, Bell, UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Search, label: 'Search', path: '/search' },
  { icon: Calendar, label: 'Planner', path: '/planner' },
  { icon: Camera, label: 'AI Camera', path: '/camera' },
  { icon: Bell, label: 'Notifications', path: '/notifications', badge: 3 },
  { icon: User, label: 'Profile', path: '/profile' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 bg-white border-r border-stone-200 flex flex-col h-full">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white">
          <UtensilsCrossed size={24} />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-stone-900">CookMate</h1>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.label}
              to={item.path}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                isActive 
                  ? "bg-orange-50 text-orange-600 font-medium" 
                  : "text-stone-500 hover:bg-stone-50 hover:text-stone-900"
              )}
            >
              <item.icon size={20} className={cn(
                isActive ? "text-orange-600" : "text-stone-400 group-hover:text-stone-900"
              )} />
              <span>{item.label}</span>
              {item.badge && (
                <span className="ml-auto bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-stone-100">
        <div className="bg-stone-900 rounded-xl p-4 text-white relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-xs font-medium text-stone-400 mb-1">PRO PLAN</p>
            <p className="text-sm font-bold mb-3">Unlock AI Recipes</p>
            <button className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold py-2 rounded-lg transition-colors">
              Upgrade Now
            </button>
          </div>
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-orange-500/20 rounded-full blur-2xl" />
        </div>
      </div>
    </aside>
  );
}

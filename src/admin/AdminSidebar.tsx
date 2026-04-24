import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  Camera,
  Home,
  Package,
  Server,
  Star,
  Users,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface AdminNavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

const adminNavItems: AdminNavItem[] = [
  { label: 'Overview', path: '/admin', icon: Home },
  { label: 'Recipes', path: '/admin/recipes', icon: BookOpen },
  { label: 'Ingredients', path: '/admin/ingredients', icon: Package },
  { label: 'Users', path: '/admin/users', icon: Users },
  { label: 'Meal Planner', path: '/admin/meal-planner', icon: CalendarDays },
  { label: 'AI Activity', path: '/admin/ai-activity', icon: Camera },
  { label: 'Reviews', path: '/admin/reviews', icon: Star },
  { label: 'Notifications', path: '/admin/notifications', icon: Bell },
  { label: 'Reports', path: '/admin/reports', icon: BarChart3 },
  { label: 'System Status', path: '/admin/system-status', icon: Server },
];

interface AdminSidebarProps {
  onNavigate?: () => void;
}

export function AdminSidebar({ onNavigate }: AdminSidebarProps) {
  return (
    <aside className="flex h-full flex-col bg-stone-100">
      <div className="border-b border-stone-200 p-6">
        <NavLink to="/" onClick={onNavigate} className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/20">
            <Activity size={22} />
          </div>
          <div>
            <p className="text-xl font-extrabold tracking-tight text-stone-900">CookMate</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">Admin Kitchen</p>
          </div>
        </NavLink>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {adminNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/admin'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all',
                isActive
                  ? 'border border-stone-200 bg-white text-orange-600 shadow-sm'
                  : 'text-stone-500 hover:bg-stone-200/70 hover:text-stone-900'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={18} className={cn('transition-colors', isActive ? 'text-orange-500' : 'text-stone-400 group-hover:text-stone-900')} />
                <span>{item.label}</span>
                {isActive && <span className="ml-auto h-2 w-2 rounded-full bg-orange-500" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="m-4 rounded-[1.5rem] bg-stone-900 p-4 text-white">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-300">Preview mode</p>
        <p className="mt-2 text-sm leading-relaxed text-stone-300">
          Admin actions use local mock data until production APIs and role-based auth exist.
        </p>
      </div>
    </aside>
  );
}

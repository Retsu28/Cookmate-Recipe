import { Bell, Menu, Search, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface AdminTopbarProps {
  onMenuClick: () => void;
}

export function AdminTopbar({ onMenuClick }: AdminTopbarProps) {
  const openUserApp = () => {
    try {
      localStorage.setItem('hasSeenOnboarding', 'true');
    } catch {
      /* storage may be unavailable; the link still navigates to the user app */
    }
  };

  return (
    <header className="sticky top-0 z-20 flex min-h-20 items-center gap-3 border-b border-stone-200 bg-stone-50/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full text-stone-500 lg:hidden"
        aria-label="Open admin navigation"
        onClick={onMenuClick}
      >
        <Menu size={20} />
      </Button>

      <div className="relative hidden flex-1 sm:block">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
        <Input
          aria-label="Search admin records"
          placeholder="Search admin records..."
          className="h-11 rounded-full border-stone-200 bg-white pl-11 font-medium shadow-sm"
        />
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <Badge className="hidden h-8 rounded-full bg-orange-100 px-3 font-bold text-orange-700 sm:inline-flex">
          <ShieldCheck size={14} />
          Admin preview
        </Badge>
        <Link
          to="/admin/notifications"
          aria-label="Admin notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-stone-500 shadow-sm ring-1 ring-stone-200 transition-colors hover:text-orange-600"
        >
          <Bell size={18} />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-white" />
        </Link>
        <Link
          to="/"
          onClick={openUserApp}
          className="rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-stone-700 shadow-sm transition-colors hover:border-orange-300 hover:text-orange-600"
        >
          User App
        </Link>
      </div>
    </header>
  );
}

import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { StatusTone } from '../data/adminMockData';

const toneClasses: Record<StatusTone, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
  warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
  danger:  'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  info:    'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-800',
  neutral: 'bg-stone-100 text-stone-600 border-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700',
};

interface StatusBadgeProps {
  children: ReactNode;
  tone?: StatusTone;
  className?: string;
}

export function StatusBadge({ children, tone = 'neutral', className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn('h-auto rounded-full px-3 py-1 text-[11px] font-bold', toneClasses[tone], className)}
    >
      {children}
    </Badge>
  );
}

export function statusToneFromLabel(status: string): StatusTone {
  const normalized = status.toLowerCase();

  if (normalized === 'online') return 'success';
  if (normalized === 'recently active') return 'info';
  if (normalized === 'inactive') return 'neutral';
  if (normalized === 'deleted') return 'danger';

  if (['active', 'published', 'approved', 'configured', 'scheduled', 'sent', 'succeeded'].some((term) => normalized.includes(term))) {
    return 'success';
  }

  if (['draft', 'pending', 'planned', 'placeholder', 'review', 'queued'].some((term) => normalized.includes(term))) {
    return 'warning';
  }

  if (['failed', 'hidden', 'flagged', 'missing', 'archived', 'inactive'].some((term) => normalized.includes(term))) {
    return 'danger';
  }

  if (['server', 'ready', 'network', 'installable'].some((term) => normalized.includes(term))) {
    return 'info';
  }

  return 'neutral';
}

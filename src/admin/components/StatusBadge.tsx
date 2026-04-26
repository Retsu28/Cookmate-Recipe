import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { StatusTone } from '../data/adminMockData';

const toneClasses: Record<StatusTone, string> = {
  success: 'bg-orange-100 text-orange-700 border-orange-200',
  warning: 'bg-orange-50 text-orange-700 border-orange-200',
  danger: 'bg-orange-100 text-orange-800 border-orange-300',
  info: 'bg-orange-50 text-orange-700 border-orange-200',
  neutral: 'bg-stone-100 text-stone-600 border-stone-200',
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

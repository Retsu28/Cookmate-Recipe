import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { StatusTone } from '../data/adminMockData';
import { StatusBadge } from './StatusBadge';

const iconToneClasses: Record<StatusTone, string> = {
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  neutral: 'bg-stone-100 text-stone-700',
};

interface AdminStatCardProps {
  label: string;
  value: string;
  description: string;
  change: string;
  tone: StatusTone;
  icon: LucideIcon;
}

export function AdminStatCard({ label, value, description, change, tone, icon: Icon }: AdminStatCardProps) {
  return (
    <Card className="rounded-[2rem] border-stone-100 bg-white shadow-lg shadow-stone-200/40">
      <CardContent className="p-5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', iconToneClasses[tone])}>
            <Icon size={22} />
          </div>
          <StatusBadge tone={tone}>
            <ArrowUpRight size={12} />
            {change}
          </StatusBadge>
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-400">{label}</p>
        <p className="mt-2 text-3xl font-extrabold tracking-tight text-stone-900">{value}</p>
        <p className="mt-2 text-sm leading-relaxed text-stone-500">{description}</p>
      </CardContent>
    </Card>
  );
}

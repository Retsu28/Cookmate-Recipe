import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { StatusTone } from '../data/adminMockData';
import { StatusBadge } from './StatusBadge';

const iconToneClasses: Record<StatusTone, string> = {
  success: 'bg-orange-100 text-orange-600',
  warning: 'bg-orange-200 text-orange-700',
  danger: 'bg-orange-100 text-orange-800',
  info: 'bg-orange-50 text-orange-600',
  neutral: 'bg-stone-100 text-stone-700',
};

interface AdminStatCardProps {
  label: string;
  value: string;
  description: string;
  change: string;
  tone: StatusTone;
  icon: LucideIcon;
  index?: number;
}

export function AdminStatCard({ label, value, description, change, tone, icon: Icon, index = 0 }: AdminStatCardProps) {
  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="flex h-full flex-col rounded-[2rem] border-orange-100 bg-white shadow-lg shadow-orange-100/50 transition-shadow hover:shadow-xl">
        <CardContent className="flex flex-1 flex-col p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl shrink-0', iconToneClasses[tone])}>
              <Icon size={22} />
            </div>
            <StatusBadge tone={tone}>
              <ArrowUpRight size={12} />
              {change}
            </StatusBadge>
          </div>
          <div className="flex flex-col">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-400">{label}</p>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-stone-900">{value}</p>
            <p className="mt-2 text-sm leading-relaxed text-stone-500">{description}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

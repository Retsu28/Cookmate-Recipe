import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { StatusTone } from '../data/adminMockData';
import { StatusBadge } from './StatusBadge';

const iconToneClasses: Record<StatusTone, string> = {
  success: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  danger: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  info: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
  neutral: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-400',
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
      <Card className="flex h-full flex-col rounded-[2rem] border-stone-100 bg-white shadow-lg shadow-stone-100/50 transition-shadow hover:shadow-xl dark:border-stone-800 dark:bg-stone-900 dark:shadow-stone-950/40">
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
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">{label}</p>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">{value}</p>
            <p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">{description}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

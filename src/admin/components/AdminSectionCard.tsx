import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AdminSectionCardProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function AdminSectionCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: AdminSectionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className={cn('rounded-[2rem] border-stone-100 bg-white shadow-lg shadow-stone-200/40', className)}>
        <CardContent className={cn('p-5 sm:p-6', contentClassName)}>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-stone-900">{title}</h2>
              {description && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-stone-500">{description}</p>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </div>
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}

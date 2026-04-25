import type { ReactNode } from 'react';
import { motion } from 'motion/react';

interface AdminPageHeaderProps {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}

export function AdminPageHeader({ eyebrow = 'CookMate Admin', title, description, actions }: AdminPageHeaderProps) {
  return (
    <motion.div
      className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-500 sm:text-base">{description}</p>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </motion.div>
  );
}

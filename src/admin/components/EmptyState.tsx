import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
}

export function EmptyState({ icon: Icon, title, description, actionLabel }: EmptyStateProps) {
  return (
    <div className="rounded-[2rem] border border-dashed border-stone-200 bg-stone-50 p-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-stone-300 shadow-sm">
        <Icon size={30} />
      </div>
      <h3 className="mt-5 text-lg font-extrabold text-stone-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-500">{description}</p>
      {actionLabel && (
        <Button className="mt-5 rounded-full bg-stone-900 px-5 font-bold text-white hover:bg-stone-800">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

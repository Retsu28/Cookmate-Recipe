import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ChefHat } from 'lucide-react';

interface HomeSectionProps {
  eyebrow?: string;
  title: string;
  description?: string;
  viewAllTo?: string;
  viewAllLabel?: string;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  /** Set to false to render the children inline (no horizontal scroll wrapper). */
  scrollable?: boolean;
  /** Set to false when the section should render only its header and description. */
  showContent?: boolean;
  children?: React.ReactNode;
}

export function HomeSection({
  eyebrow,
  title,
  description,
  viewAllTo,
  viewAllLabel = 'View all',
  loading = false,
  empty = false,
  emptyMessage = 'Nothing here yet — check back soon.',
  scrollable = true,
  showContent = true,
  children,
}: HomeSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollBy = (delta: number) => {
    scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  };

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="text-2xl font-extrabold tracking-tight text-stone-900 sm:text-3xl dark:text-stone-100">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 max-w-xl text-sm text-stone-500 dark:text-stone-400">{description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {showContent && scrollable ? (
            <>
              <button
                type="button"
                onClick={() => scrollBy(-320)}
                aria-label={`Scroll ${title} left`}
                className="hidden h-9 w-9 items-center justify-center rounded-full border border-orange-100 bg-white text-stone-500 shadow-sm transition-colors hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400 dark:hover:border-orange-500 dark:hover:bg-stone-700 dark:hover:text-orange-400 sm:flex"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => scrollBy(320)}
                aria-label={`Scroll ${title} right`}
                className="hidden h-9 w-9 items-center justify-center rounded-full border border-orange-100 bg-white text-stone-500 shadow-sm transition-colors hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400 dark:hover:border-orange-500 dark:hover:bg-stone-700 dark:hover:text-orange-400 sm:flex"
              >
                <ChevronRight size={16} />
              </button>
            </>
          ) : null}
          {viewAllTo ? (
            <Link
              to={viewAllTo}
              className="rounded-full border border-orange-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-orange-700 transition-colors hover:bg-orange-50 dark:border-stone-700 dark:bg-stone-800 dark:text-orange-400 dark:hover:bg-stone-700"
            >
              {viewAllLabel}
            </Link>
          ) : null}
        </div>
      </div>

      {!showContent ? null : loading ? (
        <div className="flex gap-4 overflow-hidden">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="skeleton-shimmer h-48 w-56 shrink-0 rounded-2xl bg-stone-200/70"
            />
          ))}
        </div>
      ) : empty ? (
        <div className="flex items-center gap-3 rounded-2xl border border-dashed border-orange-200 bg-orange-50/40 px-5 py-8 text-stone-500 dark:border-stone-700 dark:bg-stone-800/40 dark:text-stone-400">
          <ChefHat size={20} className="text-orange-400 dark:text-orange-500" />
          <p className="text-sm">{emptyMessage}</p>
        </div>
      ) : scrollable ? (
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
        >
          {children}
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">{children}</div>
      )}
    </section>
  );
}

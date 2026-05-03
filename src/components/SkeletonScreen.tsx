import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

type SkeletonProps = {
  className?: string;
  style?: CSSProperties;
};

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('skeleton-shimmer rounded-lg bg-stone-200/80 dark:bg-stone-800/80', className)}
      style={style}
    />
  );
}

const repeat = (count: number) => Array.from({ length: count }, (_, index) => index);

export function ContentSkeleton() {
  return (
    <div
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      role="status"
      aria-label="Loading content"
    >
      <div className="mb-8 space-y-3">
        <Skeleton className="h-10 w-56 sm:w-72" />
        <Skeleton className="h-5 w-full max-w-md" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-3">
          <section className="space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
          </section>
          <section className="space-y-4">
            <Skeleton className="h-4 w-32" />
            {[0, 1].map((item) => (
              <div key={item} className="space-y-3">
                <Skeleton className="aspect-[16/9] w-full rounded-none" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </section>
        </div>

        <div className="space-y-6 lg:col-span-6">
          <Skeleton className="aspect-square w-full rounded-[2.5rem] md:aspect-[4/3]" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Skeleton className="h-36 rounded-none" />
            <Skeleton className="h-36 rounded-none" />
          </div>
        </div>

        <div className="space-y-6 lg:col-span-3">
          <Skeleton className="h-64 rounded-none" />
          <Skeleton className="h-64 rounded-none" />
          <Skeleton className="h-28 rounded-none" />
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div
      className="w-full h-full pb-12 pt-6"
      role="status"
      aria-label="Loading dashboard"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        <div className="space-y-8 lg:col-span-3">
          <section>
            <Skeleton className="mb-4 h-3 w-24" />
            <div className="space-y-3">
              <Skeleton className="h-[58px] w-full rounded-2xl" />
              <Skeleton className="h-[58px] w-full rounded-2xl" />
            </div>
          </section>

          <section>
            <Skeleton className="mb-4 h-3 w-28" />
            <div className="space-y-6">
              {repeat(2).map((item) => (
                <div key={item}>
                  <Skeleton className="mb-3 aspect-[16/9] w-full rounded-none" />
                  <Skeleton className="mb-2 h-4 w-5/6" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6 lg:col-span-6">
          <Skeleton className="aspect-square w-full rounded-[2.5rem] shadow-xl md:aspect-[4/3]" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {repeat(2).map((item) => (
              <div key={item} className="bg-stone-100 p-8 rounded-none dark:bg-stone-900">
                <Skeleton className="mb-4 h-5 w-24 rounded-none" />
                <Skeleton className="mb-3 h-4 w-full rounded-none" />
                <Skeleton className="mb-6 h-4 w-3/4 rounded-none" />
                <Skeleton className="h-3 w-24 rounded-none" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6 lg:col-span-3">
          <section className="rounded-none border border-stone-200 bg-stone-50 p-6 dark:border-stone-800 dark:bg-stone-950">
            <div className="mb-6 flex items-center justify-between">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="size-4" />
            </div>
            <div className="mb-6 space-y-4">
              {repeat(3).map((item) => (
                <div key={item} className="border-b border-stone-200 pb-4 last:border-b-0 dark:border-stone-800">
                  <Skeleton className="mb-2 h-2 w-16 rounded-none" />
                  <Skeleton className="h-4 w-5/6 rounded-none" />
                </div>
              ))}
            </div>
            <Skeleton className="h-12 w-full rounded-none" />
          </section>

          <section className="rounded-none bg-[#0a0a0a] p-8">
            <div className="mb-6 flex flex-col items-center gap-4">
              <Skeleton className="size-10 rounded-none bg-white/20" />
              <div className="space-y-2">
                <Skeleton className="mx-auto h-4 w-28 bg-white/20" />
                <Skeleton className="mx-auto h-4 w-20 bg-white/20" />
              </div>
            </div>
            <Skeleton className="mx-auto mb-3 h-3 w-full bg-white/10" />
            <Skeleton className="mx-auto mb-6 h-3 w-4/5 bg-white/10" />
            <Skeleton className="mb-6 h-20 w-full rounded-none bg-white/10" />
            <Skeleton className="h-12 w-full rounded-none bg-white/20" />
          </section>

          <section className="rounded-none bg-stone-100 p-6 dark:bg-stone-900">
            <Skeleton className="mb-4 h-3 w-24" />
            <div className="flex divide-x divide-stone-300 dark:divide-stone-700">
              <div className="flex-1 px-2">
                <Skeleton className="mx-auto mb-2 h-8 w-12" />
                <Skeleton className="mx-auto h-3 w-20" />
              </div>
              <div className="flex-1 px-2">
                <Skeleton className="mx-auto mb-2 h-8 w-12" />
                <Skeleton className="mx-auto h-3 w-16" />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export function SearchPageSkeleton() {
  return (
    <div
      className="w-full max-w-5xl mx-auto py-8"
      role="status"
      aria-label="Loading search"
    >
      <div className="mb-12 space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-14 w-full max-w-xl" />
          <Skeleton className="h-14 w-full max-w-lg" />
          <Skeleton className="h-5 w-full max-w-2xl" />
        </div>
        <div className="space-y-2 pt-4">
          <Skeleton className="h-3 w-40" />
          <div className="flex flex-col shadow-sm sm:flex-row">
            <Skeleton className="h-[74px] flex-1 rounded-none" />
            <Skeleton className="h-[74px] w-full rounded-none sm:w-48" />
          </div>
        </div>
      </div>

      <div className="mb-16">
        <Skeleton className="mb-6 h-3 w-48 rounded-none" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {repeat(3).map((item) => (
            <div key={item} className="flex min-h-[240px] flex-col justify-between bg-stone-100 p-8 dark:bg-stone-900">
              <Skeleton className="size-10 rounded-none" />
              <div>
                <Skeleton className="mb-3 h-6 w-4/5 rounded-none" />
                <Skeleton className="h-4 w-full rounded-none" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <SearchResultsSkeleton />
    </div>
  );
}

export function SearchResultsSkeleton() {
  return (
    <div role="status" aria-label="Loading recipe results">
      <div className="mb-8 flex flex-col justify-between gap-4 border-b border-stone-200 pb-2 sm:flex-row sm:items-center dark:border-stone-800">
        <Skeleton className="h-3 w-56 rounded-none" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-32 rounded-none" />
          <Skeleton className="h-8 w-28 rounded-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {repeat(4).map((item) => (
          <div key={item} className="flex flex-col">
            <Skeleton className="mb-4 aspect-square w-full rounded-none" />
            <Skeleton className="mb-2 h-5 w-5/6 rounded-none" />
            <Skeleton className="mb-2 h-5 w-3/5 rounded-none" />
            <Skeleton className="h-4 w-4/5 rounded-none" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MealPlannerPageSkeleton() {
  return (
    <div
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex flex-col xl:flex-row gap-8 items-start"
      role="status"
      aria-label="Loading meal planner"
    >
      <div className="w-full flex-1 space-y-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-3">
            <Skeleton className="h-12 w-72 max-w-full" />
            <Skeleton className="h-5 w-64 max-w-full" />
          </div>
          <Skeleton className="h-14 w-48 rounded-full" />
        </div>

        <div className="flex flex-col justify-between gap-4 rounded-[2rem] border border-stone-100 bg-white p-4 shadow-xl shadow-stone-200/50 sm:flex-row sm:items-center sm:p-6 dark:border-stone-800 dark:bg-stone-900 dark:shadow-black/30">
          <div className="flex items-center gap-4">
            <Skeleton className="size-12 rounded-full" />
            <Skeleton className="h-8 w-52" />
            <Skeleton className="size-12 rounded-full" />
          </div>
          <Skeleton className="h-12 w-32 rounded-full" />
        </div>

        <div className="overflow-x-auto pb-4 scrollbar-hide">
          <div className="grid min-w-[800px] grid-cols-7 gap-4">
            {repeat(7).map((day) => (
              <div key={day} className="space-y-4">
                <Skeleton className="h-[90px] w-full rounded-[1.5rem]" />
                <div className="space-y-3">
                  {repeat(3).map((slot) => (
                    <Skeleton key={slot} className="min-h-[120px] w-full rounded-2xl" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <aside className="flex w-full shrink-0 flex-col gap-6 xl:w-96">
        <div className="rounded-[2.5rem] bg-gradient-to-b from-stone-900 to-stone-800 p-8 text-white shadow-xl shadow-stone-200/50 dark:shadow-black/30">
          <Skeleton className="mb-3 h-7 w-48 bg-white/20" />
          <Skeleton className="mb-6 h-4 w-56 bg-white/10" />
          <div className="flex items-center justify-between rounded-2xl bg-white/10 p-4">
            <div className="space-y-2">
              <Skeleton className="h-9 w-12 bg-white/20" />
              <Skeleton className="h-3 w-24 bg-white/10" />
            </div>
            <Skeleton className="h-11 w-24 rounded-xl bg-white/20" />
          </div>
        </div>

        <div className="rounded-[2.5rem] border border-stone-100 bg-white p-6 shadow-lg shadow-stone-200/30 md:p-8 dark:border-stone-800 dark:bg-stone-900 dark:shadow-black/30">
          <div className="space-y-8">
            {repeat(3).map((section) => (
              <section key={section}>
                <Skeleton className="mb-4 h-3 w-24" />
                <div className="space-y-3">
                  {repeat(2).map((item) => (
                    <div key={item} className="flex items-center justify-between p-2">
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-6 rounded-lg" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                      <Skeleton className="h-6 w-14 rounded-md" />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

export function AICameraPageSkeleton() {
  return (
    <div
      className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
      role="status"
      aria-label="Loading AI camera"
    >
      <div className="mb-12 space-y-4 text-center">
        <Skeleton className="mx-auto h-9 w-48 rounded-full" />
        <Skeleton className="mx-auto h-12 w-full max-w-md" />
        <Skeleton className="mx-auto h-5 w-full max-w-2xl" />
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 items-start">
        <Skeleton className="aspect-[4/5] w-full rounded-[2.5rem] shadow-xl sm:aspect-square" />
        <CameraAnalysisSkeleton />
      </div>
    </div>
  );
}

export function CameraAnalysisSkeleton() {
  return (
    <div
      className="h-full min-h-[400px] rounded-[2.5rem] border border-stone-100 bg-white p-8 shadow-lg dark:border-stone-800 dark:bg-stone-900"
      role="status"
      aria-label="Loading camera analysis"
    >
      <div className="mb-8 flex items-center gap-3">
        <Skeleton className="size-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56 max-w-full" />
        </div>
      </div>

      <div className="space-y-8">
        <div>
          <Skeleton className="mb-3 h-3 w-36" />
          <Skeleton className="h-9 w-4/5" />
        </div>
        <div>
          <Skeleton className="mb-3 h-3 w-44" />
          <div className="flex flex-wrap gap-2">
            {repeat(5).map((item) => (
              <Skeleton key={item} className="h-9 w-24 rounded-xl" />
            ))}
          </div>
        </div>
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-[2rem]" />
      </div>
    </div>
  );
}

export function NotificationsPageSkeleton() {
  return (
    <div
      className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
      role="status"
      aria-label="Loading notifications"
    >
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-44" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-36 rounded-full" />
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>
      </div>

      <div className="space-y-8">
        <div className="flex w-full gap-2 overflow-hidden rounded-full border border-stone-100 bg-white p-1.5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          {repeat(6).map((item) => (
            <Skeleton key={item} className="h-10 min-w-28 flex-1 rounded-full" />
          ))}
        </div>

        <div className="space-y-4">
          {repeat(5).map((item) => (
            <div
              key={item}
              className="flex flex-col gap-6 rounded-[2rem] border border-stone-100 bg-white p-6 sm:flex-row dark:border-stone-800 dark:bg-stone-900"
            >
              <Skeleton className="size-14 shrink-0 rounded-2xl" />
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <Skeleton className="h-5 w-48 max-w-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <div className="flex gap-6 pt-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
              <div className="flex items-end justify-end sm:w-8">
                <Skeleton className="size-8 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AIChatMessagesSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading AI chat response">
      <div className="flex justify-start">
        <div className="max-w-[80%] space-y-2 rounded-2xl rounded-tl-none bg-stone-100 p-3 dark:bg-stone-800">
          <Skeleton className="h-3 w-44" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    </div>
  );
}

export function ProfilePageSkeleton() {
  return (
    <div
      className="w-full max-w-5xl mx-auto py-8 animate-fade-up"
      role="status"
      aria-label="Loading profile"
    >
      {/* Page title */}
      <Skeleton className="mb-8 h-9 w-64" />

      {/* Profile header card */}
      <div className="relative mb-8 flex flex-col items-center gap-8 overflow-hidden rounded-[2rem] border border-orange-100 bg-white p-8 shadow-xl shadow-orange-100/60 sm:flex-row sm:items-start dark:border-stone-700 dark:bg-stone-800 dark:shadow-none">
        <div className="absolute right-0 top-0 -z-10 h-full w-1/2 -skew-x-12 translate-x-10 bg-orange-50 dark:bg-stone-700/30" />
        <Skeleton className="size-32 shrink-0 rounded-[2rem]" />
        <div className="flex w-full flex-1 flex-col items-center gap-6 sm:items-start">
          <div className="space-y-3 text-center sm:text-left w-full">
            <Skeleton className="mx-auto h-10 w-64 max-w-full sm:mx-0" />
            <Skeleton className="mx-auto h-5 w-56 max-w-full sm:mx-0" />
          </div>
          <div className="flex justify-center gap-8 sm:justify-start">
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-12" />
            </div>
          </div>
        </div>
      </div>

      {/* Main grid: sidebar + content */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
        {/* Sidebar */}
        <div className="space-y-1 md:col-span-3">
          <Skeleton className="mb-4 ml-4 h-3 w-20" />
          <Skeleton className="h-[48px] w-full rounded-2xl" />
          <Skeleton className="h-[48px] w-full rounded-2xl" />
        </div>

        {/* Content panel */}
        <div className="rounded-[2rem] border border-orange-100 bg-white p-8 shadow-lg shadow-orange-100/50 md:col-span-9 dark:border-stone-700 dark:bg-stone-800 dark:shadow-none">
          <div className="space-y-10">
            {/* Section title */}
            <div className="space-y-3">
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-5 w-80 max-w-full" />
            </div>

            {/* Profile Details section */}
            <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-6 space-y-4 dark:border-stone-700 dark:bg-stone-800/30">
              <Skeleton className="h-4 w-32" />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-[100px] w-full rounded-lg" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <div className="grid gap-2 sm:grid-cols-3">
                  {repeat(3).map((item) => (
                    <Skeleton key={item} className="h-11 w-full rounded-xl" />
                  ))}
                </div>
              </div>
            </div>

            {/* Security section */}
            <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-6 space-y-4 dark:border-stone-700 dark:bg-stone-800/30">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-14" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-56 max-w-full" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-36" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-end gap-4 border-t border-orange-100 pt-6 dark:border-stone-700">
              <Skeleton className="h-10 w-36 rounded-lg" />
              <Skeleton className="h-12 w-40 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SettingsPageSkeleton() {
  return (
    <div
      className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
      role="status"
      aria-label="Loading settings"
    >
      <div className="mb-12 space-y-3">
        <Skeleton className="h-12 w-52" />
        <Skeleton className="h-5 w-72 max-w-full" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {repeat(4).map((item) => (
          <div
            key={item}
            className="h-full overflow-hidden rounded-[2rem] border border-stone-100 bg-white shadow-xl shadow-stone-200/30 dark:border-stone-800 dark:bg-stone-900 dark:shadow-black/30"
          >
            <div className="p-8">
              <div className="mb-8 flex items-start justify-between">
                <Skeleton className="size-16 rounded-2xl" />
                <Skeleton className="size-6 rounded-full" />
              </div>
              <Skeleton className="mb-3 h-6 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-4/5" />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 flex flex-col items-center gap-4">
        <Skeleton className="h-14 w-52 rounded-full" />
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>
    </div>
  );
}

export function AuthPageSkeleton() {
  return (
    <div
      className="min-h-screen bg-stone-50 px-4 py-8 sm:px-8"
      role="status"
      aria-label="Loading page"
    >
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-8 lg:grid-cols-[1fr_440px] lg:items-center">
        <div className="hidden h-[72vh] overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-stone-200/40 lg:block">
          <Skeleton className="h-full w-full rounded-[2rem]" />
        </div>
        <div className="rounded-[2rem] border border-stone-100 bg-white p-6 shadow-xl shadow-stone-200/40 sm:p-8">
          <div className="mb-8 space-y-3">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SettingsDetailSkeleton() {
  return (
    <div
      className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12"
      role="status"
      aria-label="Loading settings"
    >
      <div className="mb-8 space-y-3">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-12 w-72 max-w-full" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {[0, 1, 2].map((section) => (
            <section
              key={section}
              className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/40 sm:p-6"
            >
              <div className="mb-6 flex items-start gap-3">
                <Skeleton className="size-11 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-44" />
                  <Skeleton className="h-4 w-full max-w-md" />
                </div>
              </div>
              <div className="grid gap-5">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                {section === 0 && <Skeleton className="h-28 w-full" />}
              </div>
            </section>
          ))}
        </div>

        <aside className="h-fit rounded-lg border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/40">
          <div className="flex items-center gap-4 border-b border-stone-100 pb-5">
            <Skeleton className="size-16" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
          <Skeleton className="my-5 h-24 w-full" />
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        </aside>
      </div>
    </div>
  );
}

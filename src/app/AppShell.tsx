import { Suspense } from 'react';
import { WifiOff } from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { InstallPrompt } from '@/components/InstallPrompt';
import { Layout, LayoutShellContext } from '@/components/Layout';
import { AuthPageSkeleton, ContentSkeleton } from '@/components/SkeletonScreen';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

const SHELLLESS_PATHS = new Set(['/onboarding', '/login', '/signup']);

function OfflineBanner() {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[130] flex justify-center px-4"
      role="status"
    >
      <div className="inline-flex items-center gap-2 rounded-full bg-stone-900/95 px-4 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur">
        <WifiOff size={14} />
        Offline mode: some live features may be unavailable.
      </div>
    </div>
  );
}

function ShellBottomNav() {
  // Existing pages already own their navigation chrome through Layout.
  // Leaving the shell-level bottom nav dormant avoids a second visible nav bar.
  return null;
}

export default function AppShell() {
  const isOnline = useOnlineStatus();
  const location = useLocation();
  const shouldUsePersistentLayout = !SHELLLESS_PATHS.has(location.pathname);

  const routeContent = (
    <Suspense fallback={shouldUsePersistentLayout ? <ContentSkeleton /> : <AuthPageSkeleton />}>
      <Outlet />
    </Suspense>
  );

  return (
    <>
      {shouldUsePersistentLayout ? (
        <Layout>
          <LayoutShellContext.Provider value={true}>
            {routeContent}
          </LayoutShellContext.Provider>
        </Layout>
      ) : (
        <>
          <header className="sr-only">
            <Link to="/">CookMate</Link>
          </header>
          {routeContent}
        </>
      )}

      {!isOnline && <OfflineBanner />}
      {shouldUsePersistentLayout && <InstallPrompt />}
      <ShellBottomNav />
    </>
  );
}

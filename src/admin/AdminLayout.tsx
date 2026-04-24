import { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopbar } from './AdminTopbar';

function AdminRouteLoader() {
  return (
    <div className="flex min-h-[320px] items-center justify-center">
      <div className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-bold text-stone-500 shadow-sm">
        Loading admin section...
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-stone-50 font-sans text-stone-900">
      <div className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-stone-200 lg:block">
        <AdminSidebar />
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close admin navigation"
              className="fixed inset-0 z-40 bg-stone-950/30 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-72 border-r border-stone-200 shadow-2xl lg:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 240 }}
            >
              <div className="absolute right-3 top-3 z-10">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full bg-stone-200 text-stone-600 hover:bg-stone-300"
                  aria-label="Close admin navigation"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X size={18} />
                </Button>
              </div>
              <AdminSidebar onNavigate={() => setMobileMenuOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-h-screen flex-1 flex-col lg:pl-72">
        <AdminTopbar onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-7xl">
            <Suspense fallback={<AdminRouteLoader />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}

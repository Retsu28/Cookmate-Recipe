import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PWAUpdatePromptProps {
  onUpdate: () => void;
  onDismiss: () => void;
}

function PWAUpdateToast({ onUpdate, onDismiss }: PWAUpdatePromptProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 80 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 80 }}
      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
      className="fixed bottom-6 left-1/2 z-[200] flex w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 items-center gap-3 rounded-2xl border border-orange-200 bg-white px-4 py-3 shadow-xl shadow-orange-100/60 dark:border-stone-700 dark:bg-stone-900 dark:shadow-none"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
        <RefreshCw size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-stone-900 dark:text-stone-100">Update available</p>
        <p className="text-xs text-stone-500 dark:text-stone-400">Reload to get the latest version.</p>
      </div>
      <button
        onClick={onUpdate}
        className="shrink-0 rounded-full bg-orange-500 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-white transition-colors hover:bg-orange-600"
      >
        Reload
      </button>
      <button
        onClick={onDismiss}
        aria-label="Dismiss update prompt"
        className="shrink-0 text-stone-400 transition-colors hover:text-stone-600 dark:hover:text-stone-300"
      >
        <X size={15} />
      </button>
    </motion.div>
  );
}

export function PWAUpdatePrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = () => setShow(true);
    window.addEventListener('pwa:update-available', handler);
    return () => window.removeEventListener('pwa:update-available', handler);
  }, []);

  const handleUpdate = () => {
    window.dispatchEvent(new Event('pwa:do-update'));
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <PWAUpdateToast
          onUpdate={handleUpdate}
          onDismiss={() => setShow(false)}
        />
      )}
    </AnimatePresence>
  );
}

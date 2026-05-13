import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  tone?: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  tone = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  useEffect(() => {
    if (open) {
      setTimeout(() => cancelRef.current?.focus(), 50);
    }
  }, [open]);

  const isDanger = tone === 'danger';

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[200] bg-stone-950/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
          />
          <div className="pointer-events-none fixed inset-0 z-[210] flex items-center justify-center p-4">
            <motion.div
              className="pointer-events-auto w-full max-w-md rounded-[2rem] border border-stone-100 bg-white p-6 shadow-2xl shadow-stone-950/20"
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-dialog-title"
            >
              <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${isDanger ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                {isDanger ? <Trash2 size={22} /> : <AlertTriangle size={22} />}
              </div>
              <h2 id="confirm-dialog-title" className="text-lg font-extrabold tracking-tight text-stone-900">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-500">{description}</p>
              <div className="mt-6 flex justify-end gap-3">
                <Button
                  ref={cancelRef}
                  variant="outline"
                  className="rounded-full border-stone-200 px-5 font-bold text-stone-700"
                  onClick={onCancel}
                >
                  Cancel
                </Button>
                <Button
                  className={`rounded-full px-5 font-bold text-white ${isDanger ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'}`}
                  onClick={onConfirm}
                >
                  {confirmLabel}
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

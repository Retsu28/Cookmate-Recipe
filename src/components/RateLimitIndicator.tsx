import { AlertTriangle, Lock, Timer } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCountdown } from '@/hooks/useRateLimit';
import type { RateLimitInfo } from '@/hooks/useRateLimit';

interface RateLimitIndicatorProps {
  rateLimit: RateLimitInfo | null;
  countdown: number;
}

export function RateLimitIndicator({ rateLimit, countdown }: RateLimitIndicatorProps) {
  if (!rateLimit) return null;

  // Account is locked - show lockout timer
  if (rateLimit.locked) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -10, height: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 overflow-hidden"
        >
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 shrink-0">
              <Lock className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800">
                Account temporarily locked
              </p>
              <p className="text-xs text-red-600 mt-1">
                Too many failed attempts. Please wait before trying again.
              </p>
              <div className="mt-3 flex items-center gap-2 text-sm font-bold text-red-700">
                <Timer className="w-4 h-4" />
                <span>Retry in: {formatCountdown(countdown)}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Warning state - 3 or fewer attempts remaining
  if (rateLimit.warning && rateLimit.attemptsRemaining > 0) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -10, height: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 overflow-hidden"
        >
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">
                Warning: {rateLimit.attemptsRemaining} attempt{rateLimit.attemptsRemaining !== 1 ? 's' : ''} remaining
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Your account will be temporarily locked after {rateLimit.maxAttempts} failed attempts.
              </p>
              <div className="mt-2 flex gap-1">
                {Array.from({ length: rateLimit.maxAttempts }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 w-4 rounded-full ${
                      i < rateLimit.currentAttempts
                        ? 'bg-red-400'
                        : i < rateLimit.currentAttempts + rateLimit.attemptsRemaining
                        ? 'bg-amber-400'
                        : 'bg-stone-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Normal state - show remaining attempts subtly
  if (rateLimit.attemptsRemaining > 0 && rateLimit.attemptsRemaining < rateLimit.maxAttempts) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center justify-between text-xs text-stone-500"
        >
          <span>Failed attempts: {rateLimit.currentAttempts} / {rateLimit.maxAttempts}</span>
          <div className="flex gap-0.5">
            {Array.from({ length: Math.min(rateLimit.currentAttempts, 5) }).map((_, i) => (
              <div key={i} className="h-1 w-1 rounded-full bg-orange-400" />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return null;
}

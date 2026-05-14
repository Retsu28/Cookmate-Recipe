import { useRef, useState } from 'react';
import { ShieldOff, AlertCircle, X } from 'lucide-react';
import { mfaService } from '@/services/mfaService';

interface MFADisableModalProps {
  onClose: () => void;
  onDisabled: () => void;
}

export default function MFADisableModal({ onClose, onDisabled }: MFADisableModalProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleConfirm = async () => {
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setError('Please enter a valid 6-digit code.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await mfaService.disable(trimmed);
      onDisabled();
    } catch (err) {
      setError((err as Error)?.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length === 6) handleConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-sm bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-700 overflow-hidden">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-start gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-950/30 text-red-500">
                <ShieldOff className="size-6" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-stone-900 dark:text-stone-100">Disable MFA</h2>
                <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5 leading-relaxed">
                  Enter your authenticator code to confirm.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Code input */}
          <div className="mb-4">
            <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">
              6-Digit Code
            </label>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(v);
                if (error) setError(null);
              }}
              onKeyDown={handleKeyDown}
              autoFocus
              placeholder="000000"
              className={`w-full h-14 text-center text-3xl font-bold tracking-[1em] rounded-2xl border-2 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none transition-colors ${
                error
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-stone-200 dark:border-stone-700 focus:border-orange-400'
              }`}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 mb-4">
              <AlertCircle className="size-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 h-11 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold text-sm hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading || code.length < 6}
              className="flex-1 h-11 rounded-2xl bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Disable MFA'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

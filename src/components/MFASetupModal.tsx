import { useState, useEffect, useRef } from 'react';
import { QrCode, Key, CheckCircle2, Copy, Check, ShieldCheck, X, AlertCircle, ChevronLeft } from 'lucide-react';
import { mfaService } from '@/services/mfaService';
import type { MfaSetupData } from '@/services/mfaService';

interface MFASetupModalProps {
  onClose: () => void;
  onEnabled: () => void;
}

type Step = 'setup' | 'verify' | 'done';

export default function MFASetupModal({ onClose, onEnabled }: MFASetupModalProps) {
  const [step, setStep] = useState<Step>('setup');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupData, setSetupData] = useState<MfaSetupData | null>(null);
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSetup();
  }, []);

  useEffect(() => {
    if (step === 'verify') {
      setTimeout(() => codeInputRef.current?.focus(), 100);
    }
  }, [step]);

  const loadSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await mfaService.setup();
      setSetupData(data);
    } catch (err) {
      setError((err as Error)?.message || 'Failed to generate QR code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopySecret = async () => {
    if (!setupData?.secret) return;
    try {
      await navigator.clipboard.writeText(setupData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const handleConfirm = async () => {
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setError('Please enter a valid 6-digit code.');
      return;
    }
    if (!setupData?.secret) {
      setError('Setup data missing. Please close and try again.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await mfaService.enable(setupData.secret, trimmed);
      setStep('done');
    } catch (err) {
      setError((err as Error)?.message || 'Invalid code. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length === 6) handleConfirm();
  };

  const handleDone = () => {
    onEnabled();
    onClose();
  };

  const STEPS: Step[] = ['setup', 'verify', 'done'];
  const stepIdx = STEPS.indexOf(step);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-3">
            {step !== 'done' && (
              <button
                onClick={step === 'setup' ? onClose : () => { setCode(''); setError(null); setStep('setup'); }}
                className="flex items-center justify-center w-8 h-8 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                aria-label="Back"
              >
                {step === 'setup' ? <X className="size-4" /> : <ChevronLeft className="size-4" />}
              </button>
            )}
            <div>
              <h2 className="text-base font-extrabold text-stone-900 dark:text-stone-100">
                {step === 'setup' && 'Set Up Authenticator'}
                {step === 'verify' && 'Confirm Your Code'}
                {step === 'done' && 'MFA Enabled!'}
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Two-Factor Authentication
              </p>
            </div>
          </div>

          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`w-2 h-2 rounded-full transition-colors ${
                  stepIdx >= i ? 'bg-orange-500' : 'bg-stone-200 dark:bg-stone-700'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-stone-500">Generating secure key…</p>
            </div>
          )}

          {/* Step: Setup — QR Code */}
          {!loading && step === 'setup' && setupData && (
            <div className="space-y-5">
              <div className="flex justify-center p-4 bg-white rounded-2xl border border-stone-200 dark:border-stone-700">
                <img
                  src={setupData.qrCode}
                  alt="MFA QR Code"
                  className="w-48 h-48"
                />
              </div>

              <p className="text-sm text-stone-600 dark:text-stone-400 text-center leading-relaxed">
                Scan this QR code with <strong>Google Authenticator</strong>, <strong>Authy</strong>, or <strong>Microsoft Authenticator</strong>.
              </p>

              <div>
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Or enter manually</p>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                  <code className="flex-1 text-xs font-mono text-stone-700 dark:text-stone-300 break-all select-all leading-relaxed">
                    {setupData.secret}
                  </code>
                  <button
                    onClick={handleCopySecret}
                    className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-950/40 text-orange-600 hover:bg-orange-200 transition-colors"
                    title={copied ? 'Copied!' : 'Copy secret'}
                  >
                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  </button>
                </div>
                {copied && <p className="text-xs text-orange-500 font-semibold mt-1">Copied to clipboard!</p>}
              </div>

              <button
                onClick={() => { setCode(''); setError(null); setStep('verify'); }}
                className="w-full h-12 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-colors"
              >
                I've Scanned the QR Code →
              </button>
            </div>
          )}

          {/* Step: Verify — confirm code */}
          {step === 'verify' && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-100 dark:bg-orange-950/30">
                  <Key className="size-8 text-orange-500" />
                </div>
              </div>
              <p className="text-sm text-stone-600 dark:text-stone-400 text-center leading-relaxed">
                Enter the 6-digit code from your authenticator app to confirm and activate MFA.
              </p>

              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">
                  Verification Code
                </label>
                <input
                  ref={codeInputRef}
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
                  placeholder="000000"
                  className={`w-full h-14 text-center text-3xl font-bold tracking-[1em] rounded-2xl border-2 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none transition-colors ${
                    error
                      ? 'border-red-400 focus:border-red-500'
                      : 'border-stone-200 dark:border-stone-700 focus:border-orange-400'
                  }`}
                  disabled={saving}
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50">
                  <AlertCircle className="size-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              <button
                onClick={handleConfirm}
                disabled={saving || code.length < 6}
                className="w-full h-12 rounded-2xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Activate MFA'
                )}
              </button>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && (
            <div className="space-y-5">
              <div className="flex justify-center">
                <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-950/30">
                  <CheckCircle2 className="size-10 text-green-500" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-extrabold text-stone-900 dark:text-stone-100 mb-2">MFA Enabled!</h3>
                <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                  Your account is now protected with Two-Factor Authentication. You'll need your authenticator app at every sign-in.
                </p>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/50">
                <ShieldCheck className="size-5 text-orange-500 shrink-0 mt-0.5" />
                <p className="text-sm text-orange-700 dark:text-orange-300 leading-relaxed">
                  Keep your authenticator app installed. You can always disable MFA from Privacy & Security settings.
                </p>
              </div>
              <button
                onClick={handleDone}
                className="w-full h-12 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-colors"
              >
                Done
              </button>
            </div>
          )}

          {/* Error on load */}
          {!loading && !setupData && error && step === 'setup' && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50">
                <AlertCircle className="size-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
              <button
                onClick={loadSetup}
                className="w-full h-12 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

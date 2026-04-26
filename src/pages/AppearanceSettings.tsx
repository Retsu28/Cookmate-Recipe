import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Check, Moon, Paintbrush, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Layout } from '@/components/Layout';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';

const sectionVariants = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 + i * 0.07, duration: 0.36, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const themeOptions = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
];

export default function AppearanceSettings() {
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = mounted ? resolvedTheme || 'light' : 'light';

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12"
      >
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="mb-5 inline-flex items-center gap-2 rounded-lg px-1 py-2 text-sm font-bold text-stone-500 transition-colors hover:text-stone-900"
            >
              <ArrowLeft className="size-4" />
              Settings
            </button>
            <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 md:text-5xl">
              Appearance settings
            </h1>
            <p className="mt-2 max-w-2xl text-base font-medium text-stone-500 md:text-lg">
              Choose how CookMate looks while keeping the same layout.
            </p>
          </motion.div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <motion.section
              custom={0}
              variants={sectionVariants}
              initial="hidden"
              animate="show"
              className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/40 sm:p-6"
            >
              <div className="mb-6 flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                  <Paintbrush className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-stone-900">Theme</h2>
                  <p className="text-sm font-medium text-stone-500">
                    Switch between light and dark mode.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {themeOptions.map((option) => {
                  const Icon = option.icon;
                  const active = currentTheme === option.id;

                  return (
                    <motion.button
                      key={option.id}
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setTheme(option.id)}
                      className={`flex h-20 items-center justify-between rounded-lg border px-4 text-left transition-all ${
                        active
                          ? 'border-orange-500 bg-orange-500 text-white shadow-sm'
                          : 'border-stone-200 bg-white text-stone-700 hover:border-orange-300 hover:text-stone-900'
                      }`}
                      aria-pressed={active}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={`flex size-10 items-center justify-center rounded-lg ${
                            active ? 'bg-white/10 text-white' : 'bg-stone-50 text-stone-600'
                          }`}
                        >
                          <Icon className="size-5" />
                        </span>
                        <span className="text-base font-extrabold">{option.label}</span>
                      </span>
                      {active && <Check className="size-5" />}
                    </motion.button>
                  );
                })}
              </div>
            </motion.section>

            <motion.section
              custom={1}
              variants={sectionVariants}
              initial="hidden"
              animate="show"
              className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/40 sm:p-6"
            >
              <div className="mb-6 flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-800">
                  <Sun className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-stone-900">Preview</h2>
                  <p className="text-sm font-medium text-stone-500">
                    Your selection is applied across the web app immediately.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
                <div className="rounded-lg bg-white p-4 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-extrabold text-stone-900">Recipe workspace</p>
                      <p className="text-xs font-semibold text-stone-500">Theme preview</p>
                    </div>
                    <ThemeToggle className="size-10" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="h-16 rounded-lg bg-orange-50" />
                    <div className="h-16 rounded-lg bg-stone-100" />
                    <div className="h-16 rounded-lg orange-gradient" />
                  </div>
                </div>
              </div>
            </motion.section>
          </div>

          <motion.aside
            custom={2}
            variants={sectionVariants}
            initial="hidden"
            animate="show"
            className="h-fit rounded-lg border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/40 lg:sticky lg:top-8"
          >
            <div className="mb-5 flex items-center gap-3 border-b border-stone-100 pb-5">
              <div className="flex size-12 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                <Paintbrush className="size-5" />
              </div>
              <div>
                <p className="text-base font-extrabold text-stone-900">
                  {currentTheme === 'dark' ? 'Dark mode' : 'Light mode'}
                </p>
                <p className="text-sm font-medium text-stone-500">Current appearance</p>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                type="button"
                onClick={() => navigate('/settings')}
                className="h-12 w-full rounded-lg bg-orange-500 text-base font-bold text-white hover:bg-orange-600"
              >
                Done
              </Button>
              <Link
                to="/settings"
                className="flex h-11 w-full items-center justify-center rounded-lg text-sm font-bold text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-900"
              >
                Back to settings
              </Link>
            </div>
          </motion.aside>
        </div>
      </motion.div>
    </Layout>
  );
}

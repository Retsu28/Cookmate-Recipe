import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronRight, ChevronLeft, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import profileService from '@/services/profileService';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Step definitions                                                   */
/* ------------------------------------------------------------------ */

const STEPS = [
  {
    id: 'welcome',
    emoji: '👨‍🍳',
    emojiLabel: 'Chef',
    bg: 'from-orange-400 to-amber-400',
    title: 'Welcome to CookMate',
    description: 'Your personal AI-powered sous-chef. Discover, cook, and master Filipino and world recipes with ease.',
    cta: 'Get Started',
    skippable: true,
  },
  {
    id: 'discover',
    emoji: '🔍',
    emojiLabel: 'Search',
    bg: 'from-amber-400 to-yellow-400',
    title: 'Find Your Next Meal',
    description: 'Browse hundreds of recipes or search for exactly what you are craving — filtered by category, difficulty, and time.',
    cta: 'Next',
    skippable: true,
  },
  {
    id: 'planner',
    emoji: '📅',
    emojiLabel: 'Planner',
    bg: 'from-orange-500 to-rose-400',
    title: 'Plan Your Week',
    description: 'Add recipes to your weekly meal planner, generate a grocery list, and never wonder "what\'s for dinner?" again.',
    cta: 'Next',
    skippable: true,
  },
  {
    id: 'ai-camera',
    emoji: '📷',
    emojiLabel: 'Camera',
    bg: 'from-violet-400 to-purple-500',
    title: 'Scan Your Ingredients',
    description: 'Point your camera at your fridge — our AI identifies ingredients and instantly suggests recipes you can make right now.',
    cta: 'Next',
    skippable: true,
  },
  {
    id: 'skill',
    emoji: '🎓',
    emojiLabel: 'Skill',
    bg: 'from-emerald-400 to-teal-500',
    title: 'What\'s Your Cooking Level?',
    description: 'We\'ll personalise your recipe recommendations based on your skill. You can always change this in your profile.',
    cta: 'Finish',
    skippable: false,
    isSkill: true,
  },
] as const;

const SKILL_OPTIONS: { level: string; emoji: string; label: string; desc: string }[] = [
  {
    level: 'Beginner',
    emoji: '🌱',
    label: 'Beginner',
    desc: 'I\'m just starting out — keep it simple!',
  },
  {
    level: 'Intermediate',
    emoji: '🍳',
    label: 'Intermediate',
    desc: 'I can follow most recipes confidently.',
  },
  {
    level: 'Advanced',
    emoji: '⭐',
    label: 'Advanced',
    desc: 'I love complex techniques and challenges.',
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [skillLevel, setSkillLevel] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('hasSeenOnboarding') === 'true') {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const isSkillStep = 'isSkill' in step && step.isSkill;

  /* ---------------------------------------------------------------- */
  /*  Navigation                                                       */
  /* ---------------------------------------------------------------- */

  const goNext = useCallback(async () => {
    if (isLast) {
      await finish();
      return;
    }
    setDirection(1);
    setStepIndex((i) => i + 1);
  }, [isLast, skillLevel, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const goBack = useCallback(() => {
    if (stepIndex === 0) return;
    setDirection(-1);
    setStepIndex((i) => i - 1);
  }, [stepIndex]);

  const skip = useCallback(async () => {
    await finish();
  }, [skillLevel, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = async () => {
    setSaving(true);
    try {
      if (skillLevel && user?.id) {
        await profileService.updateProfile(user.id, { cooking_skill_level: skillLevel });
        await refreshUser();
        localStorage.setItem('userSkillLevel', skillLevel);
      }
    } catch {
      toast.error('Could not save skill level', { description: 'You can update it anytime in your profile.' });
    } finally {
      setSaving(false);
    }
    localStorage.setItem('hasSeenOnboarding', 'true');
    navigate('/', { replace: true });
  };

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  const canProceed = !isSkillStep || skillLevel !== null;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col items-center justify-center p-4 sm:p-6">
      {/* Theme toggle — top right, always visible */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm sm:max-w-md">

        {/* Card */}
        <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-stone-900 shadow-2xl shadow-stone-900/10 dark:shadow-black/40">

          {/* Illustration area */}
          <div className={cn('relative h-52 sm:h-64 flex items-center justify-center bg-gradient-to-br', step.bg)}>
            {/* Decorative blobs */}
            <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10" />
            <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10" />

            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step.id}
                custom={direction}
                initial={{ opacity: 0, x: direction * 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -60 }}
                transition={{ duration: 0.28, ease: 'easeInOut' }}
                className="flex flex-col items-center gap-3 select-none"
              >
                <span className="text-8xl sm:text-9xl drop-shadow-lg" role="img" aria-label={step.emojiLabel}>
                  {step.emoji}
                </span>
              </motion.div>
            </AnimatePresence>

            {/* Step counter top-right */}
            <span className="absolute top-4 right-4 rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-sm">
              {stepIndex + 1} / {STEPS.length}
            </span>

            {/* Back button top-left */}
            {stepIndex > 0 && (
              <button
                onClick={goBack}
                className="absolute top-4 left-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
                aria-label="Go back"
              >
                <ChevronLeft size={18} />
              </button>
            )}
          </div>

          {/* Content area */}
          <div className="px-7 pb-8 pt-6">
            {/* Dots */}
            <div className="mb-6 flex justify-center gap-1.5">
              {STEPS.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    idx === stepIndex
                      ? 'w-6 bg-orange-500'
                      : idx < stepIndex
                      ? 'w-1.5 bg-orange-300 dark:bg-orange-700'
                      : 'w-1.5 bg-stone-200 dark:bg-stone-700',
                  )}
                />
              ))}
            </div>

            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step.id + '-text'}
                custom={direction}
                initial={{ opacity: 0, x: direction * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -40 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
              >
                <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50 text-center">
                  {step.title}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400 text-center">
                  {step.description}
                </p>

                {/* Skill picker */}
                {isSkillStep && (
                  <div className="mt-6 flex flex-col gap-3">
                    {SKILL_OPTIONS.map(({ level, emoji, label, desc }) => {
                      const selected = skillLevel === level;
                      return (
                        <button
                          key={level}
                          onClick={() => setSkillLevel(level)}
                          className={cn(
                            'flex items-center gap-4 rounded-2xl border-2 px-4 py-3.5 text-left transition-all',
                            selected
                              ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30'
                              : 'border-stone-200 dark:border-stone-700 hover:border-orange-300 dark:hover:border-orange-700 hover:bg-orange-50/40 dark:hover:bg-orange-950/10',
                          )}
                        >
                          <span className="text-3xl shrink-0">{emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              'font-bold text-sm',
                              selected ? 'text-orange-700 dark:text-orange-400' : 'text-stone-800 dark:text-stone-200',
                            )}>
                              {label}
                            </p>
                            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{desc}</p>
                          </div>
                          <div className={cn(
                            'shrink-0 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all',
                            selected
                              ? 'border-orange-500 bg-orange-500 text-white'
                              : 'border-stone-300 dark:border-stone-600',
                          )}>
                            {selected && <Check size={11} strokeWidth={3} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

              </motion.div>
            </AnimatePresence>

            {/* Actions */}
            <div className="mt-7 flex flex-col gap-2">
              <button
                onClick={goNext}
                disabled={!canProceed || saving}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-extrabold text-white uppercase tracking-widest transition-all',
                  canProceed && !saving
                    ? 'bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/25 active:scale-[0.98]'
                    : 'bg-stone-200 dark:bg-stone-800 text-stone-400 dark:text-stone-600 cursor-not-allowed',
                )}
              >
                {saving ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <>
                    {step.cta}
                    <ChevronRight size={17} />
                  </>
                )}
              </button>

              {step.skippable && (
                <button
                  onClick={skip}
                  disabled={saving}
                  className="py-2 text-sm font-medium text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
                >
                  Skip for now
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Brand footer */}
        <p className="mt-6 text-center text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-600">
          CookMate · Your AI Kitchen Companion
        </p>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from 'next-themes';
import { Flame, Clock, ChefHat, Users } from 'lucide-react';

interface StartCookingSplashProps {
  recipe: {
    title: string;
    image_url?: string | null;
    image?: string | null;
    total_time_minutes?: number | null;
    prep_time_minutes?: number | null;
    cook_time_minutes?: number | null;
    time?: string;
    difficulty?: string | null;
    servings?: number | null;
  };
  onFinished: () => void;
  minimumDuration?: number;
}

export default function StartCookingSplash({
  recipe,
  onFinished,
  minimumDuration = 2000,
}: StartCookingSplashProps) {
  const [progress, setProgress] = useState(0);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    // Animate progress bar
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2; // 2% every 40ms = ~2 seconds to fill
      });
    }, 40);

    // Auto-finish after minimum duration
    const timer = setTimeout(() => {
      onFinished();
    }, minimumDuration);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [minimumDuration, onFinished]);

  const getImageUrl = () => {
    if (recipe.image_url) return recipe.image_url;
    if (recipe.image) return recipe.image;
    return null;
  };

  const getTotalTime = () => {
    if (recipe.total_time_minutes) return `${recipe.total_time_minutes} min`;
    if (recipe.time) return recipe.time;
    if (recipe.prep_time_minutes || recipe.cook_time_minutes) {
      const total = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);
      return `${total} min`;
    }
    return '—';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className={`fixed inset-0 z-[100] flex flex-col items-center justify-center transition-colors duration-300 ${isDark ? 'bg-stone-950' : 'bg-stone-100'}`}
      >
        {/* Background Image with overlay */}
        <div className="absolute inset-0">
          {getImageUrl() ? (
            <img
              src={getImageUrl()!}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-orange-600 to-orange-800" />
          )}
          <div className={`absolute inset-0 transition-colors duration-300 ${isDark ? 'bg-black/70' : 'bg-black/40'}`} />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center px-6 text-center">
          {/* Animated Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 15,
              delay: 0.1,
            }}
            className="mb-8"
          >
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 0.8,
                repeat: 1,
                repeatDelay: 0.2,
              }}
              className="flex h-24 w-24 items-center justify-center rounded-full bg-orange-500 shadow-2xl shadow-orange-500/30"
            >
              <Flame size={48} className="text-white" />
            </motion.div>
          </motion.div>

          {/* Ready Text */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className={`mb-4 text-sm font-semibold uppercase tracking-[0.2em] ${isDark ? 'text-stone-400' : 'text-stone-300'}`}
          >
            Ready to cook?
          </motion.p>

          {/* Recipe Title */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5, type: 'spring' }}
            className="mb-6 max-w-md text-3xl font-extrabold leading-tight text-white sm:text-4xl md:text-5xl drop-shadow-lg"
          >
            {recipe.title}
          </motion.h1>

          {/* Recipe Meta */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className={`mb-12 flex flex-wrap items-center justify-center gap-4 text-sm drop-shadow ${isDark ? 'text-stone-300' : 'text-stone-200'}`}
          >
            <span className="flex items-center gap-1.5">
              <Clock size={14} />
              {getTotalTime()}
            </span>
            <span className={isDark ? 'text-stone-500' : 'text-stone-400'}>•</span>
            <span className="flex items-center gap-1.5">
              <ChefHat size={14} />
              {recipe.difficulty || 'Medium'}
            </span>
            <span className={isDark ? 'text-stone-500' : 'text-stone-400'}>•</span>
            <span className="flex items-center gap-1.5">
              <Users size={14} />
              {recipe.servings || 4} servings
            </span>
          </motion.div>
        </div>

        {/* Bottom Progress Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          className="absolute bottom-12 left-8 right-8"
        >
          {/* Progress Bar */}
          <div className={`mb-4 h-1 w-full overflow-hidden rounded-full ${isDark ? 'bg-white/10' : 'bg-white/20'}`}>
            <motion.div
              className="h-full rounded-full bg-orange-500"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>

          {/* Loading Text */}
          <p className={`text-center text-sm font-medium ${isDark ? 'text-stone-400' : 'text-stone-300'}`}>
            Starting cooking mode...
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

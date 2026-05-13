import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { UtensilsCrossed, Flame, Cookie, Salad, Soup, Wheat, Cherry, IceCreamCone } from 'lucide-react';

const FOOD_ICONS = [UtensilsCrossed, Flame, Cookie, Salad, Soup, Wheat, Cherry, IceCreamCone];

interface FloaterData {
  id: number;
  Icon: (typeof FOOD_ICONS)[number];
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  rotate: number;
}

function buildFloaters(count = 12): FloaterData[] {
  const items: FloaterData[] = [];
  for (let i = 0; i < count; i++) {
    items.push({
      id: i,
      Icon: FOOD_ICONS[i % FOOD_ICONS.length],
      x: 8 + ((i * 37) % 80),
      y: 5 + ((i * 53) % 85),
      size: 20 + (i % 4) * 6,
      delay: i * 0.35,
      duration: 5 + (i % 4) * 2,
      rotate: (i % 2 === 0 ? 1 : -1) * (10 + (i % 3) * 8),
    });
  }
  return items;
}

// Read saved appearance from localStorage (runs immediately)
function getSavedAppearance() {
  if (typeof window === 'undefined') return { theme: 'system', fontSize: 'medium' };
  
  const savedTheme = localStorage.getItem('cookmate:theme');
  const savedFontSize = localStorage.getItem('cookmate:fontSize');
  
  const isValidTheme = (v: string | null) => v === 'light' || v === 'dark' || v === 'system';
  const isValidFontSize = (v: string | null) => v === 'small' || v === 'medium' || v === 'large';
  
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  
  return {
    theme: isValidTheme(savedTheme) ? savedTheme : systemTheme,
    fontSize: isValidFontSize(savedFontSize) ? savedFontSize : 'medium',
  };
}

// Apply theme + font-size synchronously before first paint to avoid flash
function applyAppearanceSync(appearance: { theme: string | null; fontSize: string | null }) {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  if (appearance.theme === 'system') {
    root.classList.add(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  } else if (appearance.theme === 'light' || appearance.theme === 'dark') {
    root.classList.add(appearance.theme);
  }
  if (appearance.fontSize) {
    root.dataset.fontSize = appearance.fontSize;
    root.setAttribute('data-font-size', appearance.fontSize);
  }
}

interface SplashScreenProps {
  onFinished: () => void;
  minimumDuration?: number;
  message?: string;
  isReady?: boolean;
}

export default function SplashScreen({
  onFinished,
  minimumDuration = 2400,
  message = 'Cooking up something delicious...',
  isReady = true,
}: SplashScreenProps) {
  const [visible, setVisible] = useState(true);
  const [minimumElapsed, setMinimumElapsed] = useState(false);
  const appearance = useMemo(() => {
    const a = getSavedAppearance();
    applyAppearanceSync(a);
    return a;
  }, []);
  const floaters = useMemo(() => buildFloaters(), []);

  // Re-apply on theme/fontSize change (handles settings updates)
  useEffect(() => {
    applyAppearanceSync(appearance);
  }, [appearance]);

  useEffect(() => {
    const timer = setTimeout(() => setMinimumElapsed(true), minimumDuration);
    return () => clearTimeout(timer);
  }, [minimumDuration]);

  useEffect(() => {
    if (minimumElapsed && isReady) {
      setVisible(false);
    }
  }, [isReady, minimumElapsed]);

  return (
    <AnimatePresence onExitComplete={onFinished}>
      {visible && (
        <motion.div
          key="splash-overlay"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
          style={{
            background: appearance.theme === 'dark' || (appearance.theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches)
              ? 'linear-gradient(135deg,#0c0a09 0%,#1c1917 35%,#431407 70%,#7c2d12 100%)'
              : 'linear-gradient(135deg,#fff7ed 0%,#ffedd5 30%,#fed7aa 60%,#fdba74 100%)',
          }}
        >
          {/* Floating food icons — same style as AuthVisualPanel */}
          {floaters.map(({ id, Icon, x, y, size, delay, duration, rotate }) => (
            <motion.div
              key={id}
              className="absolute pointer-events-none text-orange-500"
              style={{ left: `${x}%`, top: `${y}%`, opacity: 0.12 }}
              animate={{
                y: [0, -14, 6, -8, 0],
                rotate: [0, rotate, -rotate * 0.6, rotate * 0.3, 0],
                scale: [1, 1.08, 0.95, 1.04, 1],
              }}
              transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Icon size={size} strokeWidth={1.5} />
            </motion.div>
          ))}

          {/* Center content */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Animated logo box — matches Login / AuthVisualPanel branding */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
              className="w-20 h-20 flex items-center justify-center mb-6"
            >
              <motion.img
                src="/logo.png"
                alt="CookMate"
                className="w-20 h-20 object-contain drop-shadow-lg"
                animate={{ rotate: [0, -8, 8, -4, 4, 0] }}
                transition={{ duration: 1.8, delay: 0.6, repeat: Infinity, repeatDelay: 3 }}
              />
            </motion.div>

            {/* Brand name - scales with font size preference */}
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className={`font-extrabold text-stone-900 dark:text-stone-50 tracking-tight mb-2 ${
                appearance.fontSize === 'small' ? 'text-3xl' : 
                appearance.fontSize === 'large' ? 'text-5xl' : 'text-4xl'
              }`}
            >
              CookMate
            </motion.h1>

            {/* Tagline - scales with font size preference */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className={`text-stone-500 dark:text-stone-300 font-medium ${
                appearance.fontSize === 'small' ? 'text-xs' : 
                appearance.fontSize === 'large' ? 'text-base' : 'text-sm'
              }`}
            >
              {message}
            </motion.p>

            {/* Animated loading dots */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex gap-1.5 mt-6"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-orange-500"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.35, 1, 0.35] }}
                  transition={{
                    duration: 0.9,
                    delay: i * 0.15,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

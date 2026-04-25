import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useTheme } from 'next-themes';
import { ChefHat, ChevronsLeft, ChevronsRight, UtensilsCrossed, Flame, Cookie, Salad, Soup, Wheat, Cherry, IceCreamCone } from 'lucide-react';

// ── floating icon data ──────────────────────────────────────────────
const ICONS = [UtensilsCrossed, Flame, Cookie, Salad, Soup, Wheat, Cherry, IceCreamCone];

interface FloatingItem {
  id: number;
  Icon: (typeof ICONS)[number];
  x: string;
  y: string;
  size: number;
  delay: number;
  duration: number;
  rotate: number;
  opacity: number;
}

function buildFloaters(count = 14): FloatingItem[] {
  const items: FloatingItem[] = [];
  for (let i = 0; i < count; i++) {
    items.push({
      id: i,
      Icon: ICONS[i % ICONS.length],
      x: `${8 + ((i * 37) % 80)}%`,
      y: `${5 + ((i * 53) % 85)}%`,
      size: 18 + (i % 4) * 6,
      delay: i * 0.45,
      duration: 6 + (i % 5) * 2,
      rotate: (i % 2 === 0 ? 1 : -1) * (10 + (i % 3) * 8),
      opacity: 0.10 + (i % 4) * 0.04,
    });
  }
  return items;
}

// ── theme palettes ──────────────────────────────────────────────────
const LIGHT = {
  bg: 'rgba(28,25,23,0.18)',
  blob1: 'radial-gradient(circle, rgba(249,115,22,0.25) 0%, transparent 70%)',
  blob2: 'radial-gradient(circle, rgba(251,146,60,0.20) 0%, transparent 70%)',
  blob3: 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)',
  iconColor: 'text-white/70',
  heading: 'text-white drop-shadow-sm',
  sub: 'text-white/85 drop-shadow-sm',
  pill: 'bg-white/18 text-white border-white/25',
  toggleBg: 'bg-white/80 border-stone-200',
  toggleIcon: 'text-stone-600',
};

const DARK = {
  bg: 'rgba(12,10,9,0.30)',
  blob1: 'radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)',
  blob2: 'radial-gradient(circle, rgba(251,146,60,0.08) 0%, transparent 70%)',
  blob3: 'radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)',
  iconColor: 'text-orange-400/70',
  heading: 'text-stone-100',
  sub: 'text-stone-400',
  pill: 'bg-white/[0.06] text-stone-300 border-orange-500/20',
  toggleBg: 'bg-stone-800/80 border-stone-700',
  toggleIcon: 'text-stone-400',
};

// ── component ───────────────────────────────────────────────────────
interface AuthVisualPanelProps {
  collapsed: boolean;
  onToggle: () => void;
  heading?: string;
  subheading?: string;
}

export function AuthVisualPanel({
  collapsed,
  onToggle,
  heading = 'Cook smarter.',
  subheading = 'Plan meals, discover recipes, and let AI be your sous-chef.',
}: AuthVisualPanelProps) {
  const floaters = useMemo(() => buildFloaters(), []);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === 'dark';
  const t = isDark ? DARK : LIGHT;

  return (
    <>
      {/* Toggle button — always visible */}
      <motion.button
        type="button"
        onClick={onToggle}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        className={`hidden lg:inline-flex absolute top-1/2 z-30 -translate-y-1/2 items-center justify-center backdrop-blur-sm rounded-full p-2 shadow-md hover:shadow-lg transition-shadow border ${t.toggleBg}`}
        style={{ left: collapsed ? '16px' : 'calc(50% - 12px)' }}
        aria-label={collapsed ? 'Expand visual panel' : 'Collapse visual panel'}
      >
        {collapsed ? <ChevronsRight size={18} className={t.toggleIcon} /> : <ChevronsLeft size={18} className={t.toggleIcon} />}
      </motion.button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="visual-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: '50%', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="hidden lg:flex relative overflow-hidden rounded-3xl m-3 flex-col items-center justify-center border border-white/20 shadow-2xl"
            style={{ background: t.bg, backdropFilter: 'blur(10px)' }}
          >
            {/* Animated gradient blobs */}
            <motion.div
              className="absolute w-[340px] h-[340px] rounded-full blur-3xl"
              style={{ background: t.blob1, top: '10%', left: '10%' }}
              animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0], scale: [1, 1.15, 0.95, 1] }}
              transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute w-[280px] h-[280px] rounded-full blur-3xl"
              style={{ background: t.blob2, bottom: '15%', right: '10%' }}
              animate={{ x: [0, -30, 25, 0], y: [0, 25, -35, 0], scale: [1, 0.9, 1.1, 1] }}
              transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute w-[200px] h-[200px] rounded-full blur-2xl"
              style={{ background: t.blob3, top: '55%', left: '50%' }}
              animate={{ x: [0, 20, -15, 0], y: [0, -20, 15, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Floating food icons */}
            {floaters.map(({ id, Icon, x, y, size, delay, duration, rotate, opacity: baseOpacity }) => (
              <motion.div
                key={id}
                className={`absolute pointer-events-none ${t.iconColor}`}
                style={{ left: x, top: y, opacity: isDark ? baseOpacity * 1.6 : baseOpacity }}
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
            <div className="relative z-10 flex flex-col items-center text-center px-10 max-w-md">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="w-20 h-20 bg-orange-500 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-orange-500/30 mb-8"
              >
                <ChefHat className="w-10 h-10" />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className={`text-4xl font-extrabold tracking-tight leading-tight mb-3 ${t.heading}`}
              >
                {heading}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className={`text-base leading-relaxed ${t.sub}`}
              >
                {subheading}
              </motion.p>

              {/* Decorative pill badges */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.4 }}
                className="flex flex-wrap justify-center gap-2 mt-8"
              >
                {['AI Recipes', 'Meal Plans', 'Smart Pantry', 'Cooking Mode'].map((tag, i) => (
                  <motion.span
                    key={tag}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 + i * 0.08 }}
                    className={`px-4 py-1.5 backdrop-blur-sm rounded-full text-xs font-bold border shadow-sm ${t.pill}`}
                  >
                    {tag}
                  </motion.span>
                ))}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default AuthVisualPanel;

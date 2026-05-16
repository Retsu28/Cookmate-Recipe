import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Leaf, Sun, Cloud, Snowflake } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { loadSeasonalData, fetchSeasonalData, type SeasonalData } from '@/data/seasonalData';
import type { LucideIcon } from 'lucide-react';

const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.06 + i * 0.06, duration: 0.34, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const CURRENT_MONTH = new Date().getMonth();

const iconMap: Record<string, LucideIcon> = {
  'sun': Sun,
  'cloud-rain': Cloud,
  'snowflake': Snowflake,
};

const colorByIndex: { bg: string; bgDark: string; badge: string; badgeDark: string; border: string; borderDark: string; icon: string; iconDark: string }[] = [
  {
    bg: 'bg-orange-50', bgDark: 'dark:bg-orange-950/20',
    badge: 'bg-orange-100 text-orange-700', badgeDark: 'dark:bg-orange-900/30 dark:text-orange-300',
    border: 'border-orange-200', borderDark: 'dark:border-orange-900/40',
    icon: 'text-orange-500', iconDark: 'dark:text-orange-400',
  },
  {
    bg: 'bg-blue-50', bgDark: 'dark:bg-blue-950/20',
    badge: 'bg-blue-100 text-blue-700', badgeDark: 'dark:bg-blue-900/30 dark:text-blue-300',
    border: 'border-blue-200', borderDark: 'dark:border-blue-900/40',
    icon: 'text-blue-500', iconDark: 'dark:text-blue-400',
  },
  {
    bg: 'bg-sky-50', bgDark: 'dark:bg-sky-950/20',
    badge: 'bg-sky-100 text-sky-700', badgeDark: 'dark:bg-sky-900/30 dark:text-sky-300',
    border: 'border-sky-200', borderDark: 'dark:border-sky-900/40',
    icon: 'text-sky-500', iconDark: 'dark:text-sky-400',
  },
];

export default function SeasonalGuide() {
  const navigate = useNavigate();
  const [data, setData] = useState<SeasonalData>(() => loadSeasonalData());
  const { seasons, yearRound } = data;

  useEffect(() => {
    fetchSeasonalData().then(setData).catch(() => {});
  }, []);

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12"
      >
        {/* Back */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-6 inline-flex items-center gap-2 rounded-lg px-1 py-2 text-sm font-bold text-stone-500 transition-colors hover:text-stone-900 dark:hover:text-stone-100"
          >
            <ArrowLeft className="size-4" />
            Back
          </button>
        </motion.div>

        {/* Hero */}
        <motion.div
          custom={0}
          variants={sectionVariants}
          initial="hidden"
          animate="show"
          className="mb-10 rounded-3xl border border-green-100 bg-gradient-to-br from-green-50 to-orange-50/40 p-8 text-center dark:border-green-900/40 dark:from-green-950/30 dark:to-orange-950/10"
        >
          <div className="mx-auto mb-5 flex size-20 items-center justify-center rounded-3xl bg-white shadow-lg shadow-green-200/60 dark:bg-stone-800 dark:shadow-none">
            <Leaf className="size-10 text-green-500" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100 md:text-5xl">
            Seasonal Ingredients
          </h1>
          <p className="mt-2 text-sm font-bold text-green-600 dark:text-green-400">Philippine Seasonal Produce Guide</p>
          <p className="mt-4 mx-auto max-w-xl text-base font-medium leading-relaxed text-stone-600 dark:text-stone-400">
            Discover what's fresh, affordable, and at peak flavour in every Filipino season. Cooking with in-season produce means better taste, lower cost, and support for local farmers.
          </p>
        </motion.div>

        {/* Season cards */}
        {seasons.map((season, si) => {
          const c = colorByIndex[si % colorByIndex.length];
          const Icon = iconMap[season.icon] ?? Leaf;
          const current = season.monthRange.includes(CURRENT_MONTH);
          return (
            <motion.section
              key={season.id}
              custom={si + 1}
              variants={sectionVariants}
              initial="hidden"
              animate="show"
              className={`mb-8 rounded-2xl border p-6 shadow-sm ${c.border} ${c.borderDark} ${c.bg} ${c.bgDark}`}
            >
              <div className="flex items-start gap-4 mb-5">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-stone-800">
                  <Icon className={`size-6 ${c.icon} ${c.iconDark}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-extrabold text-stone-900 dark:text-stone-100">{season.name}</h2>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest ${c.badge} ${c.badgeDark}`}>
                      {season.label}
                    </span>
                    {current && (
                      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        Current Season
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs font-bold text-stone-400 dark:text-stone-500">{season.months}</p>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-stone-600 dark:text-stone-400">{season.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {season.ingredients.map((ing) => (
                  <div key={ing.name} className="flex items-start gap-3 rounded-xl bg-white/70 p-3.5 dark:bg-stone-900/40">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-orange-500" />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-extrabold text-stone-800 dark:text-stone-200">{ing.emoji} {ing.name}</span>
                        <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
                          {ing.status}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs font-medium leading-relaxed text-stone-500 dark:text-stone-400">{ing.tip}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          );
        })}

        {/* Year-round staples */}
        <motion.section
          custom={seasons.length + 1}
          variants={sectionVariants}
          initial="hidden"
          animate="show"
          className="mb-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-800"
        >
          <h2 className="mb-1 text-lg font-extrabold text-stone-900 dark:text-stone-100">Year-Round Staples</h2>
          <p className="mb-5 text-xs font-medium text-stone-500 dark:text-stone-400">These Filipino pantry essentials are available in every season.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {yearRound.map((ing) => (
              <div key={ing.name} className="flex items-start gap-3 rounded-xl bg-stone-50 p-3.5 dark:bg-stone-700/40">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-stone-400" />
                <div>
                  <span className="text-sm font-extrabold text-stone-800 dark:text-stone-200">{ing.emoji} {ing.name}</span>
                  <p className="mt-0.5 text-xs font-medium leading-relaxed text-stone-500 dark:text-stone-400">{ing.tip}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Footer tip */}
        <motion.div
          custom={seasons.length + 2}
          variants={sectionVariants}
          initial="hidden"
          animate="show"
          className="rounded-2xl border border-orange-100 bg-orange-50/60 p-6 text-center dark:border-orange-900/40 dark:bg-orange-950/20"
        >
          <Leaf className="mx-auto mb-3 size-8 text-green-500" />
          <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">
            Tip: Buying in-season produce from your local <span className="font-bold text-stone-800 dark:text-stone-200">palengke</span> supports Filipino farmers and gives you the freshest ingredients at the best price.
          </p>
        </motion.div>
      </motion.div>
    </Layout>
  );
}

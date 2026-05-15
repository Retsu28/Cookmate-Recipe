import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, ChefHat, Heart, Shield, Sparkles, Star, Users, Zap } from 'lucide-react';
import { Layout } from '@/components/Layout';

const APP_VERSION = '1.0.0';
const BUILD_YEAR = '2025';
const CONTACT_EMAIL = 'cookmate067@gmail.com';

const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.06 + i * 0.06, duration: 0.34, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const features = [
  {
    icon: Sparkles,
    title: 'AI-Powered Recipes',
    description: 'Get personalised recipe suggestions powered by machine learning trained on hundreds of Filipino and international dishes.',
  },
  {
    icon: ChefHat,
    title: 'Step-by-Step Cooking Mode',
    description: 'Follow along with our hands-free cooking mode — keep your screen on and navigate each step without touching your device.',
  },
  {
    icon: Zap,
    title: 'Smart Meal Planner',
    description: 'Plan your meals for the week, get automatic shopping lists, and receive reminders when it is time to cook.',
  },
  {
    icon: Shield,
    title: 'Privacy First',
    description: 'Your data is yours. We never sell it. Full data export and account deletion are always available from settings.',
  },
  {
    icon: Users,
    title: 'Community Driven',
    description: 'Recipes curated with love from the Filipino culinary tradition and a growing community of home cooks.',
  },
  {
    icon: Star,
    title: 'Offline Ready',
    description: 'Downloaded recipes are available even without an internet connection — cook anywhere, anytime.',
  },
];

const team = [
  { name: 'Design & Engineering', detail: 'Built with React, React Native (Expo), Node.js, and PostgreSQL.' },
  { name: 'AI & Recommendations', detail: 'Powered by a custom ML pipeline trained on Philippine food datasets.' },
  { name: 'Data & Privacy', detail: 'CSRF-protected, bcrypt-hashed passwords, TLS-encrypted data in transit.' },
];

export default function About() {
  const navigate = useNavigate();

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
          className="mb-10 rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50/40 p-8 text-center dark:border-orange-900/40 dark:from-orange-950/30 dark:to-amber-950/10"
        >
          <div className="mx-auto mb-5 flex size-20 items-center justify-center rounded-3xl bg-white shadow-lg shadow-orange-200/60 dark:bg-stone-800 dark:shadow-none">
            <ChefHat className="size-10 text-orange-500" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100 md:text-5xl">
            CookMate
          </h1>
          <p className="mt-1 text-sm font-bold text-orange-600 dark:text-orange-400">Version {APP_VERSION}</p>
          <p className="mt-4 mx-auto max-w-xl text-base font-medium leading-relaxed text-stone-600 dark:text-stone-400">
            Your personal Filipino recipe companion — discover, plan, and cook with confidence. Built for home cooks who love great food.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-extrabold text-stone-500 shadow-sm dark:bg-stone-800/80">
            <Heart className="size-3.5 text-orange-500" />
            Made with love in the Philippines · {BUILD_YEAR}
          </div>
        </motion.div>

        {/* What is CookMate */}
        <motion.section
          custom={1}
          variants={sectionVariants}
          initial="hidden"
          animate="show"
          className="mb-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-800"
        >
          <h2 className="mb-3 text-lg font-extrabold text-stone-900 dark:text-stone-100">What is CookMate?</h2>
          <p className="text-sm font-medium leading-relaxed text-stone-600 dark:text-stone-400">
            CookMate is an AI-assisted recipe and meal-planning app designed around Filipino cuisine and everyday cooking. Whether you are a beginner learning to fry an egg or an experienced home cook planning a holiday feast, CookMate gives you the tools, guidance, and inspiration to make cooking enjoyable and stress-free.
          </p>
          <p className="mt-3 text-sm font-medium leading-relaxed text-stone-600 dark:text-stone-400">
            Available on web and mobile (Android &amp; iOS via Expo), CookMate syncs your saved recipes, meal plans, and preferences across all your devices in real time.
          </p>
        </motion.section>

        {/* Features grid */}
        <motion.section custom={2} variants={sectionVariants} initial="hidden" animate="show" className="mb-6">
          <h2 className="mb-4 text-lg font-extrabold text-stone-900 dark:text-stone-100">Key Features</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  custom={3 + i}
                  variants={sectionVariants}
                  initial="hidden"
                  animate="show"
                  className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-800"
                >
                  <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mb-1.5 text-sm font-extrabold text-stone-900 dark:text-stone-100">{f.title}</h3>
                  <p className="text-xs font-medium leading-relaxed text-stone-500 dark:text-stone-400">{f.description}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* Tech & Team */}
        <motion.section
          custom={9}
          variants={sectionVariants}
          initial="hidden"
          animate="show"
          className="mb-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-800"
        >
          <h2 className="mb-4 text-lg font-extrabold text-stone-900 dark:text-stone-100">Under the Hood</h2>
          <div className="space-y-3">
            {team.map((t) => (
              <div key={t.name} className="flex items-start gap-3">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-orange-500" />
                <p className="text-sm font-medium leading-relaxed text-stone-600 dark:text-stone-400">
                  <span className="font-extrabold text-stone-800 dark:text-stone-200">{t.name}: </span>
                  {t.detail}
                </p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Version info */}
        <motion.section
          custom={10}
          variants={sectionVariants}
          initial="hidden"
          animate="show"
          className="mb-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-800"
        >
          <h2 className="mb-4 text-lg font-extrabold text-stone-900 dark:text-stone-100">App Info</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { label: 'Version', value: APP_VERSION },
              { label: 'Platform', value: 'Web · Android' },
              { label: 'Framework', value: 'React + Expo' },
              { label: 'Backend', value: 'Node.js + PostgreSQL' },
              { label: 'AI Service', value: 'Python FastAPI' },
              { label: 'Release Year', value: BUILD_YEAR },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-stone-50 px-4 py-3 dark:bg-stone-700/50">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-stone-400 dark:text-stone-500">{item.label}</p>
                <p className="mt-0.5 text-sm font-bold text-stone-800 dark:text-stone-200">{item.value}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Contact footer */}
        <motion.div
          custom={11}
          variants={sectionVariants}
          initial="hidden"
          animate="show"
          className="rounded-2xl border border-orange-100 bg-orange-50/60 p-6 text-center dark:border-orange-900/40 dark:bg-orange-950/20"
        >
          <ChefHat className="mx-auto mb-3 size-8 text-orange-500" />
          <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">
            Questions or feedback? Reach us at{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-bold text-orange-600 hover:underline dark:text-orange-400"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
          <p className="mt-2 text-xs font-medium text-stone-400 dark:text-stone-500">
            © {BUILD_YEAR} CookMate. All rights reserved.
          </p>
        </motion.div>
      </motion.div>
    </Layout>
  );
}

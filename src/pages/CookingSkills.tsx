import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Play, ExternalLink, GraduationCap } from 'lucide-react';
import { Layout } from '@/components/Layout';

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: 0.08 + i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const heroVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};

interface Skill {
  id: number;
  title: string;
  description: string;
  youtubeUrl: string;
  imageUrl: string;
  tag: string;
  level: 'Beginner' | 'Intermediate' | 'Essential';
}

const SKILLS: Skill[] = [
  {
    id: 1,
    title: 'Knife Skills Basics',
    description: 'Learn essential knife handling techniques for faster, safer, and more efficient cooking preparation.',
    youtubeUrl: 'https://www.youtube.com/results?search_query=knife+skills+basics',
    imageUrl: 'https://static01.nyt.com/images/2025/03/24/multimedia/24knife-gvjp/24knife-gvjp-superJumbo.jpg?format=pjpg&quality=75&auto=webp&disable=upscale',
    tag: 'Knife Work',
    level: 'Beginner',
  },
  {
    id: 2,
    title: 'How to Julienne Vegetables',
    description: 'Master the julienne cutting technique to create thin, even vegetable strips like a professional chef.',
    youtubeUrl: 'https://www.youtube.com/results?search_query=how+to+julienne+vegetables',
    imageUrl: 'https://www.thedailymeal.com/img/gallery/the-chinese-veggie-cutting-technique-for-beautiful-salads/how-to-prep-your-veggies-using-the-julienne-technique-1707258564.jpg',
    tag: 'Cutting',
    level: 'Intermediate',
  },
  {
    id: 3,
    title: 'How to Dice an Onion',
    description: 'Step-by-step guide to quickly and safely dice onions with proper kitchen technique.',
    youtubeUrl: 'https://www.youtube.com/results?search_query=how+to+dice+an+onion',
    imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ6VQnBxiLtVNEelEIAQNamV7IyW5dUWPsQFA&s',
    tag: 'Knife Work',
    level: 'Beginner',
  },
  {
    id: 4,
    title: 'Pan Frying Basics',
    description: 'Learn proper pan frying techniques, temperature control, and cooking methods for perfect results.',
    youtubeUrl: 'https://www.youtube.com/results?search_query=pan+frying+basics',
    imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRUAuCVZ7dUS859_ZHyRQ4DHa2iLZ7sBF2iQQ&s',
    tag: 'Heat Control',
    level: 'Essential',
  },
  {
    id: 5,
    title: 'Seasoning Food Properly',
    description: 'Understand how to balance salt, acidity, sweetness, and spices to improve flavor in every dish.',
    youtubeUrl: 'https://www.youtube.com/results?search_query=seasoning+food+properly',
    imageUrl: 'https://www.allrecipes.com/thmb/0_QqCfH4ayttxuPB5xWMNLuRglw=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/GettyImages-519515245-2000-eb6f66823c9343358ea8b3a1fa1cb941.jpg',
    tag: 'Flavor',
    level: 'Essential',
  },
  {
    id: 6,
    title: 'Egg Cooking Basics',
    description: 'Learn the fundamentals of cooking boiled, fried, scrambled, and poached eggs perfectly.',
    youtubeUrl: 'https://www.youtube.com/results?search_query=egg+cooking+basics',
    imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSWAi5mUREMYvhYkwICz1AUP_gT5CITQwiwgg&s',
    tag: 'Fundamentals',
    level: 'Beginner',
  },
];

const LEVEL_COLORS: Record<string, string> = {
  Beginner: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  Intermediate: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  Essential: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
};


function SkillCard({ skill, index }: {
  skill: Skill;
  index: number;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const thumbnailSrc = imgError ? null : skill.imageUrl;

  useEffect(() => {
    if (imgRef.current?.complete) setImgLoaded(true);
  }, []);

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="show"
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111111] shadow-xl shadow-black/40 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl hover:shadow-black/60"
      style={{
        background: hovered
          ? 'linear-gradient(135deg, #1a1a1a 0%, #161616 100%)'
          : '#111111',
      }}
    >
      {/* Glow ring on hover */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ boxShadow: 'inset 0 0 0 1px rgba(249,115,22,0.25)' }}
      />

      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-[#0d0d0d]">
        {/* Skeleton */}
        {!imgLoaded && !imgError && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-[#1a1a1a] via-[#222] to-[#1a1a1a]" />
        )}

        {/* YouTube thumbnail attempt */}
        {thumbnailSrc && (
          <img
            ref={imgRef}
            src={thumbnailSrc}
            alt={skill.title}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={() => { setImgError(true); setImgLoaded(true); }}
            className={`h-full w-full object-cover transition-all duration-500 group-hover:scale-105 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
        )}

        {/* Dark overlay when no thumbnail */}
        {imgError && (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d]">
            <GraduationCap className="size-12 text-stone-700" />
          </div>
        )}

        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* Animated Play button */}
        <a
          href={skill.youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Watch ${skill.title} on YouTube`}
          className="absolute inset-0 flex items-center justify-center"
          onClick={() => {}}
        >
          <motion.div
            animate={hovered ? { scale: 1.12, opacity: 1 } : { scale: 1, opacity: 0.85 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="flex size-14 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm ring-2 ring-white/20 transition-all"
          >
            <Play className="size-6 fill-white text-white drop-shadow-lg" style={{ marginLeft: 3 }} />
          </motion.div>
        </a>

        {/* Level badge */}
        <div className={`absolute bottom-3 left-3 rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest backdrop-blur-sm ${LEVEL_COLORS[skill.level]}`}>
          {skill.level}
        </div>

        {/* Tag badge */}
        <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-stone-300 backdrop-blur-sm">
          {skill.tag}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="text-base font-extrabold leading-tight tracking-tight text-white group-hover:text-orange-300 transition-colors duration-200">
          {skill.title}
        </h3>

        <p className="text-sm font-medium leading-relaxed text-stone-400">
          {skill.description}
        </p>

        <div className="mt-auto pt-1">
          <a
            href={skill.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group/btn inline-flex items-center gap-2 border-b border-stone-600 pb-0.5 text-xs font-extrabold uppercase tracking-widest text-stone-300 transition-all duration-200 hover:border-orange-500 hover:text-orange-400"
          >
            <Play className="size-3 fill-current" />
            Watch Video
            <ExternalLink className="size-3 opacity-0 transition-opacity group-hover/btn:opacity-100" />
          </a>
        </div>
      </div>
    </motion.div>
  );
}

export default function CookingSkills() {
  const navigate = useNavigate();

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12"
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
          variants={heroVariants}
          initial="hidden"
          animate="show"
          className="mb-10 overflow-hidden rounded-3xl border border-white/10 bg-[#0d0d0d] p-8 md:p-10 text-center relative"
        >
          {/* Background glow */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-64 w-64 rounded-full bg-orange-500/10 blur-3xl" />
          </div>

          <div className="relative z-10">
            <div className="mx-auto mb-5 flex size-20 items-center justify-center rounded-3xl bg-white/5 ring-1 ring-white/10 shadow-xl shadow-black/60">
              <GraduationCap className="size-10 text-orange-400" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl lg:text-6xl">
              Cooking Skills
            </h1>
            <p className="mt-2 text-sm font-bold text-orange-400 uppercase tracking-widest">
              Master the Fundamentals
            </p>
            <p className="mt-4 mx-auto max-w-xl text-base font-medium leading-relaxed text-stone-400">
              Elevate your kitchen confidence with curated video tutorials — from knife basics to flavor fundamentals.
              Watch, learn, and cook like a pro.
            </p>
          </div>
        </motion.div>


        {/* Cards grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SKILLS.map((skill, i) => (
            <SkillCard key={skill.id} skill={skill} index={i} />
          ))}
        </div>

        {/* Footer tip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.35 }}
          className="mt-10 rounded-2xl border border-white/10 bg-[#0d0d0d] p-6 text-center"
        >
          <GraduationCap className="mx-auto mb-3 size-8 text-orange-400" />
          <p className="text-sm font-semibold text-stone-400">
            Practice these skills daily and you'll notice a dramatic improvement in your cooking speed, safety, and confidence.
          </p>
          <p className="mt-1 text-xs text-stone-600">All videos open on YouTube · Free to watch</p>
        </motion.div>
      </motion.div>
    </Layout>
  );
}

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { Layout } from '../components/Layout';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import {
  Clock, ChefHat, Users, Flame, Info,
  Printer, Share2, Heart,
  Star, ArrowLeft, Play, Pause, Volume2, VolumeX, X, Sparkles, Loader2, WifiOff,
  Calendar, CheckCircle2, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import api from '@/services/api';
import { getRecipeByIdCached } from '@/offline/cacheService';
import { OFFLINE_MESSAGE } from '@/offline/network';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useAuth } from '@/context/AuthContext';
import { useAIChat } from '@/context/AIChatContext';
import { AddToPlannerModal } from '@/components/meal-planner/AddToPlannerModal';
import {
  isRecipeDownloaded,
  downloadRecipeForOffline,
  removeRecipeFromOffline,
  getOfflineVideoBlobUrl,
  estimateDownloadSizeMB,
} from '@/services/recipeOfflineCache';
import StartCookingSplash from '@/components/StartCookingSplash';
import { ReviewSection } from '@/components/recipe/ReviewSection';
import { reviewService } from '@/services/reviewService';

interface Ingredient {
  id: number;
  name: string;
  quantity: number | null;
  unit: string | null;
}

interface DbRecipe {
  id: number;
  title: string;
  description: string | null;
  instructions: string[] | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  total_time_minutes: number | null;
  difficulty: string | null;
  servings: number | null;
  serving_size: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  sodium_mg: number | null;
  fiber_g: number | null;
  region_or_origin: string | null;
  category: string | null;
  tags: string[] | null;
  normalized_ingredients: string[] | null;
  image_url: string | null;
  video_filename: string | null;
  instruction_timestamps: { start: number; end: number }[] | null;
  video_credits: string | null;
  is_featured: boolean;
  ingredients: Ingredient[];
}

export default function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openChat } = useAIChat();
  const isOnline = useOnlineStatus();
  const [recipe, setRecipe] = useState<DbRecipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fromCache, setFromCache] = useState(false);
  const [isCooking, setIsCooking] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [plannerModalOpen, setPlannerModalOpen] = useState(false);
  const [showStartCookingSplash, setShowStartCookingSplash] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savingRecipe, setSavingRecipe] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [offlineVideoUrl, setOfflineVideoUrl] = useState<string | null>(null);
  const [downloadSizeMB, setDownloadSizeMB] = useState<number>(0);
  const [heartBounce, setHeartBounce] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState<number[]>([]);
  const [reviewRefreshKey, setReviewRefreshKey] = useState(0);
  const prevIsCooking = React.useRef(false);

  // Bump reviewRefreshKey when user exits cooking mode so ReviewSection re-checks hasCooked
  useEffect(() => {
    if (prevIsCooking.current && !isCooking) {
      setReviewRefreshKey(k => k + 1);
    }
    prevIsCooking.current = isCooking;
  }, [isCooking]);

  // Derived ingredient list from recipe
  const ingredientList = recipe?.ingredients?.length
    ? recipe.ingredients.map(i => ({ id: i.id, name: i.name, amount: i.quantity, unit: i.unit }))
    : (recipe?.normalized_ingredients || []).map((name, idx) => ({ id: idx, name, amount: null, unit: null }));

  const toggleIngredient = (ingId: number) => {
    setCheckedIngredients(prev =>
      prev.includes(ingId) ? prev.filter(id => id !== ingId) : [...prev, ingId]
    );
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    // Read-through cache: online → API + IndexedDB; offline → IndexedDB.
    getRecipeByIdCached<{ recipe: DbRecipe }>(id, () =>
      api.get<{ recipe: DbRecipe }>(`/api/recipes/${id}`),
    )
      .then(data => {
        setRecipe(data.recipe);
        setFromCache(!!(data as { fromCache?: boolean }).fromCache);
      })
      .catch(err => {
        const isOfflineMiss = (err as { code?: string }).code === 'OFFLINE_CACHE_MISS';
        setError(isOfflineMiss
          ? 'This recipe hasn\'t been cached yet. Open it while online to view it offline.'
          : err.message || 'Recipe not found.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Record the view in the database (fire-and-forget)
  useEffect(() => {
    if (!recipe || !user?.id) return;
    api.post(`/api/recipes/${recipe.id}/view`).catch(() => {
      /* silently ignore — view tracking is best-effort */
    });
  }, [recipe?.id, user?.id]);

  // Check download status (async)
  useEffect(() => {
    if (!recipe?.id) return;
    isRecipeDownloaded(recipe.id).then(setIsDownloaded);
  }, [recipe?.id]);

  // Calculate download size when recipe loads
  useEffect(() => {
    if (recipe) {
      const size = estimateDownloadSizeMB(recipe as unknown as Record<string, unknown>);
      setDownloadSizeMB(size);
    }
  }, [recipe]);

  // Resolve offline Blob URL when downloaded
  useEffect(() => {
    if (!isDownloaded || !recipe?.id) { setOfflineVideoUrl(null); return; }
    getOfflineVideoBlobUrl(recipe.id).then(setOfflineVideoUrl);
  }, [isDownloaded, recipe?.id]);

  const handleDownloadToggle = async () => {
    if (!recipe) return;
    if (isDownloaded) {
      await removeRecipeFromOffline(recipe.id);
      setIsDownloaded(false);
      toast.success('Removed from offline storage');
      return;
    }
    setDownloading(true);
    setDownloadProgress(0);
    try {
      await downloadRecipeForOffline(recipe as unknown as Record<string, unknown>, setDownloadProgress);
      setIsDownloaded(true);
      toast.success('Recipe downloaded for offline use', {
        description: recipe.video_filename ? 'Recipe + video saved to device' : 'Recipe saved to device',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Show informative errors (like storage space) directly; fallback to connection message for network errors
      if (msg.includes('storage') || msg.includes('quota') || msg.includes('space')) {
        toast.error('Not enough storage space', { description: msg });
      } else if (msg.includes('network') || msg.includes('fetch') || msg.includes('Failed to fetch')) {
        toast.error('Download failed', { description: 'Please try again with a stable connection.' });
      } else {
        toast.error('Download failed', { description: msg || 'Please try again with a stable connection.' });
      }
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  };

  // Check saved status
  useEffect(() => {
    if (!recipe?.id || !user?.id) return;
    api.get<{ saved: boolean }>(`/api/recipes/${recipe.id}/saved-status`)
      .then(data => setIsSaved(data.saved))
      .catch(() => {});
  }, [recipe?.id, user?.id]);

  const toggleSave = async () => {
    if (!user?.id) return;
    if (savingRecipe) return;
    const next = !isSaved;
    setIsSaved(next);
    setHeartBounce(true);
    setTimeout(() => setHeartBounce(false), 400);
    setSavingRecipe(true);
    try {
      if (next) {
        await api.post(`/api/recipes/${recipe!.id}/save`);
        // Auto-download for offline when saving — silent background download
        if (recipe && isOnline && !isDownloaded) {
          downloadRecipeForOffline(recipe as unknown as Record<string, unknown>)
            .then(() => {
              setIsDownloaded(true);
              toast.success('Recipe saved & downloaded for offline', {
                description: recipe.video_filename ? 'Recipe + video saved offline' : 'Recipe saved offline',
              });
            })
            .catch(() => {
              toast.success('Recipe saved', { description: 'Offline download skipped — try manually.' });
            });
        } else {
          toast.success('Recipe saved');
        }
      } else {
        await api.delete(`/api/recipes/${recipe!.id}/unsave`);
      }
    } catch {
      setIsSaved(!next);
    } finally {
      setSavingRecipe(false);
    }
  };

  const steps = (recipe?.instructions || []).map((text, idx) => ({
    number: idx + 1,
    text,
    time: null as number | null,
  }));

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-24">
          <Loader2 size={32} className="animate-spin text-orange-500" />
        </div>
      </Layout>
    );
  }

  if (error || !recipe) {
    return (
      <Layout>
        <div className="mx-auto max-w-md py-24 text-center">
          <ChefHat size={48} className="mx-auto mb-4 text-stone-300" />
          <h2 className="text-2xl font-bold text-stone-900 mb-2">Recipe not found</h2>
          <p className="text-stone-500 mb-6">{error || 'This recipe does not exist.'}</p>
          <Button onClick={() => navigate(-1)} className="rounded-full">Go Back</Button>
        </div>
      </Layout>
    );
  }

  if (showStartCookingSplash) {
    return (
      <StartCookingSplash
        recipe={recipe}
        onFinished={() => {
          setShowStartCookingSplash(false);
          setIsCooking(true);
        }}
      />
    );
  }

  if (isCooking && steps.length > 0) {
    // When offline and the recipe was downloaded, serve the video from Cache API
    // so cooking guide works without a network connection.
    const rawVideoFilename = recipe.video_filename || null;
    // Use Blob URL from IndexedDB when offline + downloaded, else Cloudinary URL
    const videoUrl = (offlineVideoUrl) ? offlineVideoUrl : rawVideoFilename;
    return (
      <GuidedCooking
        recipeId={recipe.id}
        mode={{ title: recipe.title, steps }}
        step={currentStep}
        setStep={setCurrentStep}
        onExit={() => setIsCooking(false)}
        videoUrl={videoUrl}
        timestamps={recipe.instruction_timestamps || []}
        videoCredits={recipe.video_credits || null}
        onCookingComplete={user ? async () => { try { await reviewService.markCooked(recipe.id); } catch { /* ignore */ } } : undefined}
      />
    );
  }

  return (
    <Layout>
      <div className="mx-auto w-full max-w-7xl space-y-12 px-4 py-8 animate-fade-up sm:px-6 lg:px-8">

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-stone-500 hover:text-orange-500 transition-colors font-medium w-fit dark:text-stone-400 dark:hover:text-orange-400"
        >
          <ArrowLeft size={20} /> Back
        </button>

        {/* Offline cache banner */}
        {(!isOnline || fromCache) && (
          <div className="flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50/80 px-5 py-3 text-sm font-semibold text-orange-700 dark:border-orange-500/30 dark:bg-orange-950/20 dark:text-orange-300">
            <WifiOff size={15} className="shrink-0" />
            <span>Offline mode — showing cached recipe. Some live features may be unavailable.</span>
          </div>
        )}

        {/* Hero Section */}
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Image */}
          <div className="w-full lg:w-1/2">
            <div className="w-full aspect-[4/3] rounded-[2.5rem] overflow-hidden shadow-xl shadow-stone-200/50 bg-orange-50 dark:bg-stone-800 dark:shadow-none">
              {recipe.image_url ? (
                <img
                  src={recipe.image_url}
                  alt={recipe.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-orange-300">
                  <ChefHat size={64} />
                </div>
              )}
            </div>
          </div>

          {/* Overview */}
          <div className="w-full lg:w-1/2 flex flex-col justify-center space-y-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-none px-3 py-1 text-sm font-semibold dark:bg-orange-500/20 dark:text-orange-300">{recipe.category || recipe.region_or_origin || 'Philippine'}</Badge>
                {recipe.is_featured && (
                  <div className="flex items-center gap-1.5 text-stone-500 font-medium dark:text-stone-400">
                    <Star size={18} className="text-orange-400" fill="currentColor" />
                    <span>Featured</span>
                  </div>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-stone-900 leading-tight tracking-tight mb-4 dark:text-stone-100">{recipe.title}</h1>
              <p className="text-lg text-stone-500 leading-relaxed max-w-xl dark:text-stone-400">{recipe.description || 'A delicious Philippine recipe.'}</p>
            </div>

            <div className="grid grid-cols-3 gap-6 py-6 border-y border-stone-200 dark:border-stone-700">
              {[
                { icon: Clock, label: 'Total Time', value: recipe.total_time_minutes ? `${recipe.total_time_minutes} min` : `${(recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0)} min` },
                { icon: ChefHat, label: 'Difficulty', value: recipe.difficulty || 'Medium' },
                { icon: Flame, label: 'Calories', value: recipe.calories ? `${recipe.calories} kcal` : '—' },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center sm:items-start sm:flex-row gap-3">
                  <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 shrink-0 dark:bg-orange-500/10">
                    <item.icon size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider dark:text-stone-500">{item.label}</p>
                    <p className="font-bold text-stone-900 dark:text-stone-100">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={() => {
                  if (!isOnline && !isDownloaded) {
                    toast.error('You are offline', { description: OFFLINE_MESSAGE });
                    return;
                  }
                  setCurrentStep(0);
                  setShowStartCookingSplash(true);
                }}
                aria-disabled={(!isOnline && !isDownloaded) || steps.length === 0}
                title={!isOnline && !isDownloaded ? OFFLINE_MESSAGE : undefined}
                className={`flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-full h-14 font-bold text-lg gap-2 shadow-lg shadow-orange-500/20 ${!isOnline && !isDownloaded ? 'opacity-50 cursor-not-allowed hover:bg-orange-500' : ''}`}
                disabled={steps.length === 0}
              >
                <Play size={20} fill="currentColor" /> Start Cooking Guide
              </Button>

              {/* Download for Offline */}
              <Button
                variant="outline"
                aria-label={isDownloaded ? 'Remove offline copy' : 'Download for offline'}
                onClick={handleDownloadToggle}
                disabled={downloading || (!isOnline && !isDownloaded)}
                title={!isOnline && !isDownloaded 
                  ? 'Go online to download' 
                  : isDownloaded 
                    ? 'Remove offline copy' 
                    : `Download for offline use (~${downloadSizeMB.toFixed(1)}MB)`}
                className={`relative w-14 h-14 rounded-full shrink-0 overflow-hidden transition-all
                  ${isDownloaded
                    ? 'border-emerald-400 text-emerald-600 bg-emerald-50 hover:bg-red-50 hover:border-red-400 hover:text-red-500 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-400'
                    : 'border-stone-200 text-stone-500 hover:border-orange-500 hover:text-orange-500 dark:border-stone-700 dark:text-stone-400 dark:hover:text-orange-400'}`}
              >
                {downloading ? (
                  <>
                    <span
                      className="absolute inset-0 bg-orange-100 dark:bg-orange-900/20 transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    />
                    <Loader2 size={20} className="relative animate-spin text-orange-500" />
                  </>
                ) : isDownloaded ? (
                  <CheckCircle2 size={22} />
                ) : (
                  <Download size={22} />
                )}
              </Button>

              <Button
                variant="outline"
                aria-label={isSaved ? 'Remove from saved' : 'Save recipe'}
                onClick={toggleSave}
                disabled={savingRecipe}
                className={`w-14 h-14 rounded-full shrink-0 transition-all ${isSaved ? 'border-red-400 text-red-500 bg-red-50 hover:bg-red-100 hover:border-red-500 dark:bg-red-950/30 dark:border-red-700 dark:text-red-400' : 'border-stone-200 text-stone-500 hover:border-orange-500 hover:text-orange-500 dark:border-stone-700 dark:text-stone-400 dark:hover:text-orange-400'}`}
              >
                <Heart
                  size={24}
                  fill={isSaved ? 'currentColor' : 'none'}
                  className={heartBounce ? 'scale-125' : 'scale-100'}
                  style={{ transition: 'transform 0.2s cubic-bezier(.36,.07,.19,.97)' }}
                />
              </Button>
            </div>
          </div>
        </div>

        {/* Recipe Content */}
        <div className="flex flex-col lg:flex-row gap-16 pb-20">

          {/* Main Content (Ingredients & Steps) */}
          <div className="w-full lg:w-2/3 space-y-16">

            {/* Plan This Meal CTA */}
            <section className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-3xl p-8 border border-orange-200 dark:from-orange-950/20 dark:to-orange-900/10 dark:border-orange-500/20">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-stone-900 mb-2 dark:text-stone-100">Plan This Meal</h2>
                  <p className="text-stone-600 dark:text-stone-400">Add to your meal planner to get a grocery list and reminders.</p>
                </div>
                <Button
                  onClick={() => setPlannerModalOpen(true)}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold gap-2 px-6 py-6 rounded-2xl shadow-lg shadow-orange-500/20 transition-all hover:scale-105"
                >
                  <Calendar size={20} />
                  Add to Meal Plan
                </Button>
              </div>
            </section>

            {/* Ingredients - Simple List */}
            <section>
              <h2 className="text-3xl font-bold text-stone-900 dark:text-stone-100 mb-6">Ingredients</h2>
              <ul className="space-y-2 text-stone-700 dark:text-stone-300">
                {ingredientList.map((ing) => (
                  <li key={ing.id} className="flex items-baseline gap-2">
                    <span className="text-orange-500">•</span>
                    <span className="capitalize">{ing.name}</span>
                    {ing.amount != null && (
                      <span className="text-stone-500 dark:text-stone-400">
                        — {ing.amount} {ing.unit || ''}
                      </span>
                    )}
                  </li>
                ))}
                {ingredientList.length === 0 && (
                  <li className="text-stone-400 italic">No ingredients listed for this recipe.</li>
                )}
              </ul>
            </section>

            {/* Reviews */}
            <ReviewSection key={reviewRefreshKey} recipeId={recipe.id} />

          </div>

          {/* Sticky Sidebar (Desktop) */}
          <div className="hidden lg:block lg:w-1/3">
            <div className="sticky top-24 space-y-6">
              <Card className="overflow-hidden rounded-[2rem] border-orange-100 bg-white shadow-xl shadow-orange-100/60 dark:border-stone-700 dark:bg-stone-800 dark:shadow-none p-0">
                <div className="bg-gradient-to-r from-orange-500 to-orange-400 p-6 flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Flame size={22} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">Nutrition Facts</h3>
                    <p className="text-orange-100 text-sm">{recipe.serving_size || 'Per serving'}</p>
                  </div>
                </div>
                <CardContent className="p-6">
                  {/* Calories - Highlighted */}
                  <div className="mb-6 pb-6 border-b border-stone-100 dark:border-stone-700">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-orange-500">{recipe.calories ?? '—'}</span>
                      <span className="text-stone-500 font-medium dark:text-stone-400">kcal</span>
                    </div>
                    <p className="text-sm text-stone-400 mt-1 dark:text-stone-500">Calories per serving</p>
                  </div>

                  {/* Macronutrients Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { 
                        label: 'Protein', 
                        value: recipe.protein_g ? `${recipe.protein_g}g` : '—',
                        color: 'bg-blue-500',
                        percent: recipe.protein_g ? Math.min((recipe.protein_g / 50) * 100, 100) : 0,
                        icon: '💪'
                      },
                      { 
                        label: 'Carbs', 
                        value: recipe.carbs_g ? `${recipe.carbs_g}g` : '—',
                        color: 'bg-amber-500',
                        percent: recipe.carbs_g ? Math.min((recipe.carbs_g / 100) * 100, 100) : 0,
                        icon: '🌾'
                      },
                      { 
                        label: 'Fat', 
                        value: recipe.fat_g ? `${recipe.fat_g}g` : '—',
                        color: 'bg-rose-500',
                        percent: recipe.fat_g ? Math.min((recipe.fat_g / 40) * 100, 100) : 0,
                        icon: '🥑'
                      },
                      { 
                        label: 'Fiber', 
                        value: recipe.fiber_g ? `${recipe.fiber_g}g` : '—',
                        color: 'bg-emerald-500',
                        percent: recipe.fiber_g ? Math.min((recipe.fiber_g / 10) * 100, 100) : 0,
                        icon: '🌿'
                      },
                    ].map((stat) => (
                      <div key={stat.label} className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-700/50">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{stat.icon}</span>
                          <span className="text-xs font-semibold text-stone-500 uppercase dark:text-stone-400">{stat.label}</span>
                        </div>
                        <div className="flex items-baseline gap-1 mb-2">
                          <span className="text-xl font-bold text-stone-900 dark:text-stone-100">{stat.value}</span>
                        </div>
                        {stat.percent > 0 && (
                          <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden dark:bg-stone-600">
                            <div 
                              className={`h-full ${stat.color} rounded-full`}
                              style={{ width: `${stat.percent}%` }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Sodium - Full width with warning */}
                  <div className="mt-4 p-4 rounded-2xl bg-stone-50 dark:bg-stone-700/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🧂</span>
                        <div>
                          <span className="text-xs font-semibold text-stone-500 uppercase block dark:text-stone-400">Sodium</span>
                          <span className="text-lg font-bold text-stone-900 dark:text-stone-100">
                            {recipe.sodium_mg ? `${recipe.sodium_mg}mg` : '—'}
                          </span>
                        </div>
                      </div>
                      {recipe.sodium_mg && recipe.sodium_mg > 1000 && (
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-lg dark:bg-amber-900/30 dark:text-amber-400">
                          High
                        </span>
                      )}
                    </div>
                    {recipe.sodium_mg && (
                      <div className="mt-2 h-1.5 bg-stone-200 rounded-full overflow-hidden dark:bg-stone-600">
                        <div 
                          className={`h-full rounded-full ${recipe.sodium_mg > 1000 ? 'bg-amber-500' : 'bg-cyan-500'}`}
                          style={{ width: `${Math.min((recipe.sodium_mg / 2300) * 100, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {recipe.tags && recipe.tags.length > 0 && (
                <Card className="overflow-hidden rounded-[2rem] border-orange-100 bg-white shadow-xl shadow-orange-100/60 dark:border-stone-700 dark:bg-stone-800 dark:shadow-none">
                  <CardContent className="p-6">
                    <h3 className="font-bold text-sm text-stone-400 uppercase tracking-wider mb-3 dark:text-stone-500">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {recipe.tags.map(tag => (
                        <Badge key={tag} className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/30">{tag}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="rounded-[2rem] bg-gradient-to-br from-orange-500 to-orange-400 border-none shadow-xl shadow-orange-500/20 text-white">
                <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                  <Sparkles size={32} className="text-orange-100" />
                  <h3 className="font-bold text-xl">Ask AI Assistant</h3>
                  <p className="text-orange-50">Need a substitute or want to make this recipe differently?</p>
                  <Button 
                    className="w-full bg-white text-stone-900 hover:bg-stone-200 rounded-full px-8 font-bold"
                    onClick={() => openChat(recipe ? {
                      id: recipe.id,
                      title: recipe.title,
                      ingredients: recipe.ingredients?.map(i => i.name) || recipe.normalized_ingredients || [],
                      instructions: recipe.instructions || [],
                      category: recipe.category || undefined,
                      region: recipe.region_or_origin || undefined
                    } : undefined)}
                  >
                    Ask CookMate
                  </Button>
                </CardContent>
              </Card>

            </div>
          </div>
        </div>
      </div>
      <AddToPlannerModal
        recipe={
          recipe
            ? {
                id: recipe.id,
                title: recipe.title,
                image_url: recipe.image_url,
                category: recipe.category,
              }
            : null
        }
        open={plannerModalOpen}
        onOpenChange={setPlannerModalOpen}
      />
    </Layout>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface GuidedCookingProps {
  recipeId: number;
  mode: { title: string; steps: { number: number; text: string; time: number | null }[] };
  step: number;
  setStep: (step: number) => void;
  onExit: () => void;
  videoUrl: string | null;
  timestamps: { start: number; end: number; interval?: number }[] | null;
  videoCredits: string | null;
  onCookingComplete?: () => void | Promise<void>;
}

function GuidedCooking({ recipeId, mode, step, setStep, onExit, videoUrl, timestamps, videoCredits, onCookingComplete }: GuidedCookingProps) {
  const current = mode.steps[step];
  const progress = ((step + 1) / mode.steps.length) * 100;
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const touchStartX = useRef<number | null>(null);
  const [showPlayButton, setShowPlayButton] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showVolume, setShowVolume] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [intervalTimeLeft, setIntervalTimeLeft] = useState(0);
  const [showIntervalComplete, setShowIntervalComplete] = useState(false);
  const [addedTime, setAddedTime] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [celebRating, setCelebRating] = useState(0);
  const [celebHover, setCelebHover] = useState(0);
  const [celebComment, setCelebComment] = useState('');
  const [celebSubmitting, setCelebSubmitting] = useState(false);
  const [celebSubmitted, setCelebSubmitted] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Text-to-speech: read step instruction aloud on step change
  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.92;
    utter.pitch = 1.05;
    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.name === 'Google US English')
        ?? voices.find(v => v.name === 'Google UK English Female')
        ?? voices.find(v => /female/i.test(v.name) && v.lang.startsWith('en'))
        ?? voices.find(v => v.lang.startsWith('en'))
        ?? null;
      if (preferred) utter.voice = preferred;
      window.speechSynthesis.speak(utter);
    };
    if (window.speechSynthesis.getVoices().length > 0) setVoice();
    else window.speechSynthesis.onvoiceschanged = setVoice;
  }, []);

  useEffect(() => {
    speak(current.text);
    return () => { window.speechSynthesis?.cancel(); };
  }, [step, speak]);

  // Seek to timestamp when step changes
  useEffect(() => {
    if (videoRef.current && timestamps && timestamps[step]) {
      const startTime = timestamps[step].start || 0;
      videoRef.current.currentTime = startTime;
      setIsPlaying(true);
      videoRef.current.play().catch(() => {
        // Autoplay blocked, show play button
        setShowPlayButton(true);
        setIsPlaying(false);
      });
    }
  }, [step, timestamps]);

  // Auto-loop video within timestamp range
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !timestamps || !timestamps[step]) return;

    const startTime = timestamps[step].start || 0;
    const endTime = timestamps[step].end;
    const handleTimeUpdate = () => {
      if (video.currentTime >= endTime) {
        video.currentTime = startTime;
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [step, timestamps]);

  // Interval timer based on timestamps: (end - start) + interval
  useEffect(() => {
    if (!timestamps || !timestamps[step]) return;
    
    const timestamp = timestamps[step];
    const start = timestamp.start || 0;
    const end = timestamp.end || start;
    const videoDuration = Math.max(0, end - start); // Time from video timestamps
    const additionalInterval = timestamp.interval || 0; // Additional cooking time from admin
    const totalIntervalSeconds = videoDuration + additionalInterval + addedTime;
    
    setIntervalTimeLeft(totalIntervalSeconds);
    setShowIntervalComplete(false);
    
    if (totalIntervalSeconds <= 0) return;
    
    const timer = setInterval(() => {
      setIntervalTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setShowIntervalComplete(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [step, timestamps, addedTime]);

  // Play a bell "ting" when interval completes
  useEffect(() => {
    if (!showIntervalComplete) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      // Layer two harmonics for a metallic bell tone
      const frequencies = [1046.5, 2093]; // C6 + C7
      let endedCount = 0;
      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        // Sharp attack, long natural decay
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(i === 0 ? 0.5 : 0.25, ctx.currentTime + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1.8);
        osc.onended = () => { if (++endedCount === frequencies.length) ctx.close(); };
      });
    } catch {}
  }, [showIntervalComplete]);

  const handlePrevious = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleNext = () => {
    if (step < mode.steps.length - 1) setStep(step + 1);
  };

  const handleFinish = () => {
    setCelebRating(0);
    setCelebHover(0);
    setCelebComment('');
    setCelebSubmitted(false);
    setShowCompletion(true);
  };

  const handleCelebSubmit = async () => {
    if (celebRating < 1) return;
    setCelebSubmitting(true);
    try {
      await reviewService.submitReview(recipeId, { rating: celebRating, comment: celebComment.trim() || undefined });
      setCelebSubmitted(true);
    } catch {
      // ignore, user can review from recipe page
    } finally {
      setCelebSubmitting(false);
    }
  };

  const handleCompleteAndExit = async () => {
    if (onCookingComplete) await onCookingComplete();
    setShowCompletion(false);
    onExit();
  };

  const currentTimestamp = timestamps?.[step];

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col font-sans transition-colors duration-300 ${isDark ? 'bg-stone-950 text-white' : 'bg-stone-50 text-stone-900'}`}>
      {/* Exit Confirmation Dialog */}
      {showExitConfirm && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className={`rounded-2xl p-6 mx-4 max-w-sm w-full text-center shadow-2xl border transition-colors duration-300 ${isDark ? 'bg-stone-900 border-white/10' : 'bg-white border-stone-200'}`}>
            <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-stone-900'}`}>Exit Cooking Mode?</h3>
            <p className={`text-sm mb-6 ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>Your progress will be lost. Are you sure you want to exit?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className={`flex-1 h-11 rounded-full border font-semibold transition-colors ${isDark ? 'border-white/20 text-white hover:bg-white/10' : 'border-stone-300 text-stone-700 hover:bg-stone-100'}`}
              >
                Keep Cooking
              </button>
              <button
                onClick={onExit}
                className="flex-1 h-11 rounded-full bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className={`relative p-4 flex items-center justify-between border-b transition-colors duration-300 ${isDark ? 'border-white/10' : 'border-stone-200'}`}>
        {/* Left: Exit button and title */}
        <div className="flex items-center gap-4 flex-1">
          <button onClick={() => setShowExitConfirm(true)} aria-label="Exit cooking mode" className={`p-3 transition-colors rounded-full ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-stone-200 hover:bg-stone-300 text-stone-700'}`}>
            <X size={24} />
          </button>
          
          <div>
            <h2 className="font-bold text-lg">{mode.title}</h2>
            <p className={`text-sm ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>Step {step + 1} of {mode.steps.length}</p>
          </div>
        </div>
        
        {/* Center: Circular Timer - only shown when timestamps exist */}
        {timestamps && timestamps[step] && (
        <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 z-10">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${showIntervalComplete ? 'bg-orange-500 animate-pulse' : isDark ? 'bg-stone-800 border-4 border-orange-500' : 'bg-white border-4 border-orange-500 shadow-lg'}`}>
            <div className="text-center">
              <div className={`text-xl font-bold ${showIntervalComplete ? 'text-white' : 'text-orange-500'}`}>
                {Math.floor(intervalTimeLeft / 60)}:{String(intervalTimeLeft % 60).padStart(2, '0')}
              </div>
              <div className={`text-xs ${showIntervalComplete ? 'text-white/80' : isDark ? 'text-stone-400' : 'text-stone-500'}`}>
                {showIntervalComplete ? 'Done!' : 'Interval'}
              </div>
            </div>
          </div>
        </div>
        )}
        
        {/* Right: Progress bar */}
        <div className="flex-1 flex justify-end">
          <div className={`w-32 sm:w-48 h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-stone-200'}`}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-orange-500"
          />
        </div>
      </div>
      </div>

      {/* Main Content - Video + Step Layout */}
      <div
        className="flex-1 flex flex-col lg:flex-row overflow-hidden"
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const diff = touchStartX.current - e.changedTouches[0].clientX;
          if (Math.abs(diff) > 50) {
            if (diff > 0) handleNext();
            else handlePrevious();
          }
          touchStartX.current = null;
        }}
      >
        {/* Left Side - Video Player */}
        <div className="lg:w-1/2 flex flex-col p-4 lg:p-6">
          {videoUrl ? (
            <div className="relative flex-1 rounded-2xl overflow-hidden">
              <video
                ref={videoRef}
                src={videoUrl}
                crossOrigin="anonymous"
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                loop={true}
                onError={(e) => console.error('Video load error:', e, 'URL:', videoUrl)}
                onLoadedData={() => { console.log('Video loaded successfully:', videoUrl); setIsBuffering(false); }}
                onWaiting={() => setIsBuffering(true)}
                onCanPlay={() => setIsBuffering(false)}
                onPlay={() => {
                  setShowPlayButton(false);
                  setIsPlaying(true);
                  setIsBuffering(false);
                }}
                onPause={() => setIsPlaying(false)}
              />
              {/* Buffering spinner */}
              {isBuffering && (
                <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${isDark ? 'bg-black/40' : 'bg-white/40'}`}>
                  <Loader2 size={40} className={`animate-spin ${isDark ? 'text-white' : 'text-orange-500'}`} />
                </div>
              )}
              {/* Video Overlay Container - shows controls on hover */}
              <div 
                className={`absolute inset-0 flex items-center justify-center transition-all group ${isDark ? 'bg-black/0 hover:bg-black/30' : 'bg-white/0 hover:bg-black/20'}`}
                onMouseEnter={() => setShowControls(true)}
                onMouseLeave={() => {
                  setShowControls(false);
                  setShowVolume(false);
                }}
              >
                {/* Center Play/Pause Button - shows on hover */}
                <button
                  onClick={() => {
                    if (videoRef.current) {
                      if (isPlaying) {
                        videoRef.current.pause();
                      } else {
                        videoRef.current.play();
                      }
                    }
                  }}
                  className={`p-6 bg-black/50 hover:bg-black/70 rounded-full text-white transition-all duration-300 ${showControls ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
                >
                  {isPlaying ? <Pause size={48} /> : <Play size={48} />}
                </button>
                
                {/* Volume Control - Bottom Right - shows on hover */}
                <div 
                  className={`absolute bottom-4 right-4 flex items-center gap-2 transition-all duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
                  onMouseEnter={() => setShowVolume(true)}
                  onMouseLeave={() => setShowVolume(false)}
                >
                  {showVolume && (
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={(e) => {
                        const newVolume = parseFloat(e.target.value);
                        setVolume(newVolume);
                        if (videoRef.current) {
                          videoRef.current.volume = newVolume;
                        }
                      }}
                      className="w-24 h-2 bg-white/30 rounded-lg appearance-none cursor-pointer"
                    />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const newVolume = volume === 0 ? 1 : 0;
                      setVolume(newVolume);
                      if (videoRef.current) {
                        videoRef.current.volume = newVolume;
                      }
                    }}
                    className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                  >
                    {volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                </div>
              </div>
              {/* Fallback play button if autoplay blocked */}
              {showPlayButton && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <button
                    onClick={() => {
                      videoRef.current?.play();
                      setShowPlayButton(false);
                      setIsPlaying(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 rounded-full font-bold text-white transition-colors"
                  >
                    <Play size={20} />
                    Click to Play Video
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className={`flex-1 rounded-2xl flex items-center justify-center ${isDark ? 'bg-stone-900' : 'bg-stone-200'}`}>
              <div className={`text-center ${isDark ? 'text-stone-500' : 'text-stone-400'}`}>
                <Play size={48} className="mx-auto mb-2 opacity-50" />
                <p>No video available</p>
              </div>
            </div>
          )}

          {/* Video Credits */}
          {videoUrl && videoCredits && (() => {
            const parts = videoCredits.split('|');
            const authorName = parts[0]?.trim() || '';
            const creditUrl = parts[1]?.trim() || '';
            if (!authorName) return null;
            return (
              <div className={`mt-2 flex items-center gap-1.5 px-1 text-xs ${isDark ? 'text-stone-500' : 'text-stone-400'}`}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 opacity-70">
                  <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.8 15.5V8.5l6.3 3.5-6.3 3.5z"/>
                </svg>
                <span>Subscribe to</span>
                {creditUrl ? (
                  <a
                    href={creditUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`font-semibold underline underline-offset-2 transition-colors ${isDark ? 'text-orange-400 hover:text-orange-300' : 'text-orange-500 hover:text-orange-600'}`}
                  >
                    "{authorName}"
                  </a>
                ) : (
                  <span className={`font-semibold ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>
                    "{authorName}"
                  </span>
                )}
              </div>
            );
          })()}

        </div>

        {/* Right Side - Step Text */}
        <div className="lg:w-1/2 flex flex-col p-4 lg:p-6">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col justify-center"
          >
            {/* Step Number Circle */}
            <div className="flex items-center justify-center lg:justify-start gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center text-2xl font-black shrink-0 text-white">
                {current.number}
              </div>
              <div>
                <p className={`text-sm uppercase tracking-wider ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>Current Step</p>
                {currentTimestamp && (
                  <p className="text-sm text-orange-400">
                    {formatTime(currentTimestamp.start)} - {formatTime(currentTimestamp.end)}
                  </p>
                )}
              </div>
            </div>

            {/* Step Text */}
            <div className="flex items-center justify-center lg:justify-start gap-3">
              <button
                onClick={() => speak(current.text)}
                title="Read aloud"
                className={`shrink-0 w-10 h-10 rounded-full transition-colors flex items-center justify-center ${isDark ? 'bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white' : 'bg-stone-200 hover:bg-stone-300 text-stone-600 hover:text-stone-900'}`}
              >
                <Volume2 size={18} />
              </button>
              <p className={`text-2xl sm:text-3xl lg:text-4xl font-medium leading-relaxed text-center lg:text-left ${isDark ? 'text-white' : 'text-stone-900'}`}>
                {current.text}
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className={`border-t transition-colors duration-300 ${isDark ? 'border-white/10 bg-stone-950' : 'border-stone-200 bg-stone-100'}`}>
        {/* Interval banner + time buttons — shown above the nav row when timestamps exist */}
        {timestamps && timestamps[step] && (
          <div className="flex flex-col items-center gap-1.5 pt-2 px-4">
            {showIntervalComplete && (
              <div className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-md text-xs font-bold text-center">
                Interval Complete! Proceed to Next Step?
              </div>
            )}
            <div className="flex gap-1.5">
              <button
                onClick={() => setAddedTime(prev => prev + 60)}
                className={`px-2.5 py-1 text-xs rounded-full transition-colors ${isDark ? 'bg-stone-700 hover:bg-stone-600 text-white' : 'bg-stone-300 hover:bg-stone-400 text-stone-800'}`}
              >
                +1 min
              </button>
              <button
                onClick={() => setAddedTime(prev => prev + 300)}
                className={`px-2.5 py-1 text-xs rounded-full transition-colors ${isDark ? 'bg-stone-700 hover:bg-stone-600 text-white' : 'bg-stone-300 hover:bg-stone-400 text-stone-800'}`}
              >
                +5 min
              </button>
              <button
                onClick={() => setAddedTime(0)}
                className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded-full transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Previous / step counter / Next */}
        <div className="px-4 py-2 lg:px-6 lg:py-3 flex justify-between items-center">
          <Button
            variant="outline"
            disabled={step === 0}
            onClick={handlePrevious}
            className={`w-24 sm:w-28 rounded-full h-9 sm:h-10 font-bold text-sm sm:text-base disabled:opacity-30 shrink-0 transition-colors ${isDark ? 'border-white/20 text-white hover:bg-white/10' : 'border-stone-300 text-stone-700 hover:bg-stone-200'}`}
          >
            Previous
          </Button>

          <span className={`text-sm whitespace-nowrap text-center ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
            {step + 1} / {mode.steps.length}
          </span>

          {step === mode.steps.length - 1 ? (
            <Button
              onClick={handleFinish}
              disabled={intervalTimeLeft > 0 && !showIntervalComplete}
              title={intervalTimeLeft > 0 && !showIntervalComplete ? 'Wait for interval to complete' : undefined}
              className="w-24 sm:w-28 h-9 sm:h-10 rounded-full bg-green-500 text-sm sm:text-base font-bold text-white shadow-lg shadow-green-500/20 hover:bg-green-600 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              FINISH
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={intervalTimeLeft > 0 && !showIntervalComplete}
              title={intervalTimeLeft > 0 && !showIntervalComplete ? 'Wait for interval to complete' : undefined}
              className="w-24 sm:w-28 bg-orange-500 hover:bg-orange-600 text-white rounded-full h-9 sm:h-10 font-bold text-sm sm:text-base shadow-lg shadow-orange-500/20 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </Button>
          )}
        </div>
      </div>

      {/* Completion Celebration Overlay */}
      <AnimatePresence>
        {showCompletion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-[300] flex items-center justify-center bg-black/92"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 20 }}
              className="flex flex-col items-center px-8 text-center"
            >
              {/* Success Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 15 }}
                className="w-32 h-32 rounded-full bg-green-500/15 flex items-center justify-center mb-8"
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                  transition={{ delay: 0.5, duration: 0.6, repeat: 1 }}
                >
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                </motion.div>
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-4xl md:text-5xl font-extrabold text-white mb-4"
              >
                Delicious!
              </motion.h2>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-lg text-stone-400 mb-2"
              >
                You've completed cooking
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="text-xl font-semibold text-white mb-10 max-w-md"
              >
                {mode.title}
              </motion.p>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-10 mb-8"
              >
                <div className="flex items-center gap-3 text-stone-400">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6"></line>
                    <line x1="8" y1="12" x2="21" y2="12"></line>
                    <line x1="8" y1="18" x2="21" y2="18"></line>
                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                  </svg>
                  <span className="font-medium">{mode.steps.length} steps</span>
                </div>
              </motion.div>

              {/* Inline quick review */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="w-full max-w-sm mb-8"
              >
                {celebSubmitted ? (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12" /></svg>
                    <p className="text-green-400 font-semibold text-sm">Review submitted!</p>
                  </div>
                ) : (
                  <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                    <p className="text-stone-300 text-sm font-medium mb-3 text-center">How was this recipe? <span className="text-stone-500">(optional)</span></p>
                    {/* Stars */}
                    <div className="flex justify-center gap-2 mb-4">
                      {[1,2,3,4,5].map(i => (
                        <button
                          key={i}
                          onMouseEnter={() => setCelebHover(i)}
                          onMouseLeave={() => setCelebHover(0)}
                          onClick={() => setCelebRating(i)}
                          className="focus:outline-none transition-transform hover:scale-110"
                        >
                          <Star
                            size={30}
                            className={i <= (celebHover || celebRating) ? 'fill-orange-400 text-orange-400' : 'text-stone-600 hover:text-orange-300'}
                          />
                        </button>
                      ))}
                    </div>
                    {/* Comment */}
                    <textarea
                      value={celebComment}
                      onChange={e => setCelebComment(e.target.value.slice(0, 500))}
                      placeholder="Add a comment... (optional)"
                      rows={2}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-orange-500 resize-none mb-3"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleCelebSubmit}
                        disabled={celebRating < 1 || celebSubmitting}
                        className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm rounded-full transition-colors flex items-center justify-center gap-2"
                      >
                        {celebSubmitting && <Loader2 size={14} className="animate-spin" />}
                        Submit Review
                      </button>
                      <button
                        onClick={handleCompleteAndExit}
                        className="flex-1 py-2.5 border border-white/20 hover:border-white/40 text-stone-300 hover:text-white font-semibold text-sm rounded-full transition-colors"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Button - shown after submission or always visible below */}
              {celebSubmitted && (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCompleteAndExit}
                  className="px-10 py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg rounded-full shadow-lg shadow-orange-500/30 transition-colors"
                >
                  Back to Recipe
                </motion.button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

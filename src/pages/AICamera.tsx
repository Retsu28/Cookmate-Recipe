import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Camera, Upload, Sparkles, RefreshCcw, ChefHat, ArrowRight, ScanLine, Focus, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import api from '@/services/api';
import { Badge } from '../components/ui/badge';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { AICameraPageSkeleton, CameraAnalysisSkeleton } from '@/components/SkeletonScreen';
import { useInitialContentLoading } from '@/hooks/useInitialContentLoading';

type Phase = 'idle' | 'scanning' | 'selecting' | 'selected' | 'sticker' | 'done';

interface DetectedIngredient {
  name: string;
  description: string;
  confidence: 'high' | 'medium' | 'low';
}

interface MatchedRecipe {
  id: number;
  title: string;
  image_url: string | null;
  category: string | null;
  difficulty: string | null;
  cook_time: string | null;
  description: string | null;
  matchedIngredients: string[];
}

interface AnalysisResult {
  success: boolean;
  detectedIngredients: DetectedIngredient[];
  matchedRecipes: MatchedRecipe[];
  message: string | null;
  queueCount?: number;
  queueLimit?: number;
  queueLabel?: string;
  queuePosition?: number;
  queueWarning?: string | null;
}

interface QueueStatus {
  queueCount: number;
  queueLimit: number;
  queueLabel: string;
  queuePosition?: number;
  queueFullMessage?: string;
}

const MAX_UPLOAD_FILE_SIZE = 12 * 1024 * 1024;
const MAX_ANALYSIS_DATA_URL_LENGTH = 6.5 * 1024 * 1024;
const ANALYSIS_IMAGE_PROFILES = [
  { maxEdge: 1024, quality: 0.72 },
  { maxEdge: 896, quality: 0.66 },
  { maxEdge: 768, quality: 0.6 },
];
const BG_REMOVAL_MAX_EDGE = 720;

interface PreparedCameraImage {
  analysisDataUrl: string;
  bgRemovalDataUrl: string;
}

interface LoadedImageSource {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
}

interface BackgroundRemovalResult {
  cutout?: string;
  cutoutUri?: string;
  image?: string;
}

function getScaledSize(width: number, height: number, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/jpeg', quality = 0.76): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Could not prepare image for analysis.'));
    }, type, quality);
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read prepared image.'));
    reader.readAsDataURL(blob);
  });
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.setTimeout(resolve, 0);
    });
  });
}

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load the selected image.'));
    img.src = url;
  });
}

async function loadImageSource(file: File, previewUrl: string): Promise<LoadedImageSource> {
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await window.createImageBitmap(file, { imageOrientation: 'from-image' });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    } catch {
      // Fall back to HTMLImageElement for browsers that cannot decode this file with createImageBitmap.
    }
  }

  const image = await loadImageFromUrl(previewUrl);
  return {
    source: image,
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
    close: () => {},
  };
}

async function resizeImageToBlob(
  image: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  maxEdge: number,
  quality: number
) {
  const { width, height } = getScaledSize(sourceWidth, sourceHeight, maxEdge);
  await yieldToBrowser();
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not prepare image canvas.');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = width * height > 900000 ? 'medium' : 'high';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  const blob = await canvasToBlob(canvas, 'image/jpeg', quality);
  canvas.width = 0;
  canvas.height = 0;
  return blob;
}

async function prepareCameraImage(file: File, previewUrl: string): Promise<PreparedCameraImage> {
  const image = await loadImageSource(file, previewUrl);
  try {
    let analysisDataUrl = '';

    for (const profile of ANALYSIS_IMAGE_PROFILES) {
      const blob = await resizeImageToBlob(image.source, image.width, image.height, profile.maxEdge, profile.quality);
      analysisDataUrl = await blobToDataUrl(blob);
      if (analysisDataUrl.length <= MAX_ANALYSIS_DATA_URL_LENGTH) break;
    }

    if (analysisDataUrl.length > MAX_ANALYSIS_DATA_URL_LENGTH) {
      throw new Error('Image is still too large after optimization. Please retake it a little farther back.');
    }

    const bgRemovalBlob = await resizeImageToBlob(image.source, image.width, image.height, BG_REMOVAL_MAX_EDGE, 0.82);
    const bgRemovalDataUrl = await blobToDataUrl(bgRemovalBlob);
    return { analysisDataUrl, bgRemovalDataUrl };
  } finally {
    image.close();
  }
}

function isAbortError(err: unknown) {
  return (
    err instanceof DOMException && err.name === 'AbortError'
  ) || (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    (err as { name?: string }).name === 'AbortError'
  );
}

function normalizeQueueStatus(value: unknown): QueueStatus | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const data = value as Partial<QueueStatus>;
  const queueCount = Number(data.queueCount);
  const queueLimit = Number(data.queueLimit || 50);

  if (!Number.isFinite(queueCount) || queueCount <= 0 || !Number.isFinite(queueLimit) || queueLimit <= 0) {
    return null;
  }

  return {
    queueCount,
    queueLimit,
    queueLabel: data.queueLabel || `Queue: ${queueCount}/${queueLimit}`,
    queuePosition: data.queuePosition,
    queueFullMessage: data.queueFullMessage,
  };
}

function cameraWarningMessage(err: unknown, fallback: string) {
  const data = err && typeof err === 'object' && 'data' in err
    ? (err as { data?: unknown }).data
    : null;
  const queueStatus = normalizeQueueStatus(data);
  const queueMessage = data && typeof data === 'object' && 'queueFullMessage' in data
    ? String((data as { queueFullMessage?: unknown }).queueFullMessage || '')
    : '';
  if (queueStatus && queueMessage) {
    return `${(err as Error).message || fallback} ${queueMessage}`;
  }

  const message = err instanceof Error ? err.message : '';
  if (/failed to fetch|networkerror|network request failed/i.test(message)) {
    return 'Cannot reach the CookMate API. Make sure the API server is running and the web app can access it.';
  }
  if (/timed out|timeout/i.test(message)) {
    return 'AI Camera is taking longer than usual. Please wait 1-2 minutes, then try again.';
  }
  return message || fallback;
}


export default function AICamera() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [cutoutUrl, setCutoutUrl] = useState<string | null>(null);
  const [bgRemovalDone, setBgRemovalDone] = useState(false);
  const [bgRemovalProgress, setBgRemovalProgress] = useState('');
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queuePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activePreviewUrlRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);
  const analysisAbortRef = useRef<AbortController | null>(null);
  const bgRemovalAbortRef = useRef<AbortController | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const isInitialLoading = useInitialContentLoading();

  const replacePreviewImage = useCallback((nextUrl: string | null) => {
    const previousUrl = activePreviewUrlRef.current;
    if (previousUrl && previousUrl !== nextUrl) {
      URL.revokeObjectURL(previousUrl);
    }
    activePreviewUrlRef.current = nextUrl;
    setImage(nextUrl);
  }, []);

  const startCooldown = useCallback(() => {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setCooldown(20);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const abortInFlightRequests = useCallback(() => {
    analysisAbortRef.current?.abort();
    bgRemovalAbortRef.current?.abort();
    analysisAbortRef.current = null;
    bgRemovalAbortRef.current = null;
  }, []);

  const stopQueuePolling = useCallback(() => {
    if (queuePollRef.current) {
      clearInterval(queuePollRef.current);
      queuePollRef.current = null;
    }
  }, []);

  const startQueuePolling = useCallback((requestId: number) => {
    stopQueuePolling();

    const refresh = async () => {
      try {
        const status = await api.get<QueueStatus>('/api/ml/image-analysis/queue');
        if (requestIdRef.current === requestId) {
          setQueueStatus(normalizeQueueStatus(status));
        }
      } catch {
        // Queue status is helpful context, not a blocker for analysis.
      }
    };

    refresh();
    queuePollRef.current = setInterval(refresh, 1500);
  }, [stopQueuePolling]);

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      abortInFlightRequests();
      stopQueuePolling();
      if (cooldownRef.current) clearInterval(cooldownRef.current);
      if (activePreviewUrlRef.current) {
        URL.revokeObjectURL(activePreviewUrlRef.current);
      }
    };
  }, [abortInFlightRequests, stopQueuePolling]);

  /* Phase sequencer - keeps the sticker animation quick while bg removal finishes in the background */
  useEffect(() => {
    if (phase === 'scanning') {
      const t = setTimeout(() => setPhase('selecting'), 1200);
      return () => clearTimeout(t);
    }
    if (phase === 'selecting') {
      const t = setTimeout(() => setPhase('selected'), 1000);
      return () => clearTimeout(t);
    }
    if (phase === 'selected') {
      const t = setTimeout(() => setPhase('sticker'), bgRemovalDone ? 320 : 650);
      return () => clearTimeout(t);
    }
    if (phase === 'sticker') {
      const t = setTimeout(() => setPhase('done'), 1200);
      return () => clearTimeout(t);
    }
  }, [phase, bgRemovalDone]);

  /* ── Background removal ── */
  const startBgRemoval = useCallback(async (imageDataUrl: string, requestId: number) => {
    bgRemovalAbortRef.current?.abort();
    const controller = new AbortController();
    bgRemovalAbortRef.current = controller;
    setBgRemovalDone(false);
    setCutoutUrl(null);
    setBgRemovalProgress('Removing background...');
    try {
      const result = await api.post<BackgroundRemovalResult>(
        '/api/ml/camera/remove-bg',
        { image: imageDataUrl },
        undefined,
        { signal: controller.signal }
      );
      if (requestIdRef.current !== requestId) return;
      const nextCutout = result.cutout || result.cutoutUri || result.image || null;
      if (nextCutout) {
        setCutoutUrl(nextCutout);
      }
    } catch (err) {
      if (isAbortError(err) || requestIdRef.current !== requestId) return;
      console.warn('Background removal warning:', cameraWarningMessage(err, 'Background removal is temporarily unavailable. The original photo will be used.'));
      // Fallback: no cutout, sticker will use original image with border
    } finally {
      if (bgRemovalAbortRef.current === controller) {
        bgRemovalAbortRef.current = null;
      }
      if (requestIdRef.current === requestId) {
        setBgRemovalDone(true);
        setBgRemovalProgress('');
      }
    }
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (cooldown > 0) {
      setError(`Please wait ${cooldown}s before analyzing another image.`);
      e.target.value = '';
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_UPLOAD_FILE_SIZE) {
      setError('Image too large. Max 12MB.');
      e.target.value = '';
      return;
    }

    const requestId = requestIdRef.current + 1;
    abortInFlightRequests();
    requestIdRef.current = requestId;
    const previewUrl = URL.createObjectURL(file);

    replacePreviewImage(previewUrl);
    setAnalysis(null);
    setError(null);
    setCutoutUrl(null);
    setBgRemovalDone(false);
    setBgRemovalProgress('');
    setQueueStatus(null);
    setLoading(true);
    setPhase('scanning');

    try {
      await yieldToBrowser();
      const prepared = await prepareCameraImage(file, previewUrl);
      if (requestIdRef.current !== requestId) return;

      await startBgRemoval(prepared.bgRemovalDataUrl, requestId);
      if (requestIdRef.current !== requestId) return;
      await analyzeImage(prepared.analysisDataUrl, requestId);
    } catch (err: any) {
      if (requestIdRef.current === requestId) {
        setError(err?.message || 'Image could not be prepared. Please try another photo.');
        setBgRemovalDone(true);
        setLoading(false);
        setPhase('done');
      }
    } finally {
      e.target.value = '';
    }
  };

  const analyzeImage = async (base64: string, requestId: number) => {
    analysisAbortRef.current?.abort();
    const controller = new AbortController();
    analysisAbortRef.current = controller;
    setLoading(true);
    setError(null);
    startQueuePolling(requestId);
    try {
      const result = await api.post<AnalysisResult>(
        '/api/ml/analyze-ingredients',
        { image: base64 },
        undefined,
        { signal: controller.signal }
      );
      if (requestIdRef.current === requestId) {
        setAnalysis(result);
        setQueueStatus(normalizeQueueStatus(result));
        startCooldown();
      }
    } catch (err: any) {
      if (isAbortError(err)) return;
      if (requestIdRef.current !== requestId) return;
      console.warn('Analysis warning:', err);
      const nextQueueStatus = normalizeQueueStatus(err?.data);
      const nextMessage = cameraWarningMessage(err, 'Analysis is temporarily unavailable. Please try again.');
      setQueueStatus(nextQueueStatus);
      setError(nextMessage);
      if (nextQueueStatus?.queueFullMessage) {
        toast.warning('AI Camera Busy', {
          description: nextMessage,
        });
      }
      startCooldown();
    } finally {
      if (analysisAbortRef.current === controller) {
        analysisAbortRef.current = null;
      }
      if (requestIdRef.current === requestId) {
        stopQueuePolling();
        setLoading(false);
      }
    }
  };

  const handleReset = () => {
    requestIdRef.current += 1;
    abortInFlightRequests();
    stopQueuePolling();
    replacePreviewImage(null); setAnalysis(null); setError(null); setPhase('idle');
    setCutoutUrl(null); setBgRemovalDone(false); setBgRemovalProgress(''); setQueueStatus(null); setLoading(false);
    fileInputRef.current?.click();
  };

  if (isInitialLoading) return <Layout><AICameraPageSkeleton /></Layout>;

  const bgDim = phase === 'selected' || phase === 'sticker' || phase === 'done';
  const showCorners = phase === 'selecting' || phase === 'selected';
  const showGlowOutline = phase === 'selected';
  const showSticker = phase === 'sticker' || phase === 'done';
  const analysisOutputReady = phase === 'done';
  const showAnalysisSkeleton = Boolean(image) && (!analysisOutputReady || loading);
  const showAnalysisError = Boolean(error) && analysisOutputReady && !loading && !analysis;
  const showAnalysisResult = Boolean(analysis) && analysisOutputReady && !loading;
  const hasDetectedIngredients = Boolean(analysis?.detectedIngredients?.length);
  const matchedRecipes = showAnalysisResult ? (analysis?.matchedRecipes || []) : [];
  const topRecipe = matchedRecipes[0] || undefined;
  const otherRecipes = matchedRecipes.slice(1, 8);
  const noFoodDetected = analysis?.success === false || !hasDetectedIngredients;
  const confidenceColor = (c: string) => c === 'high' ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30' : c === 'medium' ? 'bg-amber-500/20 text-amber-200 border-amber-400/30' : 'bg-red-500/20 text-red-200 border-red-400/30';
  const visibleQueueStatus = queueStatus || normalizeQueueStatus(analysis);

  return (
    <Layout>
      <style>{`
        @keyframes corner-pulse { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }
        @keyframes glow-pulse { 0%, 100% { box-shadow: 0 0 20px 6px rgba(249,115,22,0.45), 0 0 60px 10px rgba(249,115,22,0.18); } 50% { box-shadow: 0 0 30px 10px rgba(249,115,22,0.65), 0 0 80px 18px rgba(249,115,22,0.3); } }
      `}</style>

      <div className="mx-auto w-full max-w-6xl px-4 py-12 animate-fade-up sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 rounded-full text-orange-600 font-bold text-sm mb-4 dark:bg-emerald-500/10 dark:border dark:border-emerald-500/20 dark:text-emerald-400">
            <Sparkles size={16} /> Powered by Gemini AI
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-stone-900 tracking-tight dark:text-white">AI Kitchen Camera</h1>
          <p className="text-lg text-stone-500 max-w-2xl mx-auto dark:text-stone-400">Snap a photo of your fridge or a prepared dish, and we'll instantly identify the ingredients and suggest recipes.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* ════ Camera / Upload ════ */}
          <div className="w-full">
            <div onClick={() => !image && fileInputRef.current?.click()} className={cn(
              "aspect-[4/5] sm:aspect-square w-full rounded-[2.5rem] overflow-hidden relative transition-all shadow-xl",
              image ? "border-none shadow-stone-200/50 dark:shadow-black/50" : "border-4 border-dashed border-stone-200 bg-white hover:border-orange-400 cursor-pointer flex flex-col items-center justify-center group dark:border-stone-700 dark:bg-stone-900/50 dark:hover:border-orange-500/60"
            )}>
              {image ? (
                <div className="relative w-full h-full overflow-hidden bg-stone-900">
                  {/* Background image — dims during selection */}
                  <motion.img src={image} alt="Upload" className="w-full h-full object-cover absolute inset-0"
                    animate={{ opacity: bgDim ? 0.15 : 1 }} transition={{ duration: 0.6 }} />

                  {/* Scan line */}
                  <AnimatePresence>
                    {phase === 'scanning' && (
                      <motion.div className="absolute left-0 right-0 h-1 z-20"
                        style={{ background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.9), rgba(255,255,255,0.95), rgba(249,115,22,0.9), transparent)', boxShadow: '0 0 30px rgba(249,115,22,0.5)' }}
                        initial={{ top: '-2%' }} animate={{ top: '102%' }} exit={{ opacity: 0 }}
                        transition={{ duration: 1.1, ease: 'easeInOut' }} />
                    )}
                  </AnimatePresence>

                  {/* Corner brackets */}
                  <AnimatePresence>
                    {showCorners && (
                      <motion.div className="absolute z-20" style={{ inset: phase === 'selecting' ? '8%' : '12%', animation: 'corner-pulse 1s ease-in-out infinite' }}
                        initial={{ inset: '4%', opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-orange-400 rounded-tl-lg" />
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-orange-400 rounded-tr-lg" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-orange-400 rounded-bl-lg" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-orange-400 rounded-br-lg" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Object highlight glow */}
                  <AnimatePresence>
                    {showGlowOutline && (
                      <motion.div className="absolute z-15 rounded-[1.5rem] overflow-hidden"
                        style={{ inset: '14%', animation: 'glow-pulse 1.2s ease-in-out infinite' }}
                        initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.5 }}>
                        <img src={image} alt="" className="w-full h-full object-cover" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* ══ STICKER — real cutout with white outline ══ */}
                  <AnimatePresence>
                    {showSticker && (
                      <motion.div className="absolute inset-0 flex items-center justify-center z-20"
                        initial={{ scale: 0.4, opacity: 0, rotate: -6 }}
                        animate={{ scale: [0.4, 1.1, 0.96, 1.02, 1], opacity: 1, rotate: [-6, 3, -1.5, 0.5, 0] }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], times: [0, 0.35, 0.55, 0.75, 1] }}>
                        {cutoutUrl ? (
                          /* Real cutout with white outline baked in */
                          <img src={cutoutUrl} alt="Sticker cutout"
                            className="max-w-[80%] max-h-[70vh] object-contain"
                            style={{ filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.35))' }} />
                        ) : (
                          /* Fallback: bordered image */
                          <div className="rounded-[1.8rem] overflow-hidden" style={{ padding: '6px', background: '#fff', maxWidth: '76%', boxShadow: '0 0 0 4px rgba(249,115,22,0.35), 0 16px 48px rgba(0,0,0,0.25)' }}>
                            <img src={image} alt="Sticker" className="w-full h-auto rounded-[1.4rem] object-cover" style={{ maxHeight: '65vh' }} />
                          </div>
                        )}
                        <motion.div className="absolute -top-2 -right-1 text-orange-400" initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} transition={{ delay: 0.35, duration: 0.45 }}><Sparkles size={26} /></motion.div>
                        <motion.div className="absolute -bottom-1 -left-1 text-orange-300" initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 1] }} transition={{ delay: 0.5, duration: 0.45 }}><Sparkles size={18} /></motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Phase badges */}
                  <AnimatePresence mode="wait">
                    {phase === 'scanning' && (
                      <motion.div key="scan" className="absolute top-6 left-1/2 -translate-x-1/2 z-30" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <div className="flex items-center gap-2 px-5 py-2.5 bg-black/60 backdrop-blur-md rounded-full">
                          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><ScanLine size={16} className="text-orange-400" /></motion.div>
                          <span className="text-white text-sm font-bold tracking-wide">Scanning image…</span>
                        </div>
                      </motion.div>
                    )}
                    {phase === 'selecting' && (
                      <motion.div key="selecting" className="absolute top-6 left-1/2 -translate-x-1/2 z-30" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <div className="flex items-center gap-2 px-5 py-2.5 bg-black/60 backdrop-blur-md rounded-full">
                          <motion.div animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 0.8, repeat: Infinity }}><Focus size={16} className="text-orange-400" /></motion.div>
                          <span className="text-white text-sm font-bold tracking-wide">Selecting object…</span>
                        </div>
                      </motion.div>
                    )}
                    {phase === 'selected' && (
                      <motion.div key="selected" className="absolute top-6 left-1/2 -translate-x-1/2 z-30" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <div className="flex items-center gap-2 px-5 py-2.5 bg-orange-500/80 backdrop-blur-md rounded-full shadow-lg shadow-orange-500/25">
                          <Sparkles size={16} className="text-white" />
                          <span className="text-white text-sm font-bold tracking-wide">
                            {bgRemovalDone ? 'Object detected!' : bgRemovalProgress || 'Removing background…'}
                          </span>
                        </div>
                      </motion.div>
                    )}
                    {phase === 'sticker' && (
                      <motion.div key="sticker" className="absolute top-6 left-1/2 -translate-x-1/2 z-30" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                        <div className="flex items-center gap-2 px-5 py-2.5 bg-orange-500/90 backdrop-blur-md rounded-full shadow-lg shadow-orange-500/25">
                          <Sparkles size={16} className="text-white" />
                          <span className="text-white text-sm font-bold tracking-wide">Sticker created! ✨</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Retake overlay */}
                  <AnimatePresence>
                    {phase === 'done' && (
                      <motion.div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-900/80 via-stone-900/20 to-transparent flex flex-col justify-end p-8 z-30"
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Button onClick={handleReset} disabled={cooldown > 0} variant="secondary" className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border-none rounded-full py-6 font-bold shadow-lg disabled:opacity-50">
                          <RefreshCcw size={20} className="mr-2" /> {cooldown > 0 ? `Wait ${cooldown}s` : 'Retake Photo'}
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="text-center space-y-6 p-8 relative z-10">
                  <div className="w-24 h-24 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300 shadow-inner dark:bg-stone-800 dark:border dark:border-stone-700"><Camera size={48} /></div>
                  <div><h3 className="text-2xl font-bold text-stone-900 mb-2 dark:text-white">{cooldown > 0 ? `Please wait ${cooldown}s` : 'Tap to take a photo'}</h3><p className="text-stone-500">{cooldown > 0 ? 'Cooldown active before next analysis' : 'or browse files from your device'}</p></div>
                  <div className="inline-flex items-center gap-2 text-orange-500 font-bold mt-4"><Upload size={20} /> Upload Image</div>
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept="image/*" capture="environment" />
            </div>
          </div>

          {/* ════ Analysis Section ════ */}
          <div className="w-full h-full">
            {showAnalysisError ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="rounded-[2.5rem] border-red-100 shadow-xl overflow-hidden bg-white dark:bg-stone-900 dark:border-red-500/20">
                  <div className="bg-gradient-to-r from-red-600 to-red-500 flex items-center gap-3 p-6 text-white">
                    <div className="p-2 bg-white/20 rounded-xl"><AlertTriangle size={24} /></div>
                    <h3 className="text-xl font-bold">AI Camera Warning</h3>
                  </div>
                  <CardContent className="p-8 space-y-6">
                    <p className="text-stone-600 dark:text-stone-300">{error}</p>
                    <Button onClick={handleReset} disabled={cooldown > 0} className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-full py-6 font-bold disabled:opacity-50"><RefreshCcw size={18} className="mr-2" /> {cooldown > 0 ? `Wait ${cooldown}s` : 'Try Again'}</Button>
                  </CardContent>
                </Card>
              </motion.div>
            ) : showAnalysisSkeleton ? (
              <div className="space-y-3">
                {visibleQueueStatus && (
                  <div className="rounded-[1.5rem] border border-orange-100 bg-white px-5 py-3 text-sm font-bold text-orange-700 shadow-sm dark:border-orange-500/20 dark:bg-stone-900 dark:text-orange-300">
                    {visibleQueueStatus.queueLabel}
                    {visibleQueueStatus.queuePosition ? ` - Position ${visibleQueueStatus.queuePosition}` : ''}
                  </div>
                )}
                <CameraAnalysisSkeleton />
              </div>
            ) : showAnalysisResult && analysis ? (
              <>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="rounded-[2.5rem] border-stone-100 shadow-xl shadow-stone-200/50 overflow-hidden bg-white flex flex-col dark:bg-stone-900 dark:border-stone-800 dark:shadow-black/50">
                  <div className="orange-gradient flex flex-col justify-between gap-4 p-6 text-white sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-500/20 rounded-xl"><Sparkles size={24} className="text-orange-400" /></div>
                      <h3 className="text-xl font-bold">Analysis Complete</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {visibleQueueStatus && (
                        <Badge className="border border-white/20 bg-white/15 px-3 py-1.5 font-bold text-white">
                          {visibleQueueStatus.queueLabel}
                        </Badge>
                      )}
                      {hasDetectedIngredients && (
                        <Badge className={cn("border px-3 py-1.5 font-bold capitalize", confidenceColor(analysis.detectedIngredients[0]?.confidence || 'medium'))}>
                          {analysis.detectedIngredients.length} ingredient{analysis.detectedIngredients.length !== 1 ? 's' : ''} detected
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardContent className="p-8 flex-1 flex flex-col justify-between">
                    <div className="space-y-8">
                      <div>
                        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3 flex items-center gap-2 dark:text-stone-500"><ChefHat size={16} /> Detected Ingredients</p>
                        {analysis.detectedIngredients.length > 0 ? (
                          <div className="space-y-3">
                            {analysis.detectedIngredients.map((ing) => (
                              <div key={ing.name} className="bg-stone-50 border border-stone-100 rounded-2xl p-4 dark:bg-stone-800/60 dark:border-stone-700/50">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-bold text-stone-900 capitalize dark:text-white">{ing.name}</span>
                                  <Badge className={cn("border px-2 py-0.5 text-xs font-bold capitalize", confidenceColor(ing.confidence))}>{ing.confidence}</Badge>
                                </div>
                                <p className="text-sm text-stone-500 leading-relaxed dark:text-stone-400">{ing.description}</p>
                              </div>
                            ))}
                          </div>
                        ) : <p className="text-stone-400 italic dark:text-stone-500">No ingredients detected</p>}
                      </div>
                    </div>
                    {topRecipe ? (
                      <div className="mt-8 pt-8 border-t border-stone-100 dark:border-stone-800">
                        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4 dark:text-stone-500">Suggested Recipe</p>
                        <Link to={`/recipe/${topRecipe.id}`} className="block group">
                          <div className="flex gap-4 rounded-2xl border border-stone-200 bg-stone-50 p-3 transition-all group-hover:shadow-lg dark:border-stone-700/50 dark:bg-stone-800/60 dark:group-hover:border-orange-500/30">
                            <div className="w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-stone-200 dark:bg-stone-700">
                              {topRecipe.image_url ? (
                                <img src={topRecipe.image_url} alt={topRecipe.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-stone-400 dark:text-stone-500"><ChefHat size={28} /></div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 py-1">
                              <div className="flex items-start justify-between gap-2">
                                <h5 className="font-bold text-base text-stone-900 truncate group-hover:text-orange-600 transition-colors dark:text-white dark:group-hover:text-orange-400">{topRecipe.title}</h5>
                                <ArrowRight size={16} className="text-orange-500 mt-0.5 shrink-0 group-hover:translate-x-1 transition-transform" />
                              </div>
                              {topRecipe.description && <p className="text-stone-500 text-sm leading-relaxed line-clamp-2 mt-1 dark:text-stone-400">{topRecipe.description}</p>}
                              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                {topRecipe.matchedIngredients.map((mi) => (
                                  <span key={mi} className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold capitalize dark:bg-orange-500/15 dark:text-orange-400">{mi}</span>
                                ))}
                              </div>
                              {(topRecipe.difficulty || topRecipe.cook_time || topRecipe.category) && (
                                <div className="flex items-center gap-3 mt-2 text-xs text-stone-400 dark:text-stone-500">
                                  {topRecipe.difficulty && <span>{topRecipe.difficulty}</span>}
                                  {topRecipe.cook_time && <span>{topRecipe.cook_time}</span>}
                                  {topRecipe.category && <span>{topRecipe.category}</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        </Link>
                      </div>
                    ) : (
                      <div className="mt-8 border-t border-stone-100 pt-8 dark:border-stone-800">
                        <div className="rounded-[2rem] border border-stone-200 bg-stone-50 p-6 dark:border-stone-700/50 dark:bg-stone-800/40">
                          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
                            {noFoodDetected ? 'No Food Items Detected' : 'No Database Match Yet'}
                          </p>
                          <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                            {analysis.message || (noFoodDetected
                              ? 'No recognizable cooking ingredient was detected. Please retake or upload a clearer ingredient photo.'
                              : 'CookMate found ingredients, but no published recipe in the database matches them yet.')}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* ════ More Recipes Carousel ════ */}
              {otherRecipes.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-widest dark:text-stone-500">More Recipes ({otherRecipes.length})</p>
                    <div className="flex gap-2">
                      <button onClick={() => carouselRef.current?.scrollBy({ left: -280, behavior: 'smooth' })} className="w-8 h-8 flex items-center justify-center rounded-full border border-stone-200 text-stone-400 hover:border-orange-400 hover:text-orange-500 transition-colors dark:border-stone-700 dark:text-stone-500 dark:hover:border-orange-500 dark:hover:text-orange-400"><ChevronLeft size={16} /></button>
                      <button onClick={() => carouselRef.current?.scrollBy({ left: 280, behavior: 'smooth' })} className="w-8 h-8 flex items-center justify-center rounded-full border border-stone-200 text-stone-400 hover:border-orange-400 hover:text-orange-500 transition-colors dark:border-stone-700 dark:text-stone-500 dark:hover:border-orange-500 dark:hover:text-orange-400"><ChevronRight size={16} /></button>
                    </div>
                  </div>
                  <div ref={carouselRef} className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {otherRecipes.map((recipe) => (
                      <Link key={recipe.id} to={`/recipe/${recipe.id}`} className="block group shrink-0 w-[240px]">
                        <div className="rounded-2xl border border-stone-200 bg-stone-50 overflow-hidden transition-all group-hover:shadow-lg group-hover:border-orange-300 dark:border-stone-700/50 dark:bg-stone-800/60 dark:group-hover:border-orange-500/30 h-full flex flex-col">
                          <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-200 dark:bg-stone-700">
                            {recipe.image_url ? (
                              <img src={recipe.image_url} alt={recipe.title} loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-stone-400 dark:text-stone-500"><ChefHat size={32} /></div>
                            )}
                          </div>
                          <div className="p-4 flex-1 flex flex-col">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h5 className="font-bold text-sm text-stone-900 truncate group-hover:text-orange-600 transition-colors dark:text-white dark:group-hover:text-orange-400">{recipe.title}</h5>
                              <ArrowRight size={14} className="text-orange-500 mt-0.5 shrink-0 group-hover:translate-x-1 transition-transform" />
                            </div>
                            {recipe.description && <p className="text-stone-500 text-xs leading-relaxed line-clamp-2 mb-2 dark:text-stone-400">{recipe.description}</p>}
                            <div className="flex flex-wrap gap-1 mt-auto">
                              {recipe.matchedIngredients.slice(0, 2).map((mi) => (
                                <span key={mi} className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold capitalize dark:bg-orange-500/15 dark:text-orange-400">{mi}</span>
                              ))}
                            </div>
                            {(recipe.difficulty || recipe.cook_time || recipe.category) && (
                              <div className="flex items-center gap-2 mt-2 text-[10px] text-stone-400 dark:text-stone-500">
                                {recipe.difficulty && <span>{recipe.difficulty}</span>}
                                {recipe.cook_time && <span>{recipe.cook_time}</span>}
                                {recipe.category && <span>{recipe.category}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}
              </>
            ) : (
              <div className="flex h-full min-h-[400px] flex-col items-center justify-center space-y-6 rounded-[2.5rem] border border-dashed border-orange-200 bg-orange-50/60 p-12 text-center dark:border-stone-700 dark:bg-stone-900/30">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-orange-300 shadow-sm dark:bg-stone-800 dark:text-orange-400 dark:border dark:border-stone-700"><Sparkles size={40} /></div>
                <div className="max-w-xs">
                  <h3 className="text-xl font-bold text-stone-900 mb-2 dark:text-white">Waiting for Image</h3>
                  <p className="text-stone-500">Upload a photo to let CookMate's AI analyze your ingredients and suggest recipes.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

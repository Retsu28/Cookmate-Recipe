import { useState, useRef, useEffect, useContext } from 'react';
import { Alert } from 'react-native';
import { mlApi } from '../api/api';
import { offlineCache } from '../offline/cacheService';
import { AuthContext } from '../context/AuthContext';
import { useQueueSocket } from './useQueueSocket';

const MAX_SAVES = 20;

function normalizeQueueStatus(data) {
  if (!data || typeof data !== 'object') return null;
  const queueCount = Number(data.queueCount);
  const queueLimit = Number(data.queueLimit || 50);
  if (!Number.isFinite(queueCount) || queueCount <= 0 || !Number.isFinite(queueLimit) || queueLimit <= 0) return null;
  return {
    queueCount,
    queueLimit,
    queueLabel: data.queueLabel || `Queue: ${queueCount}/${queueLimit}`,
    queuePosition: data.queuePosition,
    queueFullMessage: data.queueFullMessage,
  };
}

function apiErrorMessage(err, fallback) {
  const queueStatus = normalizeQueueStatus(err.response?.data);
  if (queueStatus && err.response?.data?.queueFullMessage) {
    const busyMessage = err.response?.data?.message || err.response?.data?.error || fallback;
    return `${busyMessage} ${err.response.data.queueFullMessage}`;
  }
  const serverError = typeof err.response?.data?.error === 'string' ? err.response.data.error : '';
  if (serverError) return serverError;
  if (err.code === 'ECONNABORTED') return 'AI Camera is taking longer than usual. Please wait 1-2 minutes, then try again with a clearer photo.';
  return err.message || fallback;
}

export function useCameraAnalysis() {
  const { user } = useContext(AuthContext) || {};
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const [cutoutUri, setCutoutUri] = useState(null);
  const [bgRemovalDone, setBgRemovalDone] = useState(false);
  const [bgRemovalProgress, setBgRemovalProgress] = useState('');
  const [queueStatus, setQueueStatus] = useState(null);
  const [myQueuePosition, setMyQueuePosition] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const [rateLimitInfo, setRateLimitInfo] = useState(null);
  const [saves, setSaves] = useState([]);
  const [savesLoading, setSavesLoading] = useState(false);
  const [savesError, setSavesError] = useState(null);
  const [restoringSaveId, setRestoringSaveId] = useState(null);

  const requestIdRef = useRef(0);
  const savedRequestIdRef = useRef(0);
  const savingRequestIdRef = useRef(0);
  const cooldownRef = useRef(null);

  const isCurrentRequest = (id) => id === requestIdRef.current;

  const startCooldown = () => {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setCooldown(20);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) { clearInterval(cooldownRef.current); cooldownRef.current = null; return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const stopQueuePolling = () => { /* no-op — realtime via socket */ };
  const startQueuePolling = (_requestId) => { /* no-op — realtime via socket */ };

  const socketRef = useQueueSocket(
    (snapshot) => { setQueueStatus(normalizeQueueStatus(snapshot)); },
    (pos) => { setMyQueuePosition(pos.position); },
  );

  useEffect(() => {
    if (!user?.id) { setRateLimitInfo(null); return; }
    mlApi.getAiCameraRateLimit()
      .then((res) => {
        const data = res?.data;
        if (data && typeof data.remaining === 'number') {
          setRateLimitInfo({ remaining: data.remaining, resetAt: data.resetAt ?? null });
        }
      })
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
      stopQueuePolling();
    };
  }, []);

  const loadCameraSaves = async () => {
    setSavesLoading(true);
    setSavesError(null);
    try {
      const response = await mlApi.getAiCameraSaves({ limit: MAX_SAVES });
      const list = response.data?.saves || [];
      setSaves(list);
      if (list.length > 0) offlineCache.savedRecipes.upsertMany(list).catch(() => {});
    } catch (err) {
      try {
        const cachedRows = await offlineCache.savedRecipes.getAll({ limit: MAX_SAVES });
        const cached = cachedRows.map((r) => r.data).filter(Boolean);
        if (cached.length > 0) { setSaves(cached); setSavesError(null); }
        else setSavesError(apiErrorMessage(err, 'Failed to load saved AI Camera results.'));
      } catch {
        setSavesError(apiErrorMessage(err, 'Failed to load saved AI Camera results.'));
      }
    } finally {
      setSavesLoading(false);
    }
  };

  const analyzeImage = async (base64, requestId) => {
    setLoading(true);
    startQueuePolling(requestId);
    try {
      const sid = socketRef?.current?.id ?? null;
      const response = await mlApi.analyzeIngredients(base64, sid ? { 'X-Socket-Id': sid } : undefined);
      if (!isCurrentRequest(requestId)) return false;
      const remaining = response.headers?.['ratelimit-remaining'] ?? response.headers?.['x-ratelimit-remaining'];
      const reset = response.headers?.['ratelimit-reset'] ?? response.headers?.['x-ratelimit-reset'];
      if (remaining !== undefined && remaining !== null) {
        setRateLimitInfo({
          remaining: Number(remaining),
          resetAt: reset ? Number(reset) * 1000 : null,
        });
      }
      setAnalysisResult(response.data);
      setAnalysisError(null);
      setQueueStatus(normalizeQueueStatus(response.data));
      startCooldown();
      return true;
    } catch (err) {
      if (!isCurrentRequest(requestId)) return false;
      console.warn('[useCameraAnalysis] analyzeImage warning:', err);
      const nextQueueStatus = normalizeQueueStatus(err.response?.data);
      setQueueStatus(nextQueueStatus);
      const rlRemaining = err.response?.headers?.['ratelimit-remaining'] ?? err.response?.headers?.['x-ratelimit-remaining'];
      const rlReset = err.response?.headers?.['ratelimit-reset'] ?? err.response?.headers?.['x-ratelimit-reset'];
      if (rlRemaining !== undefined && rlRemaining !== null) {
        setRateLimitInfo({
          remaining: Number(rlRemaining),
          resetAt: rlReset ? Number(rlReset) * 1000 : null,
        });
      }
      const serverMessage = err.response?.data?.message;
      if (serverMessage) {
        const nextMessage = apiErrorMessage(err, serverMessage);
        setAnalysisError(nextMessage);
        if (nextQueueStatus?.queueFullMessage) Alert.alert('AI Camera Busy', nextMessage);
      } else {
        setAnalysisError(apiErrorMessage(err, 'Failed to analyze image.'));
      }
      setAnalysisResult(null);
      startCooldown();
      return false;
    } finally {
      stopQueuePolling();
      if (isCurrentRequest(requestId)) setLoading(false);
    }
  };

  const startBgRemoval = async (base64, requestId) => {
    setCutoutUri(null);
    setBgRemovalDone(false);
    setBgRemovalProgress('Removing background...');
    try {
      const response = await mlApi.removeCameraBackground(base64);
      if (!isCurrentRequest(requestId)) return;
      const rlRemaining = response.headers?.['ratelimit-remaining'] ?? response.headers?.['x-ratelimit-remaining'];
      const rlReset = response.headers?.['ratelimit-reset'] ?? response.headers?.['x-ratelimit-reset'];
      if (rlRemaining !== undefined && rlRemaining !== null) {
        setRateLimitInfo((prev) => {
          const next = { remaining: Number(rlRemaining), resetAt: rlReset ? Number(rlReset) * 1000 : null };
          if (prev === null) return next;
          return next.remaining < prev.remaining ? next : prev;
        });
      }
      const cutout = response.data?.cutout || response.data?.cutoutUri || response.data?.image || null;
      if (cutout) setCutoutUri(cutout);
      else console.warn('[useCameraAnalysis] removeBackground returned no cutout.');
    } catch (err) {
      if (!isCurrentRequest(requestId)) return;
      const rlRemaining = err.response?.headers?.['ratelimit-remaining'] ?? err.response?.headers?.['x-ratelimit-remaining'];
      const rlReset = err.response?.headers?.['ratelimit-reset'] ?? err.response?.headers?.['x-ratelimit-reset'];
      if (rlRemaining !== undefined && rlRemaining !== null) {
        setRateLimitInfo((prev) => {
          const next = { remaining: Number(rlRemaining), resetAt: rlReset ? Number(rlReset) * 1000 : null };
          if (prev === null) return next;
          return next.remaining < prev.remaining ? next : prev;
        });
      }
      console.warn('[useCameraAnalysis] removeBackground warning:', apiErrorMessage(err, 'Background removal unavailable.'));
    } finally {
      if (isCurrentRequest(requestId)) { setBgRemovalDone(true); setBgRemovalProgress(''); }
    }
  };

  const autoSaveResult = async ({ capturedImage, cutoutUri: cutout, analysisResult: result, currentOriginalImageData, phase }) => {
    const rid = requestIdRef.current;
    if (savedRequestIdRef.current === rid || savingRequestIdRef.current === rid) return;
    savingRequestIdRef.current = rid;
    try {
      const response = await mlApi.saveAiCameraResult({
        originalImageData: currentOriginalImageData,
        removedBackgroundImageData: cutout,
        thumbnailImageData: cutout || currentOriginalImageData,
        analysisResult: result,
        sourceType: 'capture',
      });
      if (!isCurrentRequest(rid)) return;
      const saved = response.data;
      setSaves((prev) => [saved, ...prev.filter((item) => item.id !== saved.id)].slice(0, MAX_SAVES));
      savedRequestIdRef.current = rid;
    } catch (err) {
      console.warn('[useCameraAnalysis] auto-save warning:', apiErrorMessage(err, 'Failed to save AI Camera result.'));
    } finally {
      if (savingRequestIdRef.current === rid) savingRequestIdRef.current = 0;
    }
  };

  const restoreSave = async (id, callbacks = {}) => {
    setRestoringSaveId(id);
    setSavesError(null);
    try {
      const response = await mlApi.getAiCameraSave(id);
      const saved = response.data;
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      savedRequestIdRef.current = requestId;
      savingRequestIdRef.current = 0;
      stopQueuePolling();
      setAnalysisResult(saved.analysisResult || saved.fullAnalysisResult);
      setAnalysisError(null);
      setCutoutUri(saved.removedBackgroundImageData || null);
      setBgRemovalDone(true);
      setBgRemovalProgress('');
      setQueueStatus(null);
      setLoading(false);
      if (callbacks.onRestored) callbacks.onRestored(saved, requestId);
    } catch (err) {
      setSavesError(apiErrorMessage(err, 'Failed to restore saved AI Camera result.'));
    } finally {
      setRestoringSaveId(null);
    }
  };

  const deleteSave = async (id) => {
    const previous = saves;
    setSaves((prev) => prev.filter((s) => s.id !== id));
    try {
      await mlApi.deleteAiCameraSave(id);
      offlineCache.savedRecipes.delete(id).catch(() => {});
    } catch (err) {
      setSaves(previous);
      setSavesError(apiErrorMessage(err, 'Failed to delete saved AI Camera result.'));
    }
  };

  const clearAllSaves = async () => {
    const previous = saves;
    setSaves([]);
    try {
      await Promise.all(previous.map((save) => mlApi.deleteAiCameraSave(save.id)));
      offlineCache.savedRecipes.clear().catch(() => {});
    } catch (err) {
      setSaves(previous);
      setSavesError(apiErrorMessage(err, 'Failed to clear saved AI Camera results.'));
    }
  };

  const newRequestId = () => {
    requestIdRef.current += 1;
    return requestIdRef.current;
  };

  return {
    loading, setLoading,
    analysisResult, setAnalysisResult,
    analysisError, setAnalysisError,
    cutoutUri, setCutoutUri,
    bgRemovalDone, setBgRemovalDone,
    bgRemovalProgress, setBgRemovalProgress,
    queueStatus, setQueueStatus,
    myQueuePosition,
    cooldown,
    rateLimitInfo, setRateLimitInfo,
    saves, setSaves,
    savesLoading,
    savesError, setSavesError,
    restoringSaveId,
    requestIdRef,
    savedRequestIdRef,
    savingRequestIdRef,
    isCurrentRequest,
    loadCameraSaves,
    analyzeImage,
    startBgRemoval,
    autoSaveResult,
    restoreSave,
    deleteSave,
    clearAllSaves,
    newRequestId,
    stopQueuePolling,
  };
}

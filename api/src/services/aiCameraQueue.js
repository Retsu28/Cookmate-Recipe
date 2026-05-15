const MAX_AI_CAMERA_QUEUE_SIZE = 50;
const CONFIGURED_ACTIVE = Number(process.env.GEMINI_IMAGE_ANALYSIS_ACTIVE_LIMIT || 1);
const MAX_AI_CAMERA_ACTIVE_REQUESTS = Number.isFinite(CONFIGURED_ACTIVE)
  ? Math.max(1, Math.min(CONFIGURED_ACTIVE, MAX_AI_CAMERA_QUEUE_SIZE))
  : 1;
const QUEUE_TIMEOUT_MS = 30 * 1000; // 30s max wait before auto-reject

const AI_CAMERA_QUEUE_WARNING =
  'AI Camera is busy. Your image is queued and will be analyzed automatically.';
const AI_CAMERA_BUSY_WARNING =
  'Image analysis is currently busy. Many users are analyzing images right now. Please wait and try again shortly.';
const AI_CAMERA_QUEUE_FULL = `Queue is full (${MAX_AI_CAMERA_QUEUE_SIZE}/${MAX_AI_CAMERA_QUEUE_SIZE}). Please wait until a slot becomes available.`;
const BG_REMOVAL_QUEUE_WARNING = 'AI Camera background removal is busy. Your image is queued.';

// Each entry: { run, reject, timeoutId, socketId }
const aiCameraQueue = [];
let aiCameraActiveRequests = 0;
let bgRemovalQueue = Promise.resolve();
let bgRemovalQueueSize = 0;

// Socket.io namespace — injected after server starts
let _queueIo = null;
function setQueueIo(io) { _queueIo = io; }

// ── Snapshot ────────────────────────────────────────────────────────────────
function getAiCameraQueueSnapshot() {
  const queueCount = aiCameraActiveRequests + aiCameraQueue.length;
  return {
    queueCount,
    queueLimit: MAX_AI_CAMERA_QUEUE_SIZE,
    queueLabel: queueCount > 0
      ? `Queue: ${queueCount}/${MAX_AI_CAMERA_QUEUE_SIZE}`
      : 'Queue: 0 — ready',
    activeCount: aiCameraActiveRequests,
    waitingCount: aiCameraQueue.length,
    idle: queueCount === 0,
  };
}

// ── Broadcasts ───────────────────────────────────────────────────────────────
function broadcastQueueUpdate() {
  if (!_queueIo) return;
  const snapshot = getAiCameraQueueSnapshot();
  // Broadcast global snapshot to all clients
  _queueIo.emit('queue:update', snapshot);
  // Broadcast live position update to each waiting socket
  aiCameraQueue.forEach((entry, idx) => {
    if (!entry.socketId) return;
    const pos = aiCameraActiveRequests + idx + 1;
    _queueIo.to(entry.socketId).emit('queue:position', {
      position: pos,
      queueCount: snapshot.queueCount,
      queueLimit: snapshot.queueLimit,
    });
  });
}

// ── Errors ───────────────────────────────────────────────────────────────────
function buildQueueFullError() {
  const snapshot = getAiCameraQueueSnapshot();
  const err = new Error(AI_CAMERA_BUSY_WARNING);
  err.code = 'AI_IMAGE_ANALYSIS_QUEUE_FULL';
  err.status = 429;
  err.queueCount = snapshot.queueCount;
  err.queueLimit = snapshot.queueLimit;
  err.queueLabel = `Queue: ${snapshot.queueLimit}/${snapshot.queueLimit}`;
  err.queueFullMessage = AI_CAMERA_QUEUE_FULL;
  return err;
}

function buildTimeoutError() {
  const err = new Error('AI Camera queue timed out. Please try again.');
  err.code = 'AI_IMAGE_ANALYSIS_QUEUE_TIMEOUT';
  err.status = 503;
  return err;
}

// ── Main enqueue ─────────────────────────────────────────────────────────────
function enqueueAiCameraAnalysis(task, { socketId } = {}) {
  const startNextQueuedAnalysis = () => {
    if (aiCameraActiveRequests >= MAX_AI_CAMERA_ACTIVE_REQUESTS) return;
    const entry = aiCameraQueue.shift();
    if (entry) {
      clearTimeout(entry.timeoutId);
      entry.run();
      broadcastQueueUpdate();
    }
  };

  return new Promise((resolve, reject) => {
    const currentQueueCount = aiCameraActiveRequests + aiCameraQueue.length;
    if (currentQueueCount >= MAX_AI_CAMERA_QUEUE_SIZE) {
      reject(buildQueueFullError());
      return;
    }

    const queuePosition = currentQueueCount + 1;
    const queueInfo = {
      queuePosition,
      queueCount: queuePosition,
      queueLimit: MAX_AI_CAMERA_QUEUE_SIZE,
      queueLabel: `Queue: ${queuePosition}/${MAX_AI_CAMERA_QUEUE_SIZE}`,
      queued: aiCameraActiveRequests >= MAX_AI_CAMERA_ACTIVE_REQUESTS,
      queueWarning: queuePosition > 1 ? AI_CAMERA_QUEUE_WARNING : null,
    };

    const run = () => {
      aiCameraActiveRequests += 1;
      broadcastQueueUpdate();
      Promise.resolve()
        .then(() => task(queueInfo))
        .then(resolve, reject)
        .finally(() => {
          aiCameraActiveRequests = Math.max(0, aiCameraActiveRequests - 1);
          broadcastQueueUpdate();
          startNextQueuedAnalysis();
        });
    };

    if (aiCameraActiveRequests < MAX_AI_CAMERA_ACTIVE_REQUESTS) {
      run();
      return;
    }

    // Queue the entry with a timeout guard
    const entry = { run, reject, socketId, timeoutId: null };
    entry.timeoutId = setTimeout(() => {
      const idx = aiCameraQueue.indexOf(entry);
      if (idx !== -1) {
        aiCameraQueue.splice(idx, 1);
        broadcastQueueUpdate();
        reject(buildTimeoutError());
      }
    }, QUEUE_TIMEOUT_MS);

    aiCameraQueue.push(entry);
    broadcastQueueUpdate();
  });
}

function enqueueBackgroundRemoval(task) {
  const queuePosition = bgRemovalQueueSize;
  bgRemovalQueueSize += 1;

  const run = bgRemovalQueue
    .catch(() => {})
    .then(() => task({ queuePosition }));

  bgRemovalQueue = run
    .finally(() => { bgRemovalQueueSize = Math.max(0, bgRemovalQueueSize - 1); })
    .catch(() => {});

  return run;
}

module.exports = {
  enqueueAiCameraAnalysis,
  enqueueBackgroundRemoval,
  getAiCameraQueueSnapshot,
  setQueueIo,
  AI_CAMERA_QUEUE_WARNING,
  AI_CAMERA_BUSY_WARNING,
  BG_REMOVAL_QUEUE_WARNING,
};

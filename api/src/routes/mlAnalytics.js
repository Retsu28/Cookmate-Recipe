const { Router } = require('express');
const http = require('http');
const https = require('https');
const requireAdmin = require('../middleware/requireAdmin');

const router = Router();

const ML_SERVICE_HOST = process.env.ML_SERVICE_HOST || 'localhost';
const isLocalHost = ML_SERVICE_HOST === 'localhost' || ML_SERVICE_HOST === '127.0.0.1';
const useHttps = process.env.ML_SERVICE_HTTPS === 'true' || (!isLocalHost && process.env.ML_SERVICE_HTTPS !== 'false');
const ML_SERVICE_PORT = parseInt(process.env.ML_SERVICE_PORT || (useHttps ? '443' : '8001'), 10);
const transport = useHttps ? https : http;

const TIMEOUT_MS   = 15_000;
const MAX_RETRIES  = 2;
const RETRY_BASE_MS = 300;

// ── Circuit breaker state ──────────────────────────────────────────────────
const CB_FAILURE_THRESHOLD = 3;   // open after this many consecutive failures
const CB_RESET_MS = 30_000;       // half-open probe after 30 s

const _cb = {
  failures: 0,
  openAt: null,     // Date.now() when circuit opened
  state() {
    if (this.openAt === null) return 'closed';
    if (Date.now() - this.openAt >= CB_RESET_MS) return 'half-open';
    return 'open';
  },
  onSuccess() { this.failures = 0; this.openAt = null; },
  onFailure() {
    this.failures += 1;
    if (this.failures >= CB_FAILURE_THRESHOLD) this.openAt = Date.now();
  },
};

/**
 * Issue one raw HTTP(S) GET to the ML service and resolve with
 * { statusCode, body } or reject on network error / timeout.
 */
function _rawRequest(mlPath) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: ML_SERVICE_HOST,
      port: ML_SERVICE_PORT,
      path: `/ml${mlPath}`,
      method: 'GET',
      headers: { Accept: 'application/json' },
    };

    const req = transport.request(options, (proxyRes) => {
      let body = '';
      proxyRes.setEncoding('utf8');
      proxyRes.on('data', (chunk) => { body += chunk; });
      proxyRes.on('end', () => resolve({ statusCode: proxyRes.statusCode || 200, body }));
    });

    req.on('error', reject);
    req.setTimeout(TIMEOUT_MS, () => {
      req.destroy(new Error('ML service timed out.'));
    });
    req.end();
  });
}

/**
 * Forward a GET request to the FastAPI ML service with:
 *  - circuit breaker (opens after CB_FAILURE_THRESHOLD consecutive failures)
 *  - up to MAX_RETRIES retries with exponential back-off
 * Returns { error, offline: true } with 503 when all attempts fail.
 */
function proxyToML(mlPath) {
  return async (req, res) => {
    const cbState = _cb.state();
    if (cbState === 'open') {
      console.warn(`[mlAnalytics] Circuit OPEN — refusing request to ${mlPath}`);
      return res.status(503).json({
        error: 'ML service is temporarily unavailable (circuit open). Retry in a moment.',
        offline: true,
      });
    }

    let lastErr;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, RETRY_BASE_MS * 2 ** (attempt - 1)));
      }
      try {
        const { statusCode, body } = await _rawRequest(mlPath);
        _cb.onSuccess();
        return res.status(statusCode).set('Content-Type', 'application/json').send(body);
      } catch (err) {
        lastErr = err;
        console.warn(`[mlAnalytics] Attempt ${attempt + 1}/${MAX_RETRIES + 1} failed for ${mlPath}: ${err.message}`);
      }
    }

    _cb.onFailure();
    console.error(`[mlAnalytics] All retries exhausted for ${mlPath}:`, lastErr?.message);
    return res.status(503).json({
      error: 'ML service is currently unavailable.',
      offline: true,
    });
  };
}

router.get('/trending-forecast', requireAdmin, proxyToML('/trending-forecast'));
router.get('/churn-risk',        requireAdmin, proxyToML('/churn-risk'));
router.get('/ingredient-gaps',   requireAdmin, proxyToML('/ingredient-gaps'));
router.get('/traffic-forecast',  requireAdmin, proxyToML('/traffic-forecast'));
router.get('/model-status',      requireAdmin, proxyToML('/model-status'));
router.get('/drift-report',      requireAdmin, proxyToML('/drift-report'));

module.exports = router;

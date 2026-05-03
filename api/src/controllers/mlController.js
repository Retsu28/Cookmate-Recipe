const natural = require('natural');
const { fork } = require('child_process');
const path = require('path');
const { pool } = require('../config/db');

const tokenizer = new natural.WordTokenizer();

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'assorted', 'cooked', 'dish', 'food',
  'fresh', 'image', 'in', 'ingredient', 'ingredients', 'item', 'main',
  'object', 'of', 'on', 'or', 'piece', 'pieces', 'raw', 'sliced', 'the',
  'visible', 'unknown', 'unidentified', 'with',
]);

const DEFAULT_GEMINI_MODELS = [
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
];
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 45000);
const MAX_BASE64_LENGTH = 7 * 1024 * 1024; // roughly a 5MB image
const MAX_SAVE_IMAGE_DATA_LENGTH = 8 * 1024 * 1024;
const MAX_AI_CAMERA_SAVE_LIST = 50;
const BG_REMOVAL_TIMEOUT_MS = Number(process.env.BG_REMOVAL_TIMEOUT_MS || 90000);
const ML_LOOKUP_CACHE_TTL_MS = Number(process.env.ML_LOOKUP_CACHE_TTL_MS || 5 * 60 * 1000);
const AI_ANALYSIS_UNAVAILABLE = 'AI analysis is temporarily unavailable. Please try again.';
const MAX_AI_CAMERA_QUEUE_SIZE = 50;
const CONFIGURED_AI_CAMERA_ACTIVE_REQUESTS = Number(process.env.GEMINI_IMAGE_ANALYSIS_ACTIVE_LIMIT || 1);
const MAX_AI_CAMERA_ACTIVE_REQUESTS = Number.isFinite(CONFIGURED_AI_CAMERA_ACTIVE_REQUESTS)
  ? Math.max(1, Math.min(CONFIGURED_AI_CAMERA_ACTIVE_REQUESTS, MAX_AI_CAMERA_QUEUE_SIZE))
  : 1;
const AI_CAMERA_QUEUE_WARNING = 'AI Camera is busy. Your image is queued and will be analyzed automatically.';
const AI_CAMERA_BUSY_WARNING = 'Image analysis is currently busy. Many users are analyzing images right now. Please wait and try again shortly.';
const AI_CAMERA_QUEUE_FULL = `Queue is full (${MAX_AI_CAMERA_QUEUE_SIZE}/${MAX_AI_CAMERA_QUEUE_SIZE}). Please wait until a slot becomes available.`;
const BG_REMOVAL_QUEUE_WARNING = 'AI Camera background removal is busy. Your image is queued.';

const lookupCache = {
  recipes: { expiresAt: 0, rows: null },
  knownIngredients: { expiresAt: 0, rows: null },
};
const aiCameraQueue = [];
let aiCameraActiveRequests = 0;
let bgRemovalQueue = Promise.resolve();
let bgRemovalQueueSize = 0;

function getAiCameraQueueSnapshot() {
  const queueCount = aiCameraActiveRequests + aiCameraQueue.length;

  return {
    queueCount,
    queueLimit: MAX_AI_CAMERA_QUEUE_SIZE,
    queueLabel: `Queue: ${queueCount}/${MAX_AI_CAMERA_QUEUE_SIZE}`,
    activeCount: aiCameraActiveRequests,
    waitingCount: aiCameraQueue.length,
  };
}

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

function enqueueAiCameraAnalysis(task) {
  const startNextQueuedAnalysis = () => {
    if (aiCameraActiveRequests >= MAX_AI_CAMERA_ACTIVE_REQUESTS) return;

    const next = aiCameraQueue.shift();
    if (next) next();
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

      Promise.resolve()
        .then(() => task(queueInfo))
        .then(resolve, reject)
        .finally(() => {
          aiCameraActiveRequests = Math.max(0, aiCameraActiveRequests - 1);
          startNextQueuedAnalysis();
        });
    };

    if (aiCameraActiveRequests < MAX_AI_CAMERA_ACTIVE_REQUESTS) {
      run();
      return;
    }

    aiCameraQueue.push(run);
  });
}

function enqueueBackgroundRemoval(task) {
  const queuePosition = bgRemovalQueueSize;
  bgRemovalQueueSize += 1;

  const run = bgRemovalQueue
    .catch(() => {})
    .then(() => task({ queuePosition }));

  bgRemovalQueue = run
    .finally(() => {
      bgRemovalQueueSize = Math.max(0, bgRemovalQueueSize - 1);
    })
    .catch(() => {});

  return run;
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function simplifyToken(token) {
  const irregular = {
    chiles: 'chili',
    chilies: 'chili',
    chillies: 'chili',
    leaves: 'leaf',
    potatoes: 'potato',
    tomatoes: 'tomato',
  };
  if (irregular[token]) return irregular[token];
  if (token.endsWith('ies') && token.length > 4) return `${token.slice(0, -3)}y`;
  if (token.endsWith('oes') && token.length > 4) return token.slice(0, -2);
  if (token.endsWith('ves') && token.length > 4) return `${token.slice(0, -3)}f`;
  if (token.endsWith('s') && token.length > 3 && !token.endsWith('ss')) return token.slice(0, -1);
  return token;
}

function tokenizeText(value) {
  return tokenizer
    .tokenize(normalizeText(value))
    .map(simplifyToken)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function buildSearchTerms(values) {
  const phrases = new Set();
  const tokens = new Set();

  for (const value of values || []) {
    const phrase = normalizeText(value);
    if (phrase && !STOP_WORDS.has(phrase)) phrases.add(phrase);
    tokenizeText(value).forEach((token) => tokens.add(token));
  }

  return { phrases, tokens };
}

// ── Exact whole-word matching (prevents "apple" matching "pineapple", etc.) ──
function hasWordBoundaryMatch(needle, haystack) {
  if (!needle || !haystack) return false;
  const escaped = String(needle).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('(?:^|\\b)' + escaped + '(?:\\b|$)', 'i').test(String(haystack));
}

function parseImagePayload(image) {
  const trimmed = image.trim();
  const dataUriMatch = trimmed.match(/^data:([^;,]+);base64,(.+)$/is);
  const mimeType = dataUriMatch ? dataUriMatch[1].toLowerCase() : 'image/jpeg';
  const base64Data = (dataUriMatch ? dataUriMatch[2] : trimmed).replace(/\s/g, '');

  return {
    base64Data,
    mimeType: mimeType.startsWith('image/') ? mimeType : 'image/jpeg',
  };
}

function isValidBase64(value) {
  return value.length > 0 && value.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(value);
}

function parseJsonFromModel(responseText) {
  const cleaned = String(responseText || '')
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error('Model response was not valid JSON.');
  }
}

function cleanTextList(values, limit = 12) {
  const seen = new Set();
  const list = [];

  for (const value of Array.isArray(values) ? values : []) {
    const normalized = normalizeText(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    list.push(normalized);
    if (list.length >= limit) break;
  }

  return list;
}

function cleanDisplayText(value, fallback = '') {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text || fallback;
}

function isUsefulRecipeTerm(value) {
  const normalized = normalizeText(value);
  return (
    normalized.length > 1 &&
    !STOP_WORDS.has(normalized) &&
    !['assorted ingredients', 'unidentified food', 'unknown food'].includes(normalized)
  );
}

function isGenericDetectedName(value) {
  const normalized = normalizeText(value);
  return (
    !normalized ||
    [
      'assorted ingredients',
      'food',
      'ingredient',
      'object',
      'unknown food',
      'unknown object',
      'unidentified food',
      'unidentified object',
    ].includes(normalized)
  );
}

function buildRetakeMessage(detectedObjectName) {
  const subject = cleanDisplayText(detectedObjectName, 'this object');
  return `Please retake the picture. Gemini identified this as "${subject}", but it is not available or not recognized as an ingredient in our system.`;
}

function firstSuggestedRecipe(recipeSuggestions) {
  return recipeSuggestions[0]?.recipe || null;
}

function hasValidRecipePayload(recipe) {
  return Boolean(
    recipe &&
    Number.isFinite(Number(recipe.id)) &&
    cleanDisplayText(recipe.title)
  );
}

function filterValidRecipeSuggestions(recipeSuggestions) {
  const seenIds = new Set();
  const filtered = [];

  for (const suggestion of Array.isArray(recipeSuggestions) ? recipeSuggestions : []) {
    const recipe = suggestion?.recipe;
    if (!hasValidRecipePayload(recipe)) continue;

    const recipeId = Number(recipe.id);
    if (seenIds.has(recipeId)) continue;
    seenIds.add(recipeId);
    filtered.push({
      ...suggestion,
      recipe: {
        ...recipe,
        id: recipeId,
      },
    });
  }

  return filtered;
}

function withTimeout(promise, ms, label) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const err = new Error(`${label} timed out.`);
      err.code = 'ETIMEDOUT';
      reject(err);
    }, ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

function isGeminiQuotaError(err) {
  const message = String(err?.message || '');
  return err?.status === 429 || /429|quota|too many requests/i.test(message);
}

function geminiErrorPayload(err) {
  const message = String(err?.message || '');
  if (err?.code === 'AI_IMAGE_ANALYSIS_QUEUE_FULL') {
    return {
      status: 429,
      error: AI_CAMERA_BUSY_WARNING,
      message: AI_CAMERA_BUSY_WARNING,
      queueFullMessage: err.queueFullMessage || AI_CAMERA_QUEUE_FULL,
      queueCount: err.queueLimit || MAX_AI_CAMERA_QUEUE_SIZE,
      queueLimit: err.queueLimit || MAX_AI_CAMERA_QUEUE_SIZE,
      queueLabel: `Queue: ${err.queueLimit || MAX_AI_CAMERA_QUEUE_SIZE}/${err.queueLimit || MAX_AI_CAMERA_QUEUE_SIZE}`,
    };
  }
  if (isGeminiQuotaError(err)) {
    return {
      status: 503,
      error: AI_ANALYSIS_UNAVAILABLE,
    };
  }
  if (err?.code === 'ETIMEDOUT') {
    return {
      status: 504,
      error: 'AI analysis is taking longer than usual. Please wait 1-2 minutes, then try again with a smaller or clearer image.',
    };
  }
  if (/API_KEY_INVALID|API key/i.test(message)) {
    return { status: 503, error: 'Invalid AI API key. Check GEMINI_API_KEY.' };
  }
  if (/SAFETY/i.test(message)) {
    return { status: 422, error: 'Image could not be processed due to safety filters.' };
  }
  return { status: 502, error: 'AI analysis failed. Please try again.' };
}

function getGeminiModelNames() {
  const configuredModels = process.env.GEMINI_MODELS || process.env.GEMINI_MODEL || '';
  const modelNames = configuredModels
    ? configuredModels.split(',')
    : DEFAULT_GEMINI_MODELS;

  const seen = new Set();
  return modelNames
    .map((modelName) => String(modelName || '').trim())
    .filter(Boolean)
    .filter((modelName) => {
      if (seen.has(modelName)) return false;
      seen.add(modelName);
      return true;
    });
}

function shouldStopGeminiFallback(err) {
  const message = String(err?.message || '');
  return /API_KEY_INVALID|API key|SAFETY/i.test(message);
}

async function generateGeminiContent({ genAI, prompt, mimeType, base64Data }) {
  const modelNames = getGeminiModelNames();
  let lastError = null;

  for (const modelName of modelNames) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      });

      const result = await withTimeout(
        model.generateContent([
          prompt,
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
        ]),
        GEMINI_TIMEOUT_MS,
        'Gemini image analysis'
      );

      return { result, modelName };
    } catch (err) {
      lastError = err;
      if (shouldStopGeminiFallback(err)) throw err;
      console.warn(`[ml/camera/analyze] Gemini model ${modelName} unavailable, trying fallback model.`);
    }
  }

  throw lastError || new Error('No Gemini model is available.');
}

function getRecipeIngredients(recipe) {
  const normalized = Array.isArray(recipe.normalized_ingredients)
    ? recipe.normalized_ingredients.filter(Boolean)
    : [];
  if (normalized.length > 0) return normalized;
  return Array.isArray(recipe.linked_ingredients)
    ? recipe.linked_ingredients.filter(Boolean)
    : [];
}

function buildRecipeIndex(recipe) {
  const ingredientNames = getRecipeIngredients(recipe);
  const ingredientPhrases = ingredientNames.map(normalizeText).filter(Boolean);
  const ingredientPhraseSet = new Set(ingredientPhrases);
  const ingredientTokens = new Set(ingredientNames.flatMap(tokenizeText));
  const titleText = normalizeText(recipe.title);
  const descriptionText = normalizeText(recipe.description);
  const categoryText = normalizeText([recipe.category, recipe.region_or_origin].filter(Boolean).join(' '));
  const tagText = normalizeText(Array.isArray(recipe.tags) ? recipe.tags.join(' ') : '');
  const titleTokens = new Set(tokenizeText(recipe.title));
  const descriptionTokens = new Set(tokenizeText(recipe.description));
  const categoryTokens = new Set(tokenizeText(categoryText));
  const tagTokens = new Set(tokenizeText(tagText));

  return {
    ingredientPhrases,
    ingredientPhraseSet,
    ingredientTokens,
    titleText,
    titleTokens,
    descriptionText,
    descriptionTokens,
    categoryText,
    categoryTokens,
    tagText,
    tagTokens,
  };
}

function scoreRecipe(query, indexedRecipe) {
  let score = 0;

  for (const phrase of query.phrases) {
    // Exact set match first (highest priority)
    if (indexedRecipe.ingredientPhraseSet.has(phrase)) {
      score += 14;
    } else if (
      indexedRecipe.ingredientPhrases.some((ingredient) =>
        hasWordBoundaryMatch(phrase, ingredient) || hasWordBoundaryMatch(ingredient, phrase)
      )
    ) {
      score += 9;
    }

    // Word-boundary matching for text fields (no substring)
    if (hasWordBoundaryMatch(phrase, indexedRecipe.titleText)) score += 5;
    if (hasWordBoundaryMatch(phrase, indexedRecipe.descriptionText)) score += 3;
    if (hasWordBoundaryMatch(phrase, indexedRecipe.categoryText)) score += 2;
    if (hasWordBoundaryMatch(phrase, indexedRecipe.tagText)) score += 2;
  }

  for (const token of query.tokens) {
    // Token-level: exact set membership only
    if (indexedRecipe.ingredientTokens.has(token)) score += 6;
    if (indexedRecipe.titleTokens.has(token)) score += 3;
    if (indexedRecipe.descriptionTokens.has(token)) score += 2;
    if (indexedRecipe.categoryTokens.has(token)) score += 1;
    if (indexedRecipe.tagTokens.has(token)) score += 1;
  }

  return score;
}

function toRecipePayload(recipe) {
  return {
    id: recipe.id,
    source: 'database',
    title: recipe.title,
    description: recipe.description,
    difficulty: recipe.difficulty,
    time: recipe.total_time_minutes ? `${recipe.total_time_minutes} min` : null,
    prep_time_minutes: recipe.prep_time_minutes,
    cook_time_minutes: recipe.cook_time_minutes,
    servings: recipe.servings,
    calories: recipe.calories,
    category: recipe.category || recipe.region_or_origin,
    image: recipe.image_url,
    image_url: recipe.image_url,
    tags: recipe.tags,
  };
}

function removeBackgroundInWorker({ base64Data, mimeType }) {
  return new Promise((resolve, reject) => {
    const workerPath = path.join(__dirname, '../workers/removeBackgroundWorker.js');
    const child = fork(workerPath, [], {
      execArgv: [],
      stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
    });
    let settled = false;
    let timeoutId;
    let cleanupKillId;

    const cleanupChild = () => {
      child.removeAllListeners();
      if (child.stderr) child.stderr.removeAllListeners();
    };

    const stopChild = () => {
      if (!child.killed && child.exitCode === null && child.signalCode === null) {
        child.kill();
      }
    };

    const finish = (err, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      clearTimeout(cleanupKillId);

      if (err) {
        cleanupChild();
        stopChild();
        reject(err);
        return;
      }

      resolve(result);
      cleanupKillId = setTimeout(() => {
        cleanupChild();
        stopChild();
      }, 1000);
    };

    timeoutId = setTimeout(() => {
      finish(new Error('Background removal timed out.'));
    }, BG_REMOVAL_TIMEOUT_MS);

    child.stderr?.on('data', (chunk) => {
      console.error('[ml/camera/remove-bg worker]', chunk.toString().trim());
    });

    child.on('message', (message) => {
      if (message?.type !== 'remove-bg-result') return;

      if (message?.ok && message.cutout) {
        finish(null, message.cutout);
        return;
      }
      finish(new Error(message?.error || 'Background removal worker failed.'));
    });

    child.on('error', (err) => {
      finish(err);
    });

    child.on('disconnect', () => {
      if (!settled) {
        finish(new Error('Background removal worker disconnected.'));
      }
    });

    child.on('exit', (code, signal) => {
      cleanupChild();
      if (!settled && code !== 0) {
        finish(new Error(`Background removal worker exited unexpectedly (${signal || code}).`));
      }
    });

    try {
      child.send({ base64Data, mimeType }, (err) => {
        if (err) finish(err);
      });
    } catch (err) {
      finish(err);
    }
  });
}

async function getCachedPublishedRecipes() {
  const now = Date.now();
  if (lookupCache.recipes.rows && lookupCache.recipes.expiresAt > now) {
    return lookupCache.recipes.rows;
  }

  const result = await pool.query(
    `SELECT r.id, r.title, r.description, r.difficulty,
            r.prep_time_minutes, r.cook_time_minutes, r.total_time_minutes,
            r.servings, r.calories, r.region_or_origin, r.category,
            r.tags, r.normalized_ingredients, r.image_url, r.is_featured,
            COALESCE(
              array_agg(DISTINCT i.name ORDER BY i.name)
                FILTER (WHERE i.name IS NOT NULL),
              ARRAY[]::varchar[]
            ) AS linked_ingredients
     FROM recipes r
     LEFT JOIN recipe_ingredients ri ON ri.recipe_id = r.id
     LEFT JOIN ingredients i ON i.id = ri.ingredient_id
     WHERE r.is_published = true
     GROUP BY r.id
     ORDER BY r.is_featured DESC, r.created_at DESC
     LIMIT 300`
  );

  lookupCache.recipes = {
    rows: result.rows,
    expiresAt: now + ML_LOOKUP_CACHE_TTL_MS,
  };
  return result.rows;
}

async function getCachedKnownIngredientRows() {
  const now = Date.now();
  if (lookupCache.knownIngredients.rows && lookupCache.knownIngredients.expiresAt > now) {
    return lookupCache.knownIngredients.rows;
  }

  const result = await pool.query(
    `SELECT DISTINCT name
     FROM (
       SELECT name::text AS name
       FROM ingredients
       WHERE name IS NOT NULL

       UNION

       SELECT unnest(normalized_ingredients)::text AS name
       FROM recipes
       WHERE normalized_ingredients IS NOT NULL
     ) known_ingredients
     WHERE NULLIF(TRIM(name), '') IS NOT NULL
     LIMIT 3000`
  );

  lookupCache.knownIngredients = {
    rows: result.rows,
    expiresAt: now + ML_LOOKUP_CACHE_TTL_MS,
  };
  return result.rows;
}

// ─── Shared: find matching recipes from DB by ingredient list ────────────────
async function findRecipesByIngredients(ingredients, limit = 8) {
  const query = buildSearchTerms(ingredients);
  if (query.phrases.size === 0 && query.tokens.size === 0) return [];

  const recipes = await getCachedPublishedRecipes();
  if (recipes.length === 0) return [];

  const results = recipes
    .map((recipe) => ({
      recipe: toRecipePayload(recipe),
      score: scoreRecipe(query, buildRecipeIndex(recipe)),
      isFeatured: recipe.is_featured === true,
    }))
    .filter((result) => result.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return Number(b.isFeatured) - Number(a.isFeatured);
    });

  const topScore = results[0]?.score || 1;
  return results.slice(0, limit).map(({ isFeatured, ...result }) => ({
    ...result,
    matchPercentage: Math.max(35, Math.min(100, Math.round((result.score / topScore) * 100))),
  }));
}

// ─── POST /api/ml/recommend (existing) ──────────────────────────────────────
// Confirm camera suggestions still point at currently published database recipes.
async function filterAvailableRecipeSuggestions(recipeSuggestions) {
  const validSuggestions = filterValidRecipeSuggestions(recipeSuggestions);
  if (validSuggestions.length === 0) return [];

  const recipeIds = validSuggestions.map((suggestion) => Number(suggestion.recipe.id));
  const result = await pool.query(
    `SELECT id, title, description, difficulty,
            prep_time_minutes, cook_time_minutes, total_time_minutes,
            servings, calories, region_or_origin, category, tags, image_url
     FROM recipes
     WHERE id = ANY($1::int[]) AND is_published = true`,
    [recipeIds]
  );

  const currentRecipesById = new Map(
    result.rows.map((recipe) => [Number(recipe.id), toRecipePayload(recipe)])
  );

  return validSuggestions
    .map((suggestion) => {
      const currentRecipe = currentRecipesById.get(Number(suggestion.recipe.id));
      return currentRecipe
        ? { ...suggestion, recipe: currentRecipe }
        : null;
    })
    .filter(Boolean);
}

function scoreKnownIngredient(query, ingredientName) {
  const phrase = normalizeText(ingredientName);
  if (!phrase) return 0;

  let score = 0;
  for (const queryPhrase of query.phrases) {
    if (phrase === queryPhrase) {
      score += 20;
    } else if (hasWordBoundaryMatch(queryPhrase, phrase) || hasWordBoundaryMatch(phrase, queryPhrase)) {
      score += 9;
    }
  }

  const ingredientTokens = new Set(tokenizeText(ingredientName));
  for (const token of query.tokens) {
    if (ingredientTokens.has(token)) score += 4;
  }

  return score;
}

async function findKnownIngredientMatches(terms, limit = 8) {
  const query = buildSearchTerms(terms);
  if (query.phrases.size === 0 && query.tokens.size === 0) {
    return { matches: [], knownIngredientCount: 0 };
  }

  const knownIngredientRows = await getCachedKnownIngredientRows();

  const scored = knownIngredientRows
    .map((row) => ({
      name: cleanDisplayText(row.name),
      score: scoreKnownIngredient(query, row.name),
    }))
    .filter((item) => item.name && item.score >= 8)
    .sort((a, b) => b.score - a.score);

  const seen = new Set();
  const matches = [];
  for (const item of scored) {
    const normalized = normalizeText(item.name);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    matches.push(item.name);
    if (matches.length >= limit) break;
  }

  return { matches, knownIngredientCount: knownIngredientRows.length };
}

exports.recommendByIngredients = async (req, res) => {
  const { ingredients } = req.body;
  if (!ingredients || !Array.isArray(ingredients)) {
    return res.status(400).json({ error: 'Ingredients list is required' });
  }

  try {
    const recommendations = await findRecipesByIngredients(ingredients);
    res.json({ recommendations });
  } catch (err) {
    console.error('[ml/recommendByIngredients]', err);
    res.status(500).json({ error: 'Failed to get recommendations.' });
  }
};

// ─── Authenticated AI Camera saves ─────────────────────────────────────────
function isImageReference(value, { required = false } = {}) {
  if (!value) return !required;
  if (typeof value !== 'string') return false;
  if (value.length > MAX_SAVE_IMAGE_DATA_LENGTH) return false;
  return /^data:image\/[a-z0-9.+-]+;base64,/i.test(value) || /^https?:\/\//i.test(value);
}

function normalizeSaveSourceType(value) {
  return value === 'capture' ? 'capture' : 'upload';
}

function uniqueIntegerIds(values) {
  const seen = new Set();
  const ids = [];

  for (const value of Array.isArray(values) ? values : []) {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }

  return ids;
}

function firstDetectedIngredient(analysisResult) {
  const ingredients = Array.isArray(analysisResult?.detectedIngredients)
    ? analysisResult.detectedIngredients
    : [];
  const first = ingredients.find((item) => item && typeof item === 'object');

  return {
    name: first?.name ? cleanDisplayText(first.name) : null,
    description: first?.description ? cleanDisplayText(first.description) : null,
  };
}

function recipeIdsFromAnalysis(analysisResult) {
  const matchedRecipes = Array.isArray(analysisResult?.matchedRecipes)
    ? analysisResult.matchedRecipes
    : [];
  const ids = uniqueIntegerIds(matchedRecipes.map((recipe) => recipe?.id));

  return {
    recommendedRecipeIds: ids.slice(0, 1),
    otherRecipeIds: ids.slice(1),
  };
}

function matchedIngredientsByRecipeId(analysisResult) {
  const matchedRecipes = Array.isArray(analysisResult?.matchedRecipes)
    ? analysisResult.matchedRecipes
    : [];
  const map = new Map();

  for (const recipe of matchedRecipes) {
    const id = Number(recipe?.id);
    if (!Number.isInteger(id) || id <= 0) continue;
    map.set(id, Array.isArray(recipe.matchedIngredients) ? recipe.matchedIngredients : []);
  }

  return map;
}

function toSavedMatchedRecipe(recipe, matchedIngredients) {
  return {
    id: recipe.id,
    title: recipe.title,
    image_url: recipe.image_url,
    category: recipe.category || recipe.region_or_origin || null,
    difficulty: recipe.difficulty || null,
    cook_time: recipe.cook_time_minutes
      ? `${recipe.cook_time_minutes} min`
      : recipe.total_time_minutes
        ? `${recipe.total_time_minutes} min`
        : null,
    description: recipe.description || null,
    matchedIngredients,
  };
}

async function hydrateSavedAnalysisResult(save) {
  const analysisResult =
    save.full_analysis_result && typeof save.full_analysis_result === 'object'
      ? { ...save.full_analysis_result }
      : {};
  const savedRecipeIds = [
    ...(Array.isArray(save.recommended_recipe_ids) ? save.recommended_recipe_ids : []),
    ...(Array.isArray(save.other_recipe_ids) ? save.other_recipe_ids : []),
  ];
  const fallbackRecipeIds = Array.isArray(analysisResult.matchedRecipes)
    ? analysisResult.matchedRecipes.map((recipe) => recipe?.id)
    : [];
  const orderedRecipeIds = uniqueIntegerIds([...savedRecipeIds, ...fallbackRecipeIds]);

  if (orderedRecipeIds.length === 0) {
    return { ...analysisResult, matchedRecipes: [] };
  }

  const result = await pool.query(
    `SELECT id, title, description, difficulty, cook_time_minutes,
            total_time_minutes, region_or_origin, category, image_url
     FROM recipes
     WHERE id = ANY($1::int[]) AND is_published = true`,
    [orderedRecipeIds]
  );

  const recipesById = new Map(result.rows.map((recipe) => [Number(recipe.id), recipe]));
  const savedMatches = matchedIngredientsByRecipeId(analysisResult);
  const matchedRecipes = orderedRecipeIds
    .map((id) => {
      const recipe = recipesById.get(id);
      if (!recipe) return null;
      return toSavedMatchedRecipe(recipe, savedMatches.get(id) || []);
    })
    .filter(Boolean);

  return { ...analysisResult, matchedRecipes };
}

function toAiCameraSaveSummary(row) {
  return {
    id: Number(row.id),
    sourceType: row.source_type,
    thumbnailImageData: row.thumbnail_image_data || row.removed_background_image_data || null,
    detectedIngredientName: row.detected_ingredient_name,
    detectedIngredientDescription: row.detected_ingredient_description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toAiCameraSaveDetail(row, analysisResult) {
  return {
    ...toAiCameraSaveSummary(row),
    originalImageData: row.original_image_data,
    removedBackgroundImageData: row.removed_background_image_data,
    recommendedRecipeIds: Array.isArray(row.recommended_recipe_ids) ? row.recommended_recipe_ids : [],
    otherRecipeIds: Array.isArray(row.other_recipe_ids) ? row.other_recipe_ids : [],
    fullAnalysisResult: analysisResult,
    analysisResult,
  };
}

exports.createAiCameraSave = async (req, res) => {
  const originalImageData = req.body.originalImageData || req.body.original_image_data;
  const removedBackgroundImageData =
    req.body.removedBackgroundImageData || req.body.removed_background_image_data || null;
  const thumbnailImageData = req.body.thumbnailImageData || req.body.thumbnail_image_data || null;
  const analysisResult = req.body.analysisResult || req.body.fullAnalysisResult || req.body.full_analysis_result;
  const sourceType = normalizeSaveSourceType(req.body.sourceType || req.body.source_type);

  if (!isImageReference(originalImageData, { required: true })) {
    return res.status(400).json({ error: 'A valid original AI Camera image is required.' });
  }
  if (!isImageReference(removedBackgroundImageData)) {
    return res.status(400).json({ error: 'Removed-background image must be a valid image reference.' });
  }
  if (!isImageReference(thumbnailImageData)) {
    return res.status(400).json({ error: 'Thumbnail image must be a valid image reference.' });
  }
  if (!analysisResult || typeof analysisResult !== 'object' || Array.isArray(analysisResult)) {
    return res.status(400).json({ error: 'A valid AI Camera analysis result is required.' });
  }

  const detected = firstDetectedIngredient(analysisResult);
  const { recommendedRecipeIds, otherRecipeIds } = recipeIdsFromAnalysis(analysisResult);
  const thumbnail = thumbnailImageData || removedBackgroundImageData || originalImageData;

  try {
    const result = await pool.query(
      `INSERT INTO ai_camera_saves (
        user_id, original_image_data, removed_background_image_data,
        thumbnail_image_data, detected_ingredient_name, detected_ingredient_description,
        recommended_recipe_ids, other_recipe_ids, full_analysis_result, source_type
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::int[], $8::int[], $9::jsonb, $10)
      RETURNING *`,
      [
        req.userId,
        originalImageData,
        removedBackgroundImageData,
        thumbnail,
        detected.name,
        detected.description,
        recommendedRecipeIds,
        otherRecipeIds,
        JSON.stringify(analysisResult),
        sourceType,
      ]
    );

    const save = result.rows[0];
    const hydratedAnalysis = await hydrateSavedAnalysisResult(save);
    return res.status(201).json(toAiCameraSaveDetail(save, hydratedAnalysis));
  } catch (err) {
    console.error('[ml/ai-camera-saves/create]', err);
    return res.status(500).json({ error: 'Failed to save AI Camera result.' });
  }
};

exports.listAiCameraSaves = async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 30, MAX_AI_CAMERA_SAVE_LIST);

  try {
    const result = await pool.query(
      `SELECT id, source_type, thumbnail_image_data, removed_background_image_data,
              detected_ingredient_name, detected_ingredient_description,
              created_at, updated_at
       FROM ai_camera_saves
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [req.userId, limit]
    );

    return res.json({ saves: result.rows.map(toAiCameraSaveSummary) });
  } catch (err) {
    console.error('[ml/ai-camera-saves/list]', err);
    return res.status(500).json({ error: 'Failed to load AI Camera saves.' });
  }
};

exports.getAiCameraSave = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid AI Camera save id.' });
  }

  try {
    const result = await pool.query(
      `SELECT *
       FROM ai_camera_saves
       WHERE id = $1 AND user_id = $2`,
      [id, req.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'AI Camera save not found.' });
    }

    const save = result.rows[0];
    const hydratedAnalysis = await hydrateSavedAnalysisResult(save);
    return res.json(toAiCameraSaveDetail(save, hydratedAnalysis));
  } catch (err) {
    console.error('[ml/ai-camera-saves/get]', err);
    return res.status(500).json({ error: 'Failed to load AI Camera save.' });
  }
};

exports.deleteAiCameraSave = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid AI Camera save id.' });
  }

  try {
    const result = await pool.query(
      `DELETE FROM ai_camera_saves
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, req.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'AI Camera save not found.' });
    }

    return res.status(204).send();
  } catch (err) {
    console.error('[ml/ai-camera-saves/delete]', err);
    return res.status(500).json({ error: 'Failed to delete AI Camera save.' });
  }
};

// ─── POST /api/ml/camera/analyze ────────────────────────────────────────────
// Accepts { image: "data:image/...;base64,..." | "<raw base64>" }
// Returns { dishName, ingredients, estimatedCalories, confidence, aiSummary, recipeSuggestions, recommendedRecipe }
exports.analyzeImage = async (req, res) => {
  const { image } = req.body;

  // ── Validation ──
  if (!image || typeof image !== 'string') {
    return res.status(400).json({
      error: 'No image provided. Send { image: "<base64 string>" }.',
    });
  }

  const { base64Data, mimeType } = parseImagePayload(image);

  if (base64Data.length > MAX_BASE64_LENGTH) {
    return res.status(413).json({
      error: 'Image too large. Maximum size is 5MB.',
    });
  }

  if (!isValidBase64(base64Data)) {
    return res.status(400).json({
      error: 'Invalid image format. Expected base64-encoded image data.',
    });
  }

  // ── Check API key ──
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return res.status(503).json({
      error: 'AI service not configured. Set GEMINI_API_KEY in .env.',
    });
  }

  try {
    // ── Call Gemini Vision ──
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);

    const prompt = `You are a food and ingredient recognition AI. Analyze this image and identify the main visible subject, even when it is not food.

Return a JSON object with exactly these fields:
{
  "dishName": "Name of the main dish, ingredient, or visible object",
  "detectedObjectName": "Short name of the main visible subject",
  "ingredients": ["ingredient1", "ingredient2", ...],
  "searchTerms": ["short database search term 1", "short database search term 2"],
  "estimatedCalories": <number>,
  "confidence": "high" | "medium" | "low",
  "aiSummary": "Brief 1-2 sentence description of what you see"
}

Rules:
- ingredients array should contain individual ingredient names, lowercase
- searchTerms should include only visible food items, ingredients, or a clearly identified dish name for matching a recipe database
- If no visible food items, dishes, or ingredients are detected, still identify the main subject in dishName and detectedObjectName, set ingredients and searchTerms to [], set estimatedCalories to null, set confidence to "low", and say that no food items were identified
- estimatedCalories is a rough estimate for the visible portion
- Do not recommend recipes; the app will choose recipes from its own database
- Only return valid JSON, no markdown or extra text`;

    const { result, modelName, ...queueInfo } = await enqueueAiCameraAnalysis(async (queueInfo) => {
      if (queueInfo.queued) {
        console.warn(`[ml/camera/analyze] ${AI_CAMERA_QUEUE_WARNING}`);
      }

      const geminiResponse = await generateGeminiContent({
        genAI,
        prompt,
        mimeType,
        base64Data,
      });

      return {
        ...queueInfo,
        ...geminiResponse,
      };
    });

    const responseText = result.response.text();

    // Parse JSON — handle potential markdown wrapping
    let parsed;
    try {
      parsed = parseJsonFromModel(responseText);
    } catch (parseErr) {
      console.error('[ml/camera/analyze] Failed to parse Gemini response:', responseText);
      return res.status(502).json({
        error: 'AI returned an invalid response. Please try again.',
        ...queueInfo,
      });
    }

    // Validate parsed response has required fields
    const dishName = cleanDisplayText(parsed.dishName, 'Unidentified Food');
    const detectedObjectName = cleanDisplayText(
      parsed.detectedObjectName || parsed.objectName || parsed.subject || dishName,
      dishName
    );
    const ingredients = cleanTextList(parsed.ingredients);
    const searchTerms = cleanTextList(parsed.searchTerms);
    const estimatedCalories = Number.isFinite(Number(parsed.estimatedCalories))
      ? Math.round(Number(parsed.estimatedCalories))
      : null;
    const confidence = ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'medium';
    const aiSummary = parsed.aiSummary || '';
    const explicitIngredientTerms = Array.from(
      new Set([...ingredients, ...searchTerms].filter(isUsefulRecipeTerm))
    );

    let knownIngredientMatches = [];
    let knownIngredientCount = 0;
    if (explicitIngredientTerms.length > 0) {
      try {
        const lookup = await findKnownIngredientMatches(explicitIngredientTerms);
        knownIngredientMatches = lookup.matches;
        knownIngredientCount = lookup.knownIngredientCount;
      } catch (lookupErr) {
        console.warn('[ml/camera/analyze] Ingredient lookup failed:', lookupErr.message);
      }
    }

    const hasDetectedSubject = !isGenericDetectedName(detectedObjectName);
    const hasDetectedFoodItems = explicitIngredientTerms.length > 0;
    const hasRecognizedDatabaseIngredients = knownIngredientMatches.length > 0;
    const analyzeOutputError = !hasDetectedSubject && !hasDetectedFoodItems;
    const retakeMessage = null;

    // ── Match against recipe database ──
    let recipeSuggestions = [];
    if (hasDetectedFoodItems && hasRecognizedDatabaseIngredients) {
      try {
        recipeSuggestions = await filterAvailableRecipeSuggestions(
          await findRecipesByIngredients(knownIngredientMatches, 6)
        );
      } catch (dbErr) {
        console.warn('[ml/camera/analyze] Recipe matching failed:', dbErr.message);
        // Non-fatal: still return AI results without suggestions.
      }
    }

    const recommendedRecipe = firstSuggestedRecipe(recipeSuggestions);
    const analysisStatus = !hasDetectedFoodItems
      ? 'no_detected_items'
      : hasRecognizedDatabaseIngredients && recipeSuggestions.length > 0
        ? 'ok'
        : 'no_database_match';

    res.json({
      dishName,
      detectedObjectName,
      ingredients,
      estimatedCalories,
      confidence: hasDetectedFoodItems ? confidence : 'low',
      aiSummary: aiSummary || (!hasDetectedFoodItems ? 'No food items could be identified in this image.' : ''),
      analysisStatus,
      analyzeOutputError,
      needsRetake: false,
      retakeMessage,
      recognizedIngredients: knownIngredientMatches,
      recipeSuggestions,
      recommendedRecipe,
      suggestedRecipe: recommendedRecipe,
      modelUsed: modelName,
      ...queueInfo,
    });
  } catch (err) {
    const payload = geminiErrorPayload(err);
    console.error('[ml/camera/analyze]', payload.error, err?.status ? `(status ${err.status})` : '');
    const { status, ...body } = payload;
    res.status(status).json(body);
  }
};

// ─── POST /api/ml/analyze-ingredients ────────────────────────────────────────
// Accepts { image: "data:image/...;base64,..." | "<raw base64>" }
// Returns { success, detectedIngredients, matchedRecipes, message }
exports.analyzeIngredients = async (req, res) => {
  const { image } = req.body;

  if (!image || typeof image !== 'string') {
    return res.status(400).json({
      success: false,
      detectedIngredients: [],
      matchedRecipes: [],
      message: 'No image provided. Send { image: "<base64 string>" }.',
    });
  }

  const { base64Data, mimeType } = parseImagePayload(image);

  if (base64Data.length > MAX_BASE64_LENGTH) {
    return res.status(413).json({
      success: false,
      detectedIngredients: [],
      matchedRecipes: [],
      message: 'Image too large. Maximum size is 5MB.',
    });
  }

  if (!isValidBase64(base64Data)) {
    return res.status(400).json({
      success: false,
      detectedIngredients: [],
      matchedRecipes: [],
      message: 'Invalid image format. Expected base64-encoded image data.',
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return res.status(503).json({
      success: false,
      detectedIngredients: [],
      matchedRecipes: [],
      message: 'AI service not configured. Set GEMINI_API_KEY in api/.env.',
    });
  }

  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);

    const prompt = `You are a cooking ingredient recognition AI. Analyze this image and identify ALL visible cooking ingredients or food items.

Return a JSON object with exactly these fields:
{
  "ingredients": [
    {
      "name": "Watermelon",
      "normalizedName": "watermelon",
      "description": "A large, sweet fruit with red or pink flesh and green rind, often eaten fresh or in fruit salads.",
      "confidence": "high"
    },
    {
      "name": "Kiwi",
      "normalizedName": "kiwi",
      "description": "A small, oval fruit with fuzzy brown skin and bright green flesh, known for its sweet-tart flavor.",
      "confidence": "high"
    }
  ],
  "isFoodImage": true
}

Rules:
- Identify ALL distinct food items or cooking ingredients visible in the image (up to 10)
- Each ingredient must have: name (display name, capitalized), normalizedName (lowercase singular form for database matching), description (1 sentence about culinary use), confidence ("high", "medium", or "low")
- Do NOT list seasonings, spices, oils, or garnishes as separate ingredients unless they are the main subject
- If you see meat with herbs/spices on it, only identify the meat (e.g., "Pork Belly" not "Pork Belly, Salt, Pepper, Rosemary")
- If the image shows a single prepared dish, identify it as one item (e.g., "Fried Rice" or "Chicken Adobo")
- If the image shows multiple distinct food items (e.g., fruits, vegetables, raw ingredients), list each one separately
- If no cooking ingredient is visible, set ingredients to [] and isFoodImage to false
- Do NOT suggest recipes — only identify ingredients
- Do NOT invent ingredients that are not visible
- normalizedName should be singular form: "tomato" not "tomatoes", "egg" not "eggs"
- Only return valid JSON, no markdown or extra text`;

    const { result, ...queueInfo } = await enqueueAiCameraAnalysis(async (queueInfo) => {
      if (queueInfo.queued) {
        console.warn(`[ml/analyze-ingredients] ${AI_CAMERA_QUEUE_WARNING}`);
      }
      const geminiResponse = await generateGeminiContent({
        genAI,
        prompt,
        mimeType,
        base64Data,
      });
      return { ...queueInfo, ...geminiResponse };
    });

    const responseText = result.response.text();

    let parsed;
    try {
      parsed = parseJsonFromModel(responseText);
    } catch (parseErr) {
      console.error('[ml/analyze-ingredients] Failed to parse Gemini response:', responseText);
      return res.status(502).json({
        success: false,
        detectedIngredients: [],
        matchedRecipes: [],
        message: 'AI returned an invalid response. Please try again.',
        ...queueInfo,
      });
    }

    // ── Validate Gemini output structure ──
    const isFoodImage = parsed.isFoodImage !== false;
    const rawIngredients = Array.isArray(parsed.ingredients) ? parsed.ingredients : [];

    if (!isFoodImage && rawIngredients.length === 0) {
      return res.json({
        success: false,
        detectedIngredients: [],
        matchedRecipes: [],
        message: 'No recognizable cooking ingredient was detected. Please retake or upload a clearer ingredient photo.',
        ...queueInfo,
      });
    }

    // ── Ingredient normalization layer ──
    // Each detected ingredient is kept as one complete word/phrase.
    // normalizedName is always the full singular form — never split into sub-words.
    const detectedIngredients = rawIngredients
      .filter((item) => item && typeof item === 'object' && item.name)
      .slice(0, 15)
      .map((item) => {
        const rawNormalized = normalizeText(item.normalizedName || item.name);
        // Keep the full phrase as-is — do NOT break into partial words
        const normalizedName = simplifyToken(rawNormalized);
        return {
          name: cleanDisplayText(item.name),
          normalizedName,
          description: cleanDisplayText(item.description, 'A cooking ingredient.'),
          confidence: ['high', 'medium', 'low'].includes(item.confidence) ? item.confidence : 'medium',
        };
      })
      .filter((item) => item.name && item.normalizedName && !isGenericDetectedName(item.name));

    // No food detected
    if (detectedIngredients.length === 0) {
      return res.json({
        success: false,
        detectedIngredients: [],
        matchedRecipes: [],
        message: 'No recognizable cooking ingredient was detected. Please retake or upload a clearer ingredient photo.',
        ...queueInfo,
      });
    }

    // ── Enforce exact match: verify detected ingredients exist in the database ──
    const ingredientNames = detectedIngredients.map((item) => item.normalizedName);
    let verifiedIngredients = [];
    try {
      const knownRows = await getCachedKnownIngredientRows();
      for (const detectedName of ingredientNames) {
        const detectedSimplified = simplifyToken(detectedName);
        const match = knownRows.find((row) => {
          const dbName = normalizeText(row.name);
          const dbSimplified = simplifyToken(dbName);
          // Exact match first
          if (dbName === detectedName || dbSimplified === detectedSimplified) return true;
          // Whole-word boundary match (no substring)
          if (hasWordBoundaryMatch(detectedName, dbName)) return true;
          if (hasWordBoundaryMatch(dbName, detectedName)) return true;
          return false;
        });
        if (match) verifiedIngredients.push(detectedName);
      }
    } catch (lookupErr) {
      console.warn('[ml/analyze-ingredients] Ingredient DB lookup failed:', lookupErr.message);
      verifiedIngredients = [...ingredientNames];
    }

    // ── Match against database recipes using ONLY verified ingredients ──
    let matchedRecipes = [];
    if (verifiedIngredients.length > 0) {
      try {
        const recipes = await getCachedPublishedRecipes();
        const query = buildSearchTerms(verifiedIngredients);

        if (query.phrases.size > 0 || query.tokens.size > 0) {
          const scored = recipes
            .map((recipe) => {
              const index = buildRecipeIndex(recipe);
              const score = scoreRecipe(query, index);

              // Only count ingredients that have an exact match in this recipe
              const matched = [];
              for (const ingName of verifiedIngredients) {
                const hasMatch = index.ingredientPhraseSet.has(ingName)
                  || index.ingredientPhrases.some((rp) =>
                    hasWordBoundaryMatch(ingName, rp) || hasWordBoundaryMatch(rp, ingName)
                  );
                if (hasMatch) matched.push(ingName);
              }

              return { recipe, score, matchedIngredients: matched };
            })
            .filter((item) => item.score > 0 && item.matchedIngredients.length > 0)
            .sort((a, b) => {
              if (b.matchedIngredients.length !== a.matchedIngredients.length) {
                return b.matchedIngredients.length - a.matchedIngredients.length;
              }
              return b.score - a.score;
            })
            .slice(0, 10);

          matchedRecipes = scored.map((item) => ({
            id: item.recipe.id,
            title: item.recipe.title,
            image_url: item.recipe.image_url,
            category: item.recipe.category || item.recipe.region_or_origin || null,
            difficulty: item.recipe.difficulty || null,
            cook_time: item.recipe.cook_time_minutes ? `${item.recipe.cook_time_minutes} min` : item.recipe.total_time_minutes ? `${item.recipe.total_time_minutes} min` : null,
            description: item.recipe.description || null,
            matchedIngredients: item.matchedIngredients,
          }));
        }
      } catch (dbErr) {
        console.warn('[ml/analyze-ingredients] Recipe matching failed:', dbErr.message);
      }
    }

    // Build response — only recipes from the database, never invented ones
    const message = matchedRecipes.length === 0
      ? 'CookMate found ingredients, but no published recipe in the database matches them yet.'
      : null;

    return res.json({
      success: true,
      detectedIngredients: detectedIngredients.map(({ normalizedName, ...rest }) => rest),
      matchedRecipes,
      message,
      ...queueInfo,
    });
  } catch (err) {
    const payload = geminiErrorPayload(err);
    console.error('[ml/analyze-ingredients]', payload.error, err?.status ? `(status ${err.status})` : '');
    return res.status(payload.status).json({
      success: false,
      detectedIngredients: [],
      matchedRecipes: [],
      ...payload,
      message: payload.message || payload.error,
    });
  }
};

// ── Legacy stub (kept for backwards compatibility) ──
exports.camera = (_req, res) => {
  res.json({ message: 'ML Camera endpoint. Use POST /api/ml/camera/analyze to analyze images.' });
};

exports.imageAnalysisQueueStatus = (_req, res) => {
  res.json(getAiCameraQueueSnapshot());
};

// ─── POST /api/ml/camera/remove-bg ─────────────────────────────────────────
// Accepts { image: "data:image/...;base64,..." }
// Returns { cutout: "data:image/png;base64,..." }
exports.removeBackground = async (req, res) => {
  const { image } = req.body;
  if (!image || typeof image !== 'string') {
    return res.status(400).json({ error: 'No image provided.' });
  }

  const { base64Data, mimeType } = parseImagePayload(image);

  if (base64Data.length > MAX_BASE64_LENGTH) {
    return res.status(413).json({ error: 'Image too large. Max 5MB.' });
  }

  if (!isValidBase64(base64Data)) {
    return res.status(400).json({ error: 'Invalid image format. Expected base64-encoded image data.' });
  }

  try {
    const { cutout, queuePosition } = await enqueueBackgroundRemoval(async ({ queuePosition }) => {
      if (queuePosition > 0) {
        console.warn(`[ml/camera/remove-bg] ${BG_REMOVAL_QUEUE_WARNING}`);
      }

      return {
        queuePosition,
        cutout: await removeBackgroundInWorker({ base64Data, mimeType }),
      };
    });

    res.json({
      cutout,
      queued: queuePosition > 0,
      queueWarning: queuePosition > 0 ? BG_REMOVAL_QUEUE_WARNING : null,
    });
  } catch (err) {
    const details = err?.message || String(err);
    console.warn('[ml/camera/remove-bg]', details);
    res.status(200).json({
      cutout: null,
      fallbackUsed: true,
      warning: 'Using the original photo without background removal.',
      ...(process.env.NODE_ENV === 'production' ? {} : { details }),
    });
  }
};

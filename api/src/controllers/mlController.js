const { fork } = require('child_process');
const path = require('path');
const logger = require('../config/logger');
const { pool } = require('../config/db');

const {
  enqueueAiCameraAnalysis,
  enqueueBackgroundRemoval,
  getAiCameraQueueSnapshot,
  AI_CAMERA_QUEUE_WARNING,
  BG_REMOVAL_QUEUE_WARNING,
} = require('../services/aiCameraQueue');

const {
  normalizeText,
  simplifyToken,
  cleanTextList,
  cleanDisplayText,
  isGenericDetectedName,
  isUsefulRecipeTerm,
  isLowSignalRecipeIngredient,
  filterAndOrderByIds,
  findRecipesByIngredients,
  filterAvailableRecipeSuggestions,
  findKnownIngredientMatches,
  MAX_AI_CAMERA_RECIPE_RESULTS,
  MAX_GEMINI_RAG_CANDIDATES,
} = require('../services/recipeMatcher');

const {
  generateGeminiContent,
  selectRecipeWithGeminiRAG,
  geminiErrorPayload,
  parseJsonFromModel,
} = require('../services/geminiService');

const MAX_BASE64_LENGTH = 7 * 1024 * 1024;
const MAX_SAVE_IMAGE_DATA_LENGTH = 8 * 1024 * 1024;
const MAX_AI_CAMERA_SAVES_PER_USER = 20;
const MAX_AI_CAMERA_SAVE_LIST = 50;
const BG_REMOVAL_TIMEOUT_MS = Number(process.env.BG_REMOVAL_TIMEOUT_MS || 90000);
const AI_CAMERA_DAILY_LIMIT = 3;
const AI_CAMERA_WINDOW_MS = 24 * 60 * 60 * 1000;

// ─── DB-backed AI Camera rate limit ─────────────────────────────────────────
// Returns { allowed, remaining, resetAt (ms), usesCount }
// When allowed=false the caller should return 429.
async function checkAndIncrementDbRateLimit(userId) {
  const windowSecs = AI_CAMERA_WINDOW_MS / 1000;
  const result = await pool.query(
    `INSERT INTO ai_camera_rate_limits (user_id, uses_count, window_start_at, updated_at)
     VALUES ($1, 1, NOW(), NOW())
     ON CONFLICT (user_id) DO UPDATE
       SET uses_count = CASE
             WHEN ai_camera_rate_limits.window_start_at < NOW() - ($2 || ' seconds')::INTERVAL
             THEN 1
             ELSE ai_camera_rate_limits.uses_count + 1
           END,
           window_start_at = CASE
             WHEN ai_camera_rate_limits.window_start_at < NOW() - ($2 || ' seconds')::INTERVAL
             THEN NOW()
             ELSE ai_camera_rate_limits.window_start_at
           END,
           updated_at = NOW()
     RETURNING uses_count, window_start_at`,
    [userId, windowSecs]
  );
  const row = result.rows[0];
  const usesCount = Number(row.uses_count);
  const resetAt = new Date(row.window_start_at).getTime() + AI_CAMERA_WINDOW_MS;
  const remaining = Math.max(0, AI_CAMERA_DAILY_LIMIT - usesCount);
  const allowed = usesCount <= AI_CAMERA_DAILY_LIMIT;
  return { allowed, remaining, resetAt, usesCount };
}

// Read-only: get current rate limit status without incrementing
async function readDbRateLimit(userId) {
  const result = await pool.query(
    `SELECT uses_count, window_start_at FROM ai_camera_rate_limits WHERE user_id = $1`,
    [userId]
  );
  if (result.rowCount === 0) {
    return { remaining: AI_CAMERA_DAILY_LIMIT, resetAt: Date.now() + AI_CAMERA_WINDOW_MS, usesCount: 0 };
  }
  const row = result.rows[0];
  const windowStart = new Date(row.window_start_at).getTime();
  const resetAt = windowStart + AI_CAMERA_WINDOW_MS;
  if (Date.now() > resetAt) {
    return { remaining: AI_CAMERA_DAILY_LIMIT, resetAt: Date.now() + AI_CAMERA_WINDOW_MS, usesCount: 0 };
  }
  const usesCount = Number(row.uses_count);
  return { remaining: Math.max(0, AI_CAMERA_DAILY_LIMIT - usesCount), resetAt, usesCount };
}

function setRateLimitHeaders(res, remaining, resetAt) {
  const resetSecs = Math.ceil(resetAt / 1000);
  res.setHeader('RateLimit-Limit', AI_CAMERA_DAILY_LIMIT);
  res.setHeader('RateLimit-Remaining', Math.max(0, remaining));
  res.setHeader('RateLimit-Reset', resetSecs);
  res.setHeader('X-RateLimit-Limit', AI_CAMERA_DAILY_LIMIT);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, remaining));
  res.setHeader('X-RateLimit-Reset', resetSecs);
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

function firstSuggestedRecipe(recipeSuggestions) {
  return recipeSuggestions[0]?.recipe || null;
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
      logger.error('[ml/camera/remove-bg worker]', chunk.toString().trim());
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

exports.recommendByIngredients = async (req, res) => {
  const { ingredients } = req.body;
  if (!ingredients || !Array.isArray(ingredients)) {
    return res.status(400).json({ error: 'Ingredients list is required' });
  }

  try {
    const recommendations = await findRecipesByIngredients(ingredients);
    res.json({ recommendations });
  } catch (err) {
    logger.error('[ml/recommendByIngredients]', err);
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
      `WITH overflow AS (
         SELECT id FROM ai_camera_saves
         WHERE user_id = $1
         ORDER BY created_at DESC
         OFFSET $11
       ),
       pruned AS (
         DELETE FROM ai_camera_saves WHERE id IN (SELECT id FROM overflow)
       )
       INSERT INTO ai_camera_saves (
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
        MAX_AI_CAMERA_SAVES_PER_USER - 1,
      ]
    );

    const save = result.rows[0];
    const hydratedAnalysis = await hydrateSavedAnalysisResult(save);
    return res.status(201).json(toAiCameraSaveDetail(save, hydratedAnalysis));
  } catch (err) {
    logger.error('[ml/ai-camera-saves/create]', err);
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
    logger.error('[ml/ai-camera-saves/list]', err);
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
    logger.error('[ml/ai-camera-saves/get]', err);
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
    logger.error('[ml/ai-camera-saves/delete]', err);
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

  // ── DB rate limit check ──
  if (req.userId) {
    try {
      const rl = await checkAndIncrementDbRateLimit(req.userId);
      setRateLimitHeaders(res, rl.remaining, rl.resetAt);
      if (!rl.allowed) {
        return res.status(429).json({
          error: 'Daily AI camera limit reached. You can analyze 3 images per day. Try again tomorrow.',
        });
      }
    } catch (rlErr) {
      logger.warn('[ml/camera/analyze] DB rate limit check failed, proceeding:', rlErr.message);
    }
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

    const socketId = req.headers['x-socket-id'] || null;
    const { result, modelName, ...queueInfo } = await enqueueAiCameraAnalysis(async (queueInfo) => {
      if (queueInfo.queued) {
        logger.warn(`[ml/camera/analyze] ${AI_CAMERA_QUEUE_WARNING}`);
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
    }, { socketId });

    const responseText = result.response.text();

    // Parse JSON — handle potential markdown wrapping
    let parsed;
    try {
      parsed = parseJsonFromModel(responseText);
    } catch (parseErr) {
      logger.error('[ml/camera/analyze] Failed to parse Gemini response:', responseText);
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
        logger.warn('[ml/camera/analyze] Ingredient lookup failed:', lookupErr.message);
      }
    }

    const hasDetectedSubject = !isGenericDetectedName(detectedObjectName);
    const hasDetectedFoodItems = explicitIngredientTerms.length > 0;
    const matchableKnownIngredients = knownIngredientMatches.filter(
      (ingredient) => !isLowSignalRecipeIngredient(ingredient)
    );
    const hasRecognizedDatabaseIngredients = matchableKnownIngredients.length > 0;
    const analyzeOutputError = !hasDetectedSubject && !hasDetectedFoodItems;
    const retakeMessage = null;

    // ── Match against recipe database (retrieval step of RAG) ──
    let recipeSuggestions = [];
    if (hasDetectedFoodItems && hasRecognizedDatabaseIngredients) {
      try {
        recipeSuggestions = await filterAvailableRecipeSuggestions(
          await findRecipesByIngredients(matchableKnownIngredients, MAX_GEMINI_RAG_CANDIDATES)
        );
      } catch (dbErr) {
        logger.warn('[ml/camera/analyze] Recipe matching failed:', dbErr.message);
        // Non-fatal: still return AI results without suggestions.
      }
    }

    // ── RAG grounding step: Gemini picks only from retrieved DB candidates ──
    const retrievedRecipeIds = recipeSuggestions
      .map((s) => Number(s.recipe?.id))
      .filter((id) => Number.isInteger(id));
    let ragUsed = false;
    let ragNoMatch = false;
    let ragMatchReason = null;
    let ragSelectedId = null;

    if (recipeSuggestions.length > 0) {
      const ragResult = await selectRecipeWithGeminiRAG({
        apiKey,
        detectedIngredients: matchableKnownIngredients,
        candidates: recipeSuggestions,
      });

      if (ragResult) {
        ragUsed = true;
        ragNoMatch = ragResult.noMatch;
        ragMatchReason = ragResult.matchReason;
        ragSelectedId = ragResult.selectedId;

        if (ragResult.noMatch) {
          logger.info('[ml/camera/analyze] RAG no_match:', {
            detectedIngredients: knownIngredientMatches,
            retrievedRecipeIds,
            reason: ragMatchReason,
          });
          recipeSuggestions = [];
        } else if (ragResult.orderedIds.length > 0) {
          recipeSuggestions = filterAndOrderByIds(recipeSuggestions, ragResult.orderedIds);
        }
      }
    }
    if (!ragUsed) {
      recipeSuggestions = recipeSuggestions.slice(0, MAX_AI_CAMERA_RECIPE_RESULTS);
    }

    const recommendedRecipe = firstSuggestedRecipe(recipeSuggestions);
    const finalRecipeIds = recipeSuggestions
      .map((s) => Number(s.recipe?.id))
      .filter((id) => Number.isInteger(id));
    const analysisStatus = !hasDetectedFoodItems
      ? 'no_detected_items'
      : recipeSuggestions.length > 0
        ? 'ok'
        : 'no_database_match';

    logger.info('[ml/camera/analyze] RAG', {
      detectedIngredients: knownIngredientMatches,
      retrievedRecipeIds,
      finalRecipeIds,
      ragUsed,
      ragNoMatch,
      analysisStatus,
    });

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
      // Optional RAG metadata (safe to ignore on clients that don't use it)
      ragUsed,
      ragNoMatch,
      ragMatchReason,
      ragSelectedRecipeId: ragSelectedId,
      retrievedRecipeIds,
      ...queueInfo,
    });
  } catch (err) {
    const payload = geminiErrorPayload(err);
    logger.error('[ml/camera/analyze]', payload.error, err?.status ? `(status ${err.status})` : '');
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

  if (req.userId) {
    try {
      const rl = await checkAndIncrementDbRateLimit(req.userId);
      setRateLimitHeaders(res, rl.remaining, rl.resetAt);
      if (!rl.allowed) {
        return res.status(429).json({
          success: false,
          detectedIngredients: [],
          matchedRecipes: [],
          message: 'Daily AI camera limit reached. You can analyze 3 images per day. Try again tomorrow.',
        });
      }
    } catch (rlErr) {
      logger.warn('[ml/analyze-ingredients] DB rate limit check failed, proceeding:', rlErr.message);
    }
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

    const socketId = req.headers['x-socket-id'] || null;
    const { result, ...queueInfo } = await enqueueAiCameraAnalysis(async (queueInfo) => {
      if (queueInfo.queued) {
        logger.warn(`[ml/analyze-ingredients] ${AI_CAMERA_QUEUE_WARNING}`);
      }
      const geminiResponse = await generateGeminiContent({
        genAI,
        prompt,
        mimeType,
        base64Data,
      });
      return { ...queueInfo, ...geminiResponse };
    }, { socketId });

    const responseText = result.response.text();

    let parsed;
    try {
      parsed = parseJsonFromModel(responseText);
    } catch (parseErr) {
      logger.error('[ml/analyze-ingredients] Failed to parse Gemini response:', responseText);
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
      const lookup = await findKnownIngredientMatches(ingredientNames, 15);
      verifiedIngredients = lookup.matches;
    } catch (lookupErr) {
      logger.warn('[ml/analyze-ingredients] Ingredient DB lookup failed:', lookupErr.message);
      verifiedIngredients = [...ingredientNames];
    }

    // ── Match against database recipes using ONLY verified ingredients ──
    const matchableVerifiedIngredients = verifiedIngredients.filter(
      (ingredient) => !isLowSignalRecipeIngredient(ingredient)
    );

    let matchedRecipes = [];
    if (matchableVerifiedIngredients.length > 0) {
      try {
        const suggestions = await findRecipesByIngredients(
          matchableVerifiedIngredients,
          MAX_GEMINI_RAG_CANDIDATES
        );

        matchedRecipes = suggestions.map((item) => ({
          id: item.recipe.id,
          title: item.recipe.title,
          image_url: item.recipe.image_url || item.recipe.image || null,
          category: item.recipe.category || null,
          difficulty: item.recipe.difficulty || null,
          cook_time: item.recipe.cook_time_minutes ? `${item.recipe.cook_time_minutes} min` : item.recipe.time,
          description: item.recipe.description || null,
          matchedIngredients: item.matchedIngredients,
          ingredients: item.recipe.ingredients || [],
          matchScore: item.score,
          matchPercentage: item.matchPercentage,
        }));
      } catch (dbErr) {
        logger.warn('[ml/analyze-ingredients] Recipe matching failed:', dbErr.message);
      }
    }

    // ── RAG grounding: Gemini picks only from retrieved DB candidates ──
    const retrievedRecipeIds = matchedRecipes.map((r) => Number(r.id)).filter(Number.isInteger);
    let ragUsed = false;
    let ragNoMatch = false;
    let ragMatchReason = null;
    let ragSelectedId = null;

    if (matchedRecipes.length > 0) {
      const ragResult = await selectRecipeWithGeminiRAG({
        apiKey,
        detectedIngredients: matchableVerifiedIngredients,
        candidates: matchedRecipes,
      });

      if (ragResult) {
        ragUsed = true;
        ragNoMatch = ragResult.noMatch;
        ragMatchReason = ragResult.matchReason;
        ragSelectedId = ragResult.selectedId;

        if (ragResult.noMatch) {
          logger.info('[ml/analyze-ingredients] RAG no_match:', {
            detectedIngredients: verifiedIngredients,
            retrievedRecipeIds,
            reason: ragMatchReason,
          });
          matchedRecipes = [];
        } else if (ragResult.orderedIds.length > 0) {
          matchedRecipes = filterAndOrderByIds(matchedRecipes, ragResult.orderedIds);
        }
      }
    }
    if (!ragUsed) {
      matchedRecipes = matchedRecipes.slice(0, MAX_AI_CAMERA_RECIPE_RESULTS);
    }

    const finalRecipeIds = matchedRecipes.map((r) => Number(r.id)).filter(Number.isInteger);
    logger.info('[ml/analyze-ingredients] RAG', {
      detectedIngredients: verifiedIngredients,
      retrievedRecipeIds,
      finalRecipeIds,
      ragUsed,
      ragNoMatch,
    });

    // Build response — only recipes from the database, never invented ones
    const message = matchedRecipes.length === 0
      ? verifiedIngredients.length > 0 && matchableVerifiedIngredients.length === 0
        ? 'CookMate recognized only pantry staples. Scan a main ingredient or prepared dish for accurate recipe suggestions.'
        : 'CookMate found ingredients, but no published recipe in the database matches them yet.'
      : null;

    return res.json({
      success: true,
      detectedIngredients: detectedIngredients.map(({ normalizedName, ...rest }) => rest),
      matchedRecipes,
      message,
      // Optional RAG metadata (safe to ignore on clients that don't use it)
      ragUsed,
      ragNoMatch,
      ragMatchReason,
      ragSelectedRecipeId: ragSelectedId,
      retrievedRecipeIds,
      ...queueInfo,
    });
  } catch (err) {
    const payload = geminiErrorPayload(err);
    logger.error('[ml/analyze-ingredients]', payload.error, err?.status ? `(status ${err.status})` : '');
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

exports.getAiCameraRateLimit = async (req, res) => {
  if (!req.userId) return res.json({ remaining: AI_CAMERA_DAILY_LIMIT, resetAt: null, usesCount: 0 });
  try {
    const { remaining, resetAt, usesCount } = await readDbRateLimit(req.userId);
    return res.json({ remaining, resetAt, usesCount, limit: AI_CAMERA_DAILY_LIMIT });
  } catch (err) {
    logger.error('[ml/ai-camera-rate-limit]', err);
    return res.json({ remaining: AI_CAMERA_DAILY_LIMIT, resetAt: null, usesCount: 0 });
  }
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

  if (req.userId) {
    try {
      const rl = await readDbRateLimit(req.userId);
      setRateLimitHeaders(res, rl.remaining, rl.resetAt);
      if (rl.remaining <= 0) {
        return res.status(429).json({
          error: 'Daily AI camera limit reached. You can analyze 3 images per day. Try again tomorrow.',
        });
      }
    } catch (rlErr) {
      logger.warn('[ml/camera/remove-bg] DB rate limit check failed, proceeding:', rlErr.message);
    }
  }

  try {
    const { cutout, queuePosition } = await enqueueBackgroundRemoval(async ({ queuePosition }) => {
      if (queuePosition > 0) {
        logger.warn(`[ml/camera/remove-bg] ${BG_REMOVAL_QUEUE_WARNING}`);
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
    logger.warn('[ml/camera/remove-bg]', details);
    res.status(200).json({
      cutout: null,
      fallbackUsed: true,
      warning: 'Using the original photo without background removal.',
      ...(process.env.NODE_ENV === 'production' ? {} : { details }),
    });
  }
};


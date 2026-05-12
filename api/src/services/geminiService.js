const { cleanDisplayText } = require('./recipeMatcher');

const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 45000);
const GEMINI_RAG_TIMEOUT_MS = Number(process.env.GEMINI_RAG_TIMEOUT_MS || 15000);
const MAX_GEMINI_RAG_OTHER_IDS = 7;
const ENABLE_GEMINI_RAG = String(process.env.ENABLE_GEMINI_RAG || 'true').toLowerCase() !== 'false';

const DEFAULT_GEMINI_MODELS = [
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
];

const AI_ANALYSIS_UNAVAILABLE = 'AI analysis is temporarily unavailable. Please try again.';
const AI_CAMERA_BUSY_WARNING =
  'Image analysis is currently busy. Many users are analyzing images right now. Please wait and try again shortly.';
const AI_CAMERA_QUEUE_FULL_MSG = 'Queue is full. Please wait until a slot becomes available.';
const MAX_AI_CAMERA_QUEUE_SIZE = 50;

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

function getGeminiModelNames() {
  const configuredModels = process.env.GEMINI_MODELS || process.env.GEMINI_MODEL || '';
  const modelNames = configuredModels ? configuredModels.split(',') : DEFAULT_GEMINI_MODELS;
  const seen = new Set();
  return modelNames
    .map((m) => String(m || '').trim())
    .filter(Boolean)
    .filter((m) => { if (seen.has(m)) return false; seen.add(m); return true; });
}

function shouldStopGeminiFallback(err) {
  return /API_KEY_INVALID|API key|SAFETY/i.test(String(err?.message || ''));
}

function isGeminiQuotaError(err) {
  const message = String(err?.message || '');
  return err?.status === 429 || /429|quota|too many requests/i.test(message);
}

function parseJsonFromModel(responseText) {
  const cleaned = String(responseText || '')
    .replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error('Model response was not valid JSON.');
  }
}

function geminiErrorPayload(err) {
  const message = String(err?.message || '');
  if (err?.code === 'AI_IMAGE_ANALYSIS_QUEUE_FULL') {
    return {
      status: 429,
      error: AI_CAMERA_BUSY_WARNING,
      message: AI_CAMERA_BUSY_WARNING,
      queueFullMessage: err.queueFullMessage || AI_CAMERA_QUEUE_FULL_MSG,
      queueCount: err.queueLimit || MAX_AI_CAMERA_QUEUE_SIZE,
      queueLimit: err.queueLimit || MAX_AI_CAMERA_QUEUE_SIZE,
      queueLabel: `Queue: ${err.queueLimit || MAX_AI_CAMERA_QUEUE_SIZE}/${err.queueLimit || MAX_AI_CAMERA_QUEUE_SIZE}`,
    };
  }
  if (isGeminiQuotaError(err)) return { status: 503, error: AI_ANALYSIS_UNAVAILABLE };
  if (err?.code === 'ETIMEDOUT') {
    return {
      status: 504,
      error: 'AI analysis is taking longer than usual. Please wait 1-2 minutes, then try again with a smaller or clearer image.',
    };
  }
  if (/API_KEY_INVALID|API key/i.test(message)) return { status: 503, error: 'Invalid AI API key. Check GEMINI_API_KEY.' };
  if (/SAFETY/i.test(message)) return { status: 422, error: 'Image could not be processed due to safety filters.' };
  return { status: 502, error: 'AI analysis failed. Please try again.' };
}

async function generateGeminiContent({ genAI, prompt, mimeType, base64Data }) {
  const modelNames = getGeminiModelNames();
  let lastError = null;

  for (const modelName of modelNames) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
      });
      const result = await withTimeout(
        model.generateContent([prompt, { inlineData: { mimeType, data: base64Data } }]),
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

async function selectRecipeWithGeminiRAG({ apiKey, detectedIngredients, candidates, maxOtherIds = MAX_GEMINI_RAG_OTHER_IDS }) {
  if (!ENABLE_GEMINI_RAG) return null;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  const MAX_GEMINI_RAG_CANDIDATES = 16;
  const contextRecipes = [];
  const allowedIds = [];
  const seenIds = new Set();

  for (const candidate of candidates.slice(0, MAX_GEMINI_RAG_CANDIDATES)) {
    const recipe = candidate.recipe || candidate;
    const id = Number(recipe?.id);
    if (!Number.isInteger(id) || id <= 0 || seenIds.has(id)) continue;
    seenIds.add(id);
    allowedIds.push(id);
    const matchedIngredients = Array.isArray(candidate.matchedIngredients) ? candidate.matchedIngredients : [];
    const allIngredients = Array.isArray(candidate.ingredients) ? candidate.ingredients
      : Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
    contextRecipes.push({
      id,
      title: recipe.title,
      category: recipe.category || recipe.region_or_origin || null,
      tags: Array.isArray(recipe.tags) ? recipe.tags.slice(0, 8) : [],
      matchedIngredients: matchedIngredients.slice(0, 12),
      allIngredients: allIngredients.slice(0, 24),
      description: cleanDisplayText(recipe.description || '').slice(0, 240),
      matchScore: candidate.score ?? candidate.matchScore ?? null,
      matchPercentage: candidate.matchPercentage ?? null,
    });
  }

  if (allowedIds.length === 0) return null;

  const prompt = `You are a recipe-matching assistant for the CookMate app.

You are given:
1. A list of ingredients that were detected from an image and verified to exist in the CookMate PostgreSQL database.
2. A closed list of CANDIDATE RECIPES retrieved from the database (published only).

Your job is to choose the single best matching recipe ID from the candidate list, and optionally return up to ${maxOtherIds} other candidate IDs as related suggestions, ranked by relevance to the detected ingredients.

STRICT RULES (do not violate):
- You MUST only return IDs that appear in the candidate list. Do not invent, rename, or modify any recipe.
- You MUST NOT suggest ingredients or recipes outside the provided context.
- Use matchedIngredients as the strongest evidence because those are the scanned ingredients found in that recipe.
- Use allIngredients only as database context; do not reward a recipe for ingredients that were not detected.
- Prefer recipes with the highest overlap with detectedIngredients and matchedIngredients.
- Do not include candidates that only match weak pantry staples such as water, salt, pepper, or cooking oil.
- If none of the candidates reasonably match the detected ingredients, return {"noMatch": true, "selectedId": null, "otherIds": [], "reason": "<short reason>"}.
- Return JSON ONLY. No markdown, no prose, no code fences.

Input:
{
  "detectedIngredients": ${JSON.stringify(detectedIngredients)},
  "allowedRecipeIds": ${JSON.stringify(allowedIds)},
  "candidateRecipes": ${JSON.stringify(contextRecipes)}
}

Return shape:
{
  "selectedId": <one of allowedRecipeIds or null>,
  "otherIds": [<up to ${maxOtherIds} other allowedRecipeIds ranked by relevance>],
  "reason": "<short sentence grounded only in the candidate data>",
  "noMatch": <true|false>
}`;

  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelNames = getGeminiModelNames();
    let lastError = null;

    for (const modelName of modelNames) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { temperature: 0, responseMimeType: 'application/json' },
        });
        const result = await withTimeout(
          model.generateContent(prompt),
          GEMINI_RAG_TIMEOUT_MS,
          'Gemini RAG selection'
        );
        const parsed = parseJsonFromModel(result.response.text());
        const allowed = new Set(allowedIds);
        const selectedId = Number.isInteger(Number(parsed.selectedId)) && allowed.has(Number(parsed.selectedId))
          ? Number(parsed.selectedId) : null;
        const otherIds = Array.isArray(parsed.otherIds)
          ? parsed.otherIds.map((v) => Number(v))
              .filter((id) => Number.isInteger(id) && allowed.has(id) && id !== selectedId)
              .slice(0, maxOtherIds)
          : [];
        const orderedIds = selectedId ? [selectedId, ...otherIds] : otherIds.slice(0, maxOtherIds + 1);
        return {
          selectedId: selectedId || orderedIds[0] || null,
          orderedIds,
          matchReason: cleanDisplayText(parsed.reason || '').slice(0, 300) || null,
          noMatch: parsed.noMatch === true || (!selectedId && orderedIds.length === 0),
          modelUsed: modelName,
        };
      } catch (err) {
        lastError = err;
        if (shouldStopGeminiFallback(err)) break;
      }
    }

    if (lastError) {
      console.warn('[ml/rag] Gemini grounding unavailable, falling back to DB ranking:', lastError.message);
    }
    return null;
  } catch (err) {
    console.warn('[ml/rag] Gemini grounding error, falling back to DB ranking:', err.message);
    return null;
  }
}

module.exports = {
  generateGeminiContent,
  selectRecipeWithGeminiRAG,
  geminiErrorPayload,
  parseJsonFromModel,
  withTimeout,
  GEMINI_TIMEOUT_MS,
  GEMINI_RAG_TIMEOUT_MS,
};

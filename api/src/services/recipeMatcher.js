const natural = require('natural');
const { pool } = require('../config/db');
const { getCachedPublishedRecipes, getCachedKnownIngredientRows } = require('./mlCache');

const tokenizer = new natural.WordTokenizer();

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'assorted', 'cooked', 'dish', 'food',
  'fresh', 'image', 'in', 'ingredient', 'ingredients', 'item', 'main',
  'object', 'of', 'on', 'or', 'piece', 'pieces', 'raw', 'sliced', 'the',
  'visible', 'unknown', 'unidentified', 'with',
]);

const LOW_SIGNAL_RECIPE_INGREDIENTS = new Set([
  'water', 'salt', 'pepper', 'black pepper', 'white pepper', 'oil',
  'cooking oil', 'vegetable oil',
]);

const INGREDIENT_FORM_TOKENS = new Set([
  'broth', 'oil', 'paste', 'powder', 'sauce', 'seasoning', 'stock',
]);

const MAX_AI_CAMERA_RECIPE_RESULTS = 8;
const MAX_GEMINI_RAG_CANDIDATES = 16;

// ─── Text normalization ───────────────────────────────────────────────────────

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
    chiles: 'chili', chilies: 'chili', chillies: 'chili',
    leaves: 'leaf', potatoes: 'potato', tomatoes: 'tomato',
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

function normalizedPhraseKey(value) {
  return tokenizeText(value).join(' ');
}

function hasWordBoundaryMatch(needle, haystack) {
  if (!needle || !haystack) return false;
  const escaped = String(needle).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('(?:^|\\b)' + escaped + '(?:\\b|$)', 'i').test(String(haystack));
}

function isLowSignalRecipeIngredient(value) {
  const phrase = normalizedPhraseKey(value) || normalizeText(value);
  if (!phrase) return true;
  if (LOW_SIGNAL_RECIPE_INGREDIENTS.has(phrase)) return true;
  const tokens = tokenizeText(phrase);
  return tokens.length > 0 && tokens.every((t) => LOW_SIGNAL_RECIPE_INGREDIENTS.has(t));
}

function hasIngredientFormMismatch(detectedTerm, candidateTerm) {
  const detectedTokens = new Set(tokenizeText(detectedTerm));
  const candidateTokens = new Set(tokenizeText(candidateTerm));
  if (candidateTokens.size <= detectedTokens.size) return false;
  for (const token of INGREDIENT_FORM_TOKENS) {
    if (candidateTokens.has(token) && !detectedTokens.has(token)) return true;
  }
  return false;
}

function ingredientTermMatches(detectedTerm, candidateTerm) {
  const detectedKey = normalizedPhraseKey(detectedTerm);
  const candidateKey = normalizedPhraseKey(candidateTerm);
  if (!detectedKey || !candidateKey) return false;
  if (detectedKey === candidateKey) return true;
  if (hasIngredientFormMismatch(detectedKey, candidateKey)) return false;
  return (
    hasWordBoundaryMatch(detectedKey, candidateKey) ||
    hasWordBoundaryMatch(candidateKey, detectedKey)
  );
}

function buildSearchTerms(values) {
  const phrases = new Set();
  const tokens = new Set();
  for (const value of values || []) {
    const phrase = normalizedPhraseKey(value) || normalizeText(value);
    if (phrase && !STOP_WORDS.has(phrase)) phrases.add(phrase);
    tokenizeText(value).forEach((token) => tokens.add(token));
  }
  return { phrases, tokens };
}

function normalizeText_clean(value, fallback = '') {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text || fallback;
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
    ['assorted ingredients', 'food', 'ingredient', 'object',
     'unknown food', 'unknown object', 'unidentified food', 'unidentified object',
    ].includes(normalized)
  );
}

// ─── Recipe indexing & scoring ────────────────────────────────────────────────

function getRecipeIngredients(recipe) {
  const normalized = Array.isArray(recipe.normalized_ingredients)
    ? recipe.normalized_ingredients.filter(Boolean) : [];
  if (normalized.length > 0) return normalized;
  return Array.isArray(recipe.linked_ingredients)
    ? recipe.linked_ingredients.filter(Boolean) : [];
}

function buildRecipeIndex(recipe) {
  const ingredientNames = getRecipeIngredients(recipe);
  const ingredientPhrases = ingredientNames
    .map((i) => normalizedPhraseKey(i) || normalizeText(i)).filter(Boolean);
  const ingredientPhraseSet = new Set(ingredientPhrases);
  const ingredientTokens = new Set(ingredientNames.flatMap(tokenizeText));
  const titleText = normalizeText(recipe.title);
  const descriptionText = normalizeText(recipe.description);
  const categoryText = normalizeText([recipe.category, recipe.region_or_origin].filter(Boolean).join(' '));
  const tagText = normalizeText(Array.isArray(recipe.tags) ? recipe.tags.join(' ') : '');
  return {
    ingredientPhrases, ingredientPhraseSet, ingredientTokens,
    titleText, titleTokens: new Set(tokenizeText(recipe.title)),
    descriptionText, descriptionTokens: new Set(tokenizeText(recipe.description)),
    categoryText, categoryTokens: new Set(tokenizeText(categoryText)),
    tagText, tagTokens: new Set(tokenizeText(tagText)),
  };
}

function scoreRecipe(query, indexedRecipe) {
  let score = 0;
  for (const phrase of query.phrases) {
    if (indexedRecipe.ingredientPhraseSet.has(phrase)) {
      score += 18;
    } else if (indexedRecipe.ingredientPhrases.some((i) => ingredientTermMatches(phrase, i))) {
      score += 12;
    }
    if (!isLowSignalRecipeIngredient(phrase)) {
      if (hasWordBoundaryMatch(phrase, indexedRecipe.titleText)) score += 5;
      if (hasWordBoundaryMatch(phrase, indexedRecipe.descriptionText)) score += 3;
      if (hasWordBoundaryMatch(phrase, indexedRecipe.categoryText)) score += 2;
      if (hasWordBoundaryMatch(phrase, indexedRecipe.tagText)) score += 2;
    }
  }
  for (const token of query.tokens) {
    if (isLowSignalRecipeIngredient(token)) continue;
    if (indexedRecipe.titleTokens.has(token)) score += 3;
    if (indexedRecipe.descriptionTokens.has(token)) score += 2;
    if (indexedRecipe.categoryTokens.has(token)) score += 1;
    if (indexedRecipe.tagTokens.has(token)) score += 1;
  }
  return score;
}

function findMatchedIngredientsForRecipe(ingredients, indexedRecipe) {
  const matches = [];
  const seen = new Set();
  for (const ingredient of Array.isArray(ingredients) ? ingredients : []) {
    const normalized = normalizedPhraseKey(ingredient) || normalizeText(ingredient);
    if (!normalized || seen.has(normalized)) continue;
    if (indexedRecipe.ingredientPhrases.some((r) => ingredientTermMatches(normalized, r))) {
      seen.add(normalized);
      matches.push(normalized);
    }
  }
  return matches;
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
    ingredients: getRecipeIngredients(recipe),
  };
}

function reorderByIds(candidates, orderedIds) {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) return candidates;
  const byId = new Map();
  for (const c of candidates) {
    const id = Number(c?.recipe?.id ?? c?.id);
    if (Number.isInteger(id)) byId.set(id, c);
  }
  const placed = new Set();
  const out = [];
  for (const id of orderedIds) {
    const item = byId.get(Number(id));
    if (item && !placed.has(id)) { out.push(item); placed.add(id); }
  }
  for (const c of candidates) {
    const id = Number(c?.recipe?.id ?? c?.id);
    if (!placed.has(id)) out.push(c);
  }
  return out;
}

function filterAndOrderByIds(candidates, orderedIds, limit = MAX_AI_CAMERA_RECIPE_RESULTS) {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) return [];
  const byId = new Map();
  for (const candidate of Array.isArray(candidates) ? candidates : []) {
    const id = Number(candidate?.recipe?.id ?? candidate?.id);
    if (Number.isInteger(id) && !byId.has(id)) byId.set(id, candidate);
  }
  const placed = new Set();
  const out = [];
  for (const id of orderedIds) {
    const numericId = Number(id);
    const candidate = byId.get(numericId);
    if (!candidate || placed.has(numericId)) continue;
    placed.add(numericId);
    out.push(candidate);
    if (out.length >= limit) break;
  }
  return out;
}

async function findRecipesByIngredients(ingredients, limit = 8) {
  const query = buildSearchTerms(ingredients);
  if (query.phrases.size === 0 && query.tokens.size === 0) return [];
  const recipes = await getCachedPublishedRecipes();
  if (recipes.length === 0) return [];

  const results = recipes
    .map((recipe) => {
      const index = buildRecipeIndex(recipe);
      const matchedIngredients = findMatchedIngredientsForRecipe(ingredients, index);
      return {
        recipe: toRecipePayload(recipe),
        score: scoreRecipe(query, index),
        matchedIngredients,
        isFeatured: recipe.is_featured === true,
      };
    })
    .filter((r) => r.score > 0 && r.matchedIngredients.length > 0)
    .sort((a, b) => {
      if (b.matchedIngredients.length !== a.matchedIngredients.length)
        return b.matchedIngredients.length - a.matchedIngredients.length;
      if (b.score !== a.score) return b.score - a.score;
      return Number(b.isFeatured) - Number(a.isFeatured);
    });

  const topScore = results[0]?.score || 1;
  return results.slice(0, limit).map(({ isFeatured, ...result }) => ({
    ...result,
    matchPercentage: Math.max(35, Math.min(100, Math.round((result.score / topScore) * 100))),
  }));
}

function filterValidRecipeSuggestions(recipeSuggestions) {
  const seenIds = new Set();
  const filtered = [];
  for (const suggestion of Array.isArray(recipeSuggestions) ? recipeSuggestions : []) {
    const recipe = suggestion?.recipe;
    if (!recipe || !Number.isFinite(Number(recipe.id)) || !cleanDisplayText(recipe.title)) continue;
    const recipeId = Number(recipe.id);
    if (seenIds.has(recipeId)) continue;
    seenIds.add(recipeId);
    filtered.push({ ...suggestion, recipe: { ...recipe, id: recipeId } });
  }
  return filtered;
}

async function filterAvailableRecipeSuggestions(recipeSuggestions) {
  const validSuggestions = filterValidRecipeSuggestions(recipeSuggestions);
  if (validSuggestions.length === 0) return [];
  const recipeIds = validSuggestions.map((s) => Number(s.recipe.id));
  const result = await pool.query(
    `SELECT id, title, description, difficulty,
            prep_time_minutes, cook_time_minutes, total_time_minutes,
            servings, calories, region_or_origin, category, tags,
            normalized_ingredients, image_url
     FROM recipes
     WHERE id = ANY($1::int[]) AND is_published = true`,
    [recipeIds]
  );
  const currentRecipesById = new Map(
    result.rows.map((r) => [Number(r.id), toRecipePayload(r)])
  );
  return validSuggestions
    .map((s) => {
      const current = currentRecipesById.get(Number(s.recipe.id));
      return current ? { ...s, recipe: current } : null;
    })
    .filter(Boolean);
}

function scoreKnownIngredient(detectedTerm, ingredientName) {
  const detectedKey = normalizedPhraseKey(detectedTerm);
  const ingredientKey = normalizedPhraseKey(ingredientName);
  if (!detectedKey || !ingredientKey) return 0;
  if (detectedKey === ingredientKey) return 100;
  if (hasIngredientFormMismatch(detectedKey, ingredientKey)) return 0;
  if (hasWordBoundaryMatch(ingredientKey, detectedKey)) return 88;
  if (hasWordBoundaryMatch(detectedKey, ingredientKey)) return 72;
  const detectedTokens = tokenizeText(detectedKey);
  const ingredientTokens = new Set(tokenizeText(ingredientKey));
  if (detectedTokens.length > 1 && detectedTokens.every((t) => ingredientTokens.has(t))) return 60;
  return 0;
}

function canonicalKnownIngredientMatch(detectedTerm, ingredientName) {
  const detectedKey = normalizedPhraseKey(detectedTerm);
  const ingredientKey = normalizedPhraseKey(ingredientName);
  if (!detectedKey) return normalizeText(detectedTerm);
  if (!ingredientKey) return detectedKey;
  if (detectedKey === ingredientKey) return ingredientKey;
  const ingredientIsContained =
    hasWordBoundaryMatch(ingredientKey, detectedKey) &&
    tokenizeText(ingredientKey).length <= tokenizeText(detectedKey).length;
  return ingredientIsContained ? ingredientKey : detectedKey;
}

async function findKnownIngredientMatches(terms, limit = 8) {
  const detectedTerms = cleanTextList(terms, 15).filter(isUsefulRecipeTerm);
  if (detectedTerms.length === 0) return { matches: [], knownIngredientCount: 0 };

  const knownIngredientRows = await getCachedKnownIngredientRows();
  const seen = new Set();
  const matches = [];

  for (const detectedTerm of detectedTerms) {
    const best = knownIngredientRows
      .map((row) => ({ name: cleanDisplayText(row.name), score: scoreKnownIngredient(detectedTerm, row.name) }))
      .filter((item) => item.name && item.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return normalizedPhraseKey(a.name).length - normalizedPhraseKey(b.name).length;
      })[0];

    if (!best) continue;
    const canonical = canonicalKnownIngredientMatch(detectedTerm, best.name);
    const normalized = normalizedPhraseKey(canonical) || normalizeText(canonical);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    matches.push(normalized);
    if (matches.length >= limit) break;
  }

  return { matches, knownIngredientCount: knownIngredientRows.length };
}

module.exports = {
  normalizeText,
  simplifyToken,
  tokenizeText,
  normalizedPhraseKey,
  hasWordBoundaryMatch,
  isLowSignalRecipeIngredient,
  isGenericDetectedName,
  isUsefulRecipeTerm,
  cleanTextList,
  cleanDisplayText,
  buildSearchTerms,
  buildRecipeIndex,
  scoreRecipe,
  findMatchedIngredientsForRecipe,
  toRecipePayload,
  reorderByIds,
  filterAndOrderByIds,
  findRecipesByIngredients,
  filterAvailableRecipeSuggestions,
  findKnownIngredientMatches,
  MAX_AI_CAMERA_RECIPE_RESULTS,
  MAX_GEMINI_RAG_CANDIDATES,
};

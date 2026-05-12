"""
Ingredient Gap Detector
Finds ingredients frequently detected via AI Camera that have
zero or very few matching recipes in the database.

Matching method: TF-IDF cosine similarity between the scanned ingredient
name and all recipe ingredient names. recipe_match_count = number of
distinct recipe ingredients with similarity >= SIMILARITY_THRESHOLD.
This catches fuzzy matches (e.g. "chicken breast" → "boneless chicken")
that exact string matching misses.

Falls back to exact match if the TF-IDF corpus is empty.
"""

import logging
import os
import datetime
import json
import joblib
import numpy as np

from db import query

logger = logging.getLogger("ml_service.gaps")

ARTIFACT_DIR = os.path.join(os.path.dirname(__file__), "..", "artifacts")
META_PATH = os.path.join(ARTIFACT_DIR, "gaps_meta.joblib")
RESULT_PATH = os.path.join(ARTIFACT_DIR, "gaps_result.joblib")
VECTORIZER_PATH = os.path.join(ARTIFACT_DIR, "gaps_vectorizer.joblib")

MIN_ROWS = 5
SIMILARITY_THRESHOLD = 0.6


def _extract_ingredients_from_saves() -> dict[str, int]:
    rows = query("SELECT full_analysis_result FROM ai_camera_saves")
    freq: dict[str, int] = {}
    for row in rows:
        analysis = row.get("full_analysis_result") or {}
        if isinstance(analysis, str):
            try:
                analysis = json.loads(analysis)
            except Exception:
                continue
        detected = analysis.get("detectedIngredients", [])
        if not isinstance(detected, list):
            continue
        for item in detected:
            name = None
            if isinstance(item, dict):
                name = item.get("name") or item.get("ingredient")
            elif isinstance(item, str):
                name = item
            if name and isinstance(name, str):
                key = name.strip().lower()
                if key:
                    freq[key] = freq.get(key, 0) + 1
    return freq


def _get_recipe_ingredient_names() -> list[tuple[str, int]]:
    """Return list of (ingredient_name_lower, recipe_count) for all ingredients."""
    rows = query(
        """
        SELECT LOWER(TRIM(i.name)) AS name, COUNT(DISTINCT ri.recipe_id) AS recipe_count
        FROM ingredients i
        LEFT JOIN recipe_ingredients ri ON ri.ingredient_id = i.id
        GROUP BY LOWER(TRIM(i.name))
        """
    )
    return [(r["name"], int(r["recipe_count"])) for r in rows]


def _build_tfidf_matcher(recipe_ingredients: list[tuple[str, int]]):
    """
    Fit a TF-IDF vectorizer on recipe ingredient names.
    Returns (vectorizer, tfidf_matrix, recipe_ingredient_list).
    tfidf_matrix rows correspond to recipe_ingredients entries.
    """
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity as _cs  # noqa: F401

    names = [name for name, _ in recipe_ingredients]
    if not names:
        return None, None, recipe_ingredients

    vectorizer = TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4), min_df=1)
    tfidf_matrix = vectorizer.fit_transform(names)
    return vectorizer, tfidf_matrix, recipe_ingredients


def _similarity_match_count(
    ingredient: str,
    vectorizer,
    tfidf_matrix,
    recipe_ingredients: list[tuple[str, int]],
) -> int:
    """
    Count distinct recipe ingredient names with cosine similarity >= threshold.
    Falls back to 0 if vectorizer is None (empty corpus).
    """
    if vectorizer is None:
        return sum(1 for name, _ in recipe_ingredients if ingredient == name)

    from sklearn.metrics.pairwise import cosine_similarity

    query_vec = vectorizer.transform([ingredient])
    sims = cosine_similarity(query_vec, tfidf_matrix).flatten()
    return int(np.sum(sims >= SIMILARITY_THRESHOLD))


def _build_gaps(
    freq: dict[str, int],
    recipe_ingredients: list[tuple[str, int]],
    vectorizer,
    tfidf_matrix,
) -> list[dict]:
    """
    Build gap entries using TF-IDF similarity for recipe_match_count.
    gap_score = scan_frequency / (recipe_match_count + 1)
    Sorted by gap_score descending.
    """
    gaps = []
    for ingredient, scan_count in freq.items():
        recipe_match_count = _similarity_match_count(
            ingredient, vectorizer, tfidf_matrix, recipe_ingredients
        )
        gap_score = round(scan_count / (recipe_match_count + 1), 4)
        gaps.append({
            "ingredient": ingredient,
            "scan_frequency": scan_count,
            "recipe_match_count": recipe_match_count,
            "gap_score": gap_score,
            "is_gap": recipe_match_count == 0,
        })
    gaps.sort(key=lambda x: (-x["gap_score"], -x["scan_frequency"]))
    return gaps


def train() -> dict:
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    freq = _extract_ingredients_from_saves()

    if sum(freq.values()) < MIN_ROWS:
        return {"status": "insufficient_data", "rows": sum(freq.values())}

    recipe_ingredients = _get_recipe_ingredient_names()
    vectorizer, tfidf_matrix, recipe_ingredients = _build_tfidf_matcher(recipe_ingredients)
    gaps = _build_gaps(freq, recipe_ingredients, vectorizer, tfidf_matrix)

    if vectorizer is not None:
        joblib.dump(vectorizer, VECTORIZER_PATH)

    now = datetime.datetime.utcnow()
    meta = {
        "trained_at": now.isoformat(),
        "total_ingredients_scanned": len(freq),
        "total_gaps": sum(1 for g in gaps if g["is_gap"]),
        "method": "tfidf_similarity",
        "similarity_threshold": SIMILARITY_THRESHOLD,
        "corpus_size": len(recipe_ingredients),
    }

    joblib.dump(meta, META_PATH)
    joblib.dump(gaps, RESULT_PATH)
    return meta


def _compute_live() -> dict:
    """Compute ingredient gaps directly from DB without a saved artifact."""
    freq = _extract_ingredients_from_saves()
    if not freq:
        return {"insufficient_data": True, "message": "No AI Camera scans yet.", "gaps": []}

    recipe_ingredients = _get_recipe_ingredient_names()

    if os.path.exists(VECTORIZER_PATH):
        vectorizer = joblib.load(VECTORIZER_PATH)
        tfidf_matrix = vectorizer.transform([name for name, _ in recipe_ingredients])
    else:
        vectorizer, tfidf_matrix, recipe_ingredients = _build_tfidf_matcher(recipe_ingredients)

    gaps = _build_gaps(freq, recipe_ingredients, vectorizer, tfidf_matrix)
    return {
        "insufficient_data": False,
        "gaps": gaps,
        "total_gaps": sum(1 for g in gaps if g["is_gap"]),
        "total_scanned": len(freq),
        "trained_at": None,
    }


def _vectorizer_is_stale(meta: dict) -> bool:
    """
    Return True if the recipe ingredient corpus has grown by more than
    STALE_THRESHOLD since the vectorizer was last trained.
    A 10% change is meaningful enough to warrant a re-fit.
    """
    STALE_THRESHOLD = 0.10
    cached_size = meta.get("corpus_size", 0)
    if cached_size == 0:
        return True
    current_size = len(_get_recipe_ingredient_names())
    return abs(current_size - cached_size) / cached_size > STALE_THRESHOLD


def predict() -> dict:
    if not os.path.exists(RESULT_PATH):
        return _compute_live()

    meta: dict = joblib.load(META_PATH)

    if _vectorizer_is_stale(meta):
        logger.info("[gaps] Vectorizer corpus is stale — recomputing live gaps.")
        return _compute_live()

    gaps: list = joblib.load(RESULT_PATH)

    return {
        "insufficient_data": False,
        "gaps": gaps,
        "total_gaps": meta.get("total_gaps", 0),
        "total_scanned": meta.get("total_ingredients_scanned", 0),
        "trained_at": meta.get("trained_at"),
    }

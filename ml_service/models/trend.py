"""
Recipe Trend Forecaster
Predicts which recipes will trend next week using per-recipe regression.

Algorithm per recipe:
1. Fit a linear trend (numpy.polyfit) on week_num → view_count.
2. Compute Durbin-Watson statistic on residuals.
   If DW < 1.5 (positive autocorrelation), the linear model leaves
   systematic patterns unexplained → switch to Holt's double exponential
   smoothing (statsmodels), which adapts to level and trend changes.
3. Confidence = per-recipe R² (0–100%). For Holt fits, use in-sample R².
4. Held-out MAE: reserve last week as a test point (when ≥3 weeks exist).
"""

import logging
import os
import datetime
import warnings
import joblib
import numpy as np
import pandas as pd

from db import query

logger = logging.getLogger("ml_service.trend")

ARTIFACT_DIR = os.path.join(os.path.dirname(__file__), "..", "artifacts")
META_PATH = os.path.join(ARTIFACT_DIR, "trend_meta.joblib")
FITS_PATH = os.path.join(ARTIFACT_DIR, "trend_fits.joblib")

MIN_ROWS = 15
MIN_WEEKS_PER_RECIPE = 2
DW_AUTOCORR_THRESHOLD = 1.5


def _load_data() -> pd.DataFrame:
    rows = query(
        """
        SELECT
            r.id          AS recipe_id,
            r.title,
            DATE_TRUNC('week', rv.viewed_at) AS week,
            COUNT(*)      AS view_count
        FROM recipe_viewed rv
        JOIN recipes r ON r.id = rv.recipe_id
        GROUP BY r.id, r.title, DATE_TRUNC('week', rv.viewed_at)
        ORDER BY r.id, week
        """
    )
    return pd.DataFrame(rows)


def _r2(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    ss_res = np.sum((y_true - y_pred) ** 2)
    ss_tot = np.sum((y_true - np.mean(y_true)) ** 2)
    if ss_tot == 0:
        return 1.0 if ss_res == 0 else 0.0
    return float(1.0 - ss_res / ss_tot)


def _durbin_watson(residuals: np.ndarray) -> float:
    """Durbin-Watson statistic: ~2=no autocorr, <1.5=positive autocorr."""
    if len(residuals) < 3:
        return 2.0
    diff = np.diff(residuals)
    dw = float(np.sum(diff ** 2) / np.sum(residuals ** 2)) if np.sum(residuals ** 2) > 0 else 2.0
    return dw


def _holt_fit(counts: np.ndarray) -> tuple[float, float, float]:
    """
    Fit Holt's double exponential smoothing and forecast one step ahead.
    Returns (predicted_next, r2_insample, held_out_mae_or_nan).
    """
    from statsmodels.tsa.holtwinters import Holt

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        model = Holt(counts.astype(float), initialization_method="estimated")
        fit = model.fit(optimized=True)

    y_pred = fit.fittedvalues
    r2_val = max(0.0, _r2(counts, y_pred))
    predicted_next = max(0.0, float(fit.forecast(1)[0]))

    held_out_mae = None
    if len(counts) >= 3:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            m_ho = Holt(counts[:-1].astype(float), initialization_method="estimated")
            f_ho = m_ho.fit(optimized=True)
        held_out_mae = float(abs(f_ho.forecast(1)[0] - counts[-1]))

    return predicted_next, r2_val, held_out_mae


def _fit_recipe(week_nums: np.ndarray, counts: np.ndarray) -> dict:
    """
    Fit a recipe's view-count series and return a fit descriptor dict.
    Selects between linear polyfit and Holt exponential smoothing based
    on the Durbin-Watson test of linear residuals.
    """
    if len(week_nums) < MIN_WEEKS_PER_RECIPE:
        mean_count = float(np.mean(counts)) if len(counts) > 0 else 0.0
        return {
            "slope": 0.0, "intercept": mean_count,
            "r2": 0.0, "held_out_mae": None,
            "method": "mean", "predicted_next": mean_count,
            "max_week_num": int(week_nums[-1]) if len(week_nums) > 0 else 0,
        }

    # Linear fit
    coeffs = np.polyfit(week_nums, counts, 1)
    slope, intercept = float(coeffs[0]), float(coeffs[1])
    y_pred_lin = np.polyval(coeffs, week_nums)
    residuals = counts - y_pred_lin
    dw = _durbin_watson(residuals)
    r2_lin = max(0.0, _r2(counts, y_pred_lin))

    # Held-out MAE for linear
    ho_mae_lin = None
    if len(week_nums) >= 3:
        c_ho = np.polyfit(week_nums[:-1], counts[:-1], 1)
        ho_mae_lin = float(abs(np.polyval(c_ho, week_nums[-1]) - counts[-1]))

    use_holt = dw < DW_AUTOCORR_THRESHOLD and len(counts) >= 4
    if use_holt:
        try:
            predicted_next, r2_holt, ho_mae_holt = _holt_fit(counts)
            return {
                "slope": None, "intercept": None,
                "r2": round(r2_holt, 4), "held_out_mae": ho_mae_holt,
                "method": "holt", "predicted_next": round(predicted_next, 1),
                "max_week_num": int(week_nums[-1]),
                "dw": round(dw, 4),
            }
        except Exception as exc:
            logger.warning(f"[trend] Holt fit failed ({exc}), falling back to linear.")

    next_week = float(week_nums[-1]) + 1
    predicted_next = max(0.0, slope * next_week + intercept)
    return {
        "slope": slope, "intercept": intercept,
        "r2": round(r2_lin, 4), "held_out_mae": ho_mae_lin,
        "method": "linear", "predicted_next": round(predicted_next, 1),
        "max_week_num": int(week_nums[-1]),
        "dw": round(dw, 4),
    }


def train() -> dict:
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    df = _load_data()

    if len(df) < MIN_ROWS:
        return {"status": "insufficient_data", "rows": len(df)}

    df["week"] = pd.to_datetime(df["week"])
    global_week_min = df["week"].min()
    df["week_num"] = (df["week"] - global_week_min).dt.days // 7
    df["view_count"] = df["view_count"].astype(float)

    fits: dict[int, dict] = {}
    maes = []
    holt_count = 0

    for recipe_id, grp in df.groupby("recipe_id"):
        grp_sorted = grp.sort_values("week_num")
        wn = grp_sorted["week_num"].values.astype(float)
        vc = grp_sorted["view_count"].values

        fit = _fit_recipe(wn, vc)
        fit["title"] = grp_sorted["title"].iloc[0]
        fits[recipe_id] = fit

        if fit["held_out_mae"] is not None:
            maes.append(fit["held_out_mae"])
        if fit["method"] == "holt":
            holt_count += 1

    mean_mae = round(float(np.mean(maes)), 2) if maes else None
    overall_r2 = round(float(np.mean([f["r2"] for f in fits.values()])), 4) if fits else 0.0

    joblib.dump(fits, FITS_PATH)
    meta = {
        "trained_at": datetime.datetime.utcnow().isoformat(),
        "r2": overall_r2,
        "held_out_mae": mean_mae,
        "rows": len(df),
        "recipe_count": len(fits),
        "holt_count": holt_count,
        "linear_count": len(fits) - holt_count,
        "global_week_min": global_week_min.isoformat(),
    }
    joblib.dump(meta, META_PATH)
    return meta


def _predict_rule_based() -> dict:
    """Fallback: rank recipes by recent view count when no trained model exists."""
    rows = query(
        """
        SELECT
            r.id AS recipe_id,
            r.title,
            COUNT(*) AS view_count
        FROM recipe_viewed rv
        JOIN recipes r ON r.id = rv.recipe_id
        GROUP BY r.id, r.title
        ORDER BY view_count DESC
        LIMIT 5
        """
    )
    if not rows:
        return {"insufficient_data": True, "message": "No recipe view data yet.", "forecasts": []}

    forecasts = []
    for r in rows:
        current = int(r["view_count"])
        forecasts.append({
            "recipe_id": r["recipe_id"],
            "title": r["title"],
            "current_views": current,
            "predicted_views": float(current),
            "trend_direction": "up",
            "confidence": 0,
        })
    return {"insufficient_data": False, "forecasts": forecasts, "trained_at": None, "r2": None}


def predict() -> dict:
    if not (os.path.exists(FITS_PATH) and os.path.exists(META_PATH)):
        return _predict_rule_based()

    fits: dict = joblib.load(FITS_PATH)
    meta: dict = joblib.load(META_PATH)

    if not fits:
        return {"insufficient_data": True, "message": "No recipe data.", "forecasts": []}

    current_rows = query(
        """
        SELECT recipe_id, COUNT(*) AS cnt
        FROM recipe_viewed
        WHERE viewed_at >= NOW() - INTERVAL '7 days'
        GROUP BY recipe_id
        """
    )
    current_map = {r["recipe_id"]: int(r["cnt"]) for r in current_rows}

    results = []
    for recipe_id, fit in fits.items():
        predicted = float(fit.get("predicted_next", 0.0))
        current = current_map.get(recipe_id, 0)
        confidence = min(100, max(0, round(fit["r2"] * 100)))
        results.append({
            "recipe_id": recipe_id,
            "title": fit["title"],
            "current_views": current,
            "predicted_views": round(predicted, 1),
            "trend_direction": "up" if predicted > current else "down",
            "confidence": confidence,
        })

    results.sort(key=lambda x: x["predicted_views"], reverse=True)
    top5 = results[:5]

    return {
        "insufficient_data": False,
        "forecasts": top5,
        "trained_at": meta.get("trained_at"),
        "r2": meta.get("r2"),
    }

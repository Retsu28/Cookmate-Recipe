"""
Model Drift Detector
Compares each trained model's last predictions against actuals from
the following week to detect when a model has diverged significantly.

Drift is flagged when the relative prediction error exceeds DRIFT_THRESHOLD.
Results are stored in drift_report.joblib and exposed via /ml/drift-report.

Currently checks:
  - Trend Forecaster: compares top-5 predicted_views vs actual views last week
  - Traffic Forecaster: compares 7-day forecast totals vs actual event counts
  
Churn and Gaps are rule/clustering based with no point-in-time forecast to
compare against, so they are skipped (noted as "not_applicable" in report).
"""

import logging
import os
import datetime
import joblib
import numpy as np

from db import query

logger = logging.getLogger("ml_service.drift")

ARTIFACT_DIR = os.path.join(os.path.dirname(__file__), "..", "artifacts")
DRIFT_REPORT_PATH = os.path.join(ARTIFACT_DIR, "drift_report.joblib")
TREND_FITS_PATH = os.path.join(ARTIFACT_DIR, "trend_fits.joblib")
TRAFFIC_RESULT_PATH = os.path.join(ARTIFACT_DIR, "traffic_result.joblib")

DRIFT_THRESHOLD = 0.50  # flag if relative error > 50 %


def _relative_error(predicted: float, actual: float) -> float | None:
    if actual == 0 and predicted == 0:
        return 0.0
    if actual == 0:
        return None  # undefined — can't measure relative error against zero
    return abs(predicted - actual) / actual


def _check_trend_drift() -> dict:
    """
    For each recipe in trend_fits, compare predicted_next to actual views
    in the 7 days since the model was last trained.
    Returns a drift entry with mean relative error and flagged recipes.
    """
    if not os.path.exists(TREND_FITS_PATH):
        return {"status": "no_artifact"}

    fits: dict = joblib.load(TREND_FITS_PATH)
    if not fits:
        return {"status": "no_fits"}

    actual_rows = query(
        """
        SELECT recipe_id, COUNT(*) AS cnt
        FROM recipe_viewed
        WHERE viewed_at >= NOW() - INTERVAL '7 days'
        GROUP BY recipe_id
        """
    )
    actual_map = {r["recipe_id"]: int(r["cnt"]) for r in actual_rows}

    errors = []
    flagged = []
    for recipe_id, fit in fits.items():
        predicted = float(fit.get("predicted_next", 0.0))
        actual = float(actual_map.get(recipe_id, 0))
        err = _relative_error(predicted, actual)
        if err is None:
            continue
        errors.append(err)
        if err > DRIFT_THRESHOLD:
            flagged.append({
                "recipe_id": recipe_id,
                "title": fit.get("title", ""),
                "predicted": round(predicted, 1),
                "actual": actual,
                "relative_error": round(err, 3),
            })

    mean_error = round(float(np.mean(errors)), 4) if errors else None
    drifted = mean_error is not None and mean_error > DRIFT_THRESHOLD

    return {
        "status": "drifted" if drifted else "ok",
        "mean_relative_error": mean_error,
        "flagged_recipes": flagged,
        "recipes_checked": len(errors),
    }


def _check_traffic_drift() -> dict:
    """
    Compare the last stored 7-day forecast totals (predicted_events sum)
    against actual total events in the same window.
    """
    if not os.path.exists(TRAFFIC_RESULT_PATH):
        return {"status": "no_artifact"}

    result: dict = joblib.load(TRAFFIC_RESULT_PATH)
    forecast = result.get("seven_day_forecast", [])
    if not forecast:
        return {"status": "no_forecast"}

    predicted_total = sum(f.get("predicted_events", 0) for f in forecast)

    actual_rows = query(
        """
        SELECT COUNT(*) AS cnt FROM (
            SELECT viewed_at AS ts FROM recipe_viewed WHERE viewed_at >= NOW() - INTERVAL '7 days'
            UNION ALL
            SELECT created_at AS ts FROM ai_camera_saves WHERE created_at >= NOW() - INTERVAL '7 days'
            UNION ALL
            SELECT created_at AS ts FROM meal_plans WHERE created_at >= NOW() - INTERVAL '7 days'
        ) sub
        """
    )
    actual_total = float(actual_rows[0]["cnt"]) if actual_rows else 0.0

    err = _relative_error(predicted_total, actual_total)
    drifted = err is not None and err > DRIFT_THRESHOLD

    return {
        "status": "drifted" if drifted else "ok",
        "predicted_total": round(predicted_total, 1),
        "actual_total": actual_total,
        "relative_error": round(err, 3) if err is not None else None,
    }


def compute_drift_report() -> dict:
    """Run all drift checks and persist + return the report."""
    os.makedirs(ARTIFACT_DIR, exist_ok=True)

    report = {
        "checked_at": datetime.datetime.utcnow().isoformat(),
        "threshold": DRIFT_THRESHOLD,
        "models": {
            "trend": _check_trend_drift(),
            "traffic": _check_traffic_drift(),
            "churn": {"status": "not_applicable", "reason": "clustering — no point forecast"},
            "gaps": {"status": "not_applicable", "reason": "similarity ranking — no point forecast"},
        },
    }

    any_drifted = any(
        v.get("status") == "drifted"
        for v in report["models"].values()
    )
    report["any_drifted"] = any_drifted

    joblib.dump(report, DRIFT_REPORT_PATH)
    logger.info(f"[drift] Report saved — any_drifted={any_drifted}")
    return report


def get_drift_report() -> dict:
    """Return cached report if available, else compute fresh."""
    if os.path.exists(DRIFT_REPORT_PATH):
        return joblib.load(DRIFT_REPORT_PATH)
    return compute_drift_report()

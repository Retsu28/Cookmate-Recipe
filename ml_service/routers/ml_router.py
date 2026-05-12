import os
import joblib
from fastapi import APIRouter

from models import trend, churn, gaps, traffic, drift

router = APIRouter(prefix="/ml")

ARTIFACT_DIR = os.path.join(os.path.dirname(__file__), "..", "artifacts")


_RULE_BASED_METHODS = {"rule_based", "dow_mean", "tfidf_similarity"}


def _model_status_entry(name: str, meta_path: str, accuracy_key: str = "accuracy") -> dict:
    if not os.path.exists(meta_path):
        return {"model": name, "trained": False, "trained_at": None, "accuracy": None, "method": None}
    try:
        meta = joblib.load(meta_path)
        method = meta.get("method") or meta.get("forecast_method")
        is_rule_based = method in _RULE_BASED_METHODS
        accuracy = None if is_rule_based else meta.get(accuracy_key)
        return {
            "model": name,
            "trained": True,
            "trained_at": meta.get("trained_at"),
            "accuracy": accuracy,
            "method": method,
            "rows": meta.get("rows"),
        }
    except Exception:
        return {"model": name, "trained": False, "trained_at": None, "accuracy": None, "method": None}


@router.get("/trending-forecast")
def trending_forecast():
    return trend.predict()


@router.get("/churn-risk")
def churn_risk():
    return churn.predict()


@router.get("/ingredient-gaps")
def ingredient_gaps():
    return gaps.predict()


@router.get("/traffic-forecast")
def traffic_forecast():
    return traffic.predict()


@router.get("/model-status")
def model_status():
    return {
        "models": [
            _model_status_entry("Trend Forecaster",   os.path.join(ARTIFACT_DIR, "trend_meta.joblib"),   "r2"),
            _model_status_entry("Churn Risk",         os.path.join(ARTIFACT_DIR, "churn_meta.joblib"),   "silhouette_score"),
            _model_status_entry("Ingredient Gaps",    os.path.join(ARTIFACT_DIR, "gaps_meta.joblib"),    "accuracy"),
            _model_status_entry("Traffic Forecaster", os.path.join(ARTIFACT_DIR, "traffic_meta.joblib"), "accuracy"),
        ]
    }


@router.get("/drift-report")
def drift_report():
    return drift.get_drift_report()

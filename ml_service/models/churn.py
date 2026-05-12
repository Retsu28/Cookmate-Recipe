"""
Churn Risk Classifier
Scores each user by inactivity risk (High / Medium / Low) using
K-Means clustering (k=3) on RFM-style features derived from activity tables.

Using unsupervised clustering instead of rule-derived labels means cluster
boundaries adapt to the actual data distribution. Post-hoc labels are
assigned by centroid recency_days rank: highest recency → High churn risk.

No last_active column exists on users — derived via GREATEST() join.
"""

import os
import datetime
import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler

from db import query

ARTIFACT_DIR = os.path.join(os.path.dirname(__file__), "..", "artifacts")
MODEL_PATH = os.path.join(ARTIFACT_DIR, "churn_model.joblib")
SCALER_PATH = os.path.join(ARTIFACT_DIR, "churn_scaler.joblib")
META_PATH = os.path.join(ARTIFACT_DIR, "churn_meta.joblib")

MIN_ROWS = 10
FEATURE_COLS = ["recency_days", "frequency", "engagement", "account_age_days"]
RISK_LABELS = ["High", "Medium", "Low"]
K_MIN = 2
K_MAX = 5


def _load_features() -> pd.DataFrame:
    rows = query(
        """
        SELECT
            u.id AS user_id,
            u.full_name,
            u.email,
            GREATEST(
                MAX(rv.viewed_at),
                MAX(mp.created_at),
                MAX(acs.created_at),
                MAX(gg.generated_at),
                u.updated_at
            ) AS last_active,
            COUNT(DISTINCT rv.recipe_id)  AS recipes_viewed,
            COUNT(DISTINCT mp.id)         AS meal_plans,
            COUNT(DISTINCT acs.id)        AS ai_scans,
            COUNT(DISTINCT gg.id)         AS grocery_gens,
            u.created_at
        FROM users u
        LEFT JOIN recipe_viewed rv         ON rv.user_id = u.id
        LEFT JOIN meal_plans mp            ON mp.user_id = u.id
        LEFT JOIN ai_camera_saves acs      ON acs.user_id = u.id
        LEFT JOIN meal_planner_grocery_generations gg ON gg.user_id = u.id
        WHERE u.role = 'user'
        GROUP BY u.id, u.full_name, u.email, u.updated_at, u.created_at
        """
    )
    return pd.DataFrame(rows)


def _build_features(df: pd.DataFrame, now: datetime.datetime) -> pd.DataFrame:
    df = df.copy()
    df["last_active"] = pd.to_datetime(df["last_active"], utc=True)
    df["created_at"] = pd.to_datetime(df["created_at"], utc=True)
    now_utc = pd.Timestamp(now, tz="UTC")

    df["recency_days"] = (now_utc - df["last_active"]).dt.total_seconds() / 86400
    df["account_age_days"] = (now_utc - df["created_at"]).dt.total_seconds() / 86400
    df["frequency"] = (
        df["recipes_viewed"].astype(int)
        + df["meal_plans"].astype(int)
        + df["ai_scans"].astype(int)
        + df["grocery_gens"].astype(int)
    )
    df["engagement"] = (
        df["recipes_viewed"].astype(int) * 1
        + df["meal_plans"].astype(int) * 2
        + df["ai_scans"].astype(int) * 3
        + df["grocery_gens"].astype(int) * 2
    )
    return df


def _cluster_to_risk_map(kmeans: KMeans) -> dict[int, str]:
    """
    Map cluster indices to risk labels by centroid recency_days rank.
    Cluster with highest recency_days → "High" (most likely to churn).
    Works for any k: extra clusters beyond 3 get labelled "Medium".
    """
    centroids = kmeans.cluster_centers_
    recency_idx = FEATURE_COLS.index("recency_days")
    recencies = centroids[:, recency_idx]
    order = np.argsort(recencies)[::-1]
    n = len(order)
    labels = (
        RISK_LABELS
        if n >= len(RISK_LABELS)
        else RISK_LABELS[:n]
    )
    mapping = {}
    for i, cluster_idx in enumerate(order):
        mapping[int(cluster_idx)] = labels[min(i, len(labels) - 1)]
    return mapping


def _select_best_k(X_scaled: np.ndarray) -> tuple[int, dict[int, float]]:
    """
    Try k = K_MIN..min(K_MAX, n_samples//2) and return the k with the
    highest silhouette score along with all scores.
    Falls back to k=2 if only one valid k is available.
    """
    n = X_scaled.shape[0]
    k_upper = min(K_MAX, n // 2)
    if k_upper < K_MIN:
        return K_MIN, {}

    k_scores: dict[int, float] = {}
    for k in range(K_MIN, k_upper + 1):
        km = KMeans(n_clusters=k, n_init=10, random_state=42)
        labels = km.fit_predict(X_scaled)
        if len(set(labels)) < 2:
            continue
        score = float(silhouette_score(X_scaled, labels))
        k_scores[k] = round(score, 4)

    if not k_scores:
        return K_MIN, {}

    best_k = max(k_scores, key=lambda k: k_scores[k])
    return best_k, k_scores


def train() -> dict:
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    df = _load_features()

    if len(df) < MIN_ROWS:
        return {"status": "insufficient_data", "rows": len(df)}

    now = datetime.datetime.utcnow()
    df = _build_features(df, now)

    X = df[FEATURE_COLS].values.astype(float)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    best_k, k_scores = _select_best_k(X_scaled)
    best_silhouette = k_scores.get(best_k)

    kmeans = KMeans(n_clusters=best_k, n_init=10, random_state=42)
    kmeans.fit(X_scaled)

    joblib.dump(kmeans, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)

    meta = {
        "trained_at": now.isoformat(),
        "inertia": round(float(kmeans.inertia_), 2),
        "n_clusters": best_k,
        "best_k": best_k,
        "silhouette_score": round(best_silhouette, 4) if best_silhouette is not None else None,
        "k_scores": k_scores,
        "rows": len(df),
        "cluster_to_risk": _cluster_to_risk_map(kmeans),
    }
    joblib.dump(meta, META_PATH)
    return meta


def _rule_based_label(recency_days: float, frequency: int) -> str:
    """Fallback rule when no trained K-Means model exists."""
    if recency_days > 30 and frequency < 3:
        return "High"
    if recency_days > 14 or frequency < 5:
        return "Medium"
    return "Low"


def predict() -> dict:
    df = _load_features()
    if df.empty:
        return {"insufficient_data": True, "message": "No user data.", "users": []}

    now = datetime.datetime.utcnow()
    df = _build_features(df, now)
    df = df.reset_index(drop=True)

    trained_at = None
    if os.path.exists(META_PATH) and os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
        scaler: StandardScaler = joblib.load(SCALER_PATH)
        meta: dict = joblib.load(META_PATH)
        kmeans: KMeans = joblib.load(MODEL_PATH)
        trained_at = meta.get("trained_at")
        cluster_to_risk: dict = meta.get("cluster_to_risk", {})

        X = df[FEATURE_COLS].values.astype(float)
        X_scaled = scaler.transform(X)
        cluster_ids = kmeans.predict(X_scaled)
        labels = [cluster_to_risk.get(int(c), "Medium") for c in cluster_ids]
    else:
        labels = [
            _rule_based_label(row["recency_days"], int(row["frequency"]))
            for _, row in df.iterrows()
        ]

    results = []
    for idx in range(len(df)):
        row = df.iloc[idx]
        results.append({
            "user_id": int(row["user_id"]),
            "name": row["full_name"] or "Unnamed",
            "email": row["email"],
            "last_active": row["last_active"].isoformat() if pd.notna(row["last_active"]) else None,
            "risk": labels[idx],
            "engagement_score": int(row["engagement"]),
            "recipes_viewed": int(row["recipes_viewed"]),
            "meal_plans": int(row["meal_plans"]),
            "ai_scans": int(row["ai_scans"]),
        })

    high = sum(1 for r in results if r["risk"] == "High")
    medium = sum(1 for r in results if r["risk"] == "Medium")
    low = sum(1 for r in results if r["risk"] == "Low")

    inertia = joblib.load(META_PATH).get("inertia") if os.path.exists(META_PATH) else None

    return {
        "insufficient_data": False,
        "users": results,
        "summary": {"high": high, "medium": medium, "low": low},
        "trained_at": trained_at,
        "inertia": inertia,
    }

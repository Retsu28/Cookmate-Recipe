"""
Traffic Forecaster
Predicts peak usage hours/days via a DOW×hour heatmap and a 7-day
ARIMA(1,1,1) forecast on the daily event count time series.

Heatmap: vectorized groupby pivot (DOW × hour raw counts).
7-day forecast: ARIMA(1,1,1) fitted on the aggregated daily count
series. Falls back to DOW-mean if ARIMA cannot converge or if there
are too few distinct calendar days (< 14).
"""

import logging
import os
import datetime
import warnings
import joblib
import numpy as np
import pandas as pd

from db import query

logger = logging.getLogger("ml_service.traffic")

ARTIFACT_DIR = os.path.join(os.path.dirname(__file__), "..", "artifacts")
META_PATH = os.path.join(ARTIFACT_DIR, "traffic_meta.joblib")
RESULT_PATH = os.path.join(ARTIFACT_DIR, "traffic_result.joblib")

MIN_ROWS = 10
MIN_DAYS_FOR_ARIMA = 14

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def _load_timestamps() -> pd.Series:
    rows = query(
        """
        SELECT viewed_at AS ts FROM recipe_viewed
        UNION ALL
        SELECT created_at AS ts FROM ai_camera_saves
        UNION ALL
        SELECT created_at AS ts FROM meal_plans
        """
    )
    if not rows:
        return pd.Series(dtype="datetime64[ns, UTC]")
    ts = pd.to_datetime([r["ts"] for r in rows], utc=True)
    return pd.Series(ts)


def _build_heatmap(df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
    """Vectorized DOW×hour heatmap. Returns (raw_counts, normalised)."""
    counts = (
        df.groupby(["dow", "hour"])
        .size()
        .reset_index(name="count")
    )
    pivot = counts.pivot(index="dow", columns="hour", values="count").reindex(
        index=range(7), columns=range(24), fill_value=0
    ).fillna(0)
    heatmap = pivot.values.astype(float)
    heatmap_norm = heatmap / heatmap.max() if heatmap.max() > 0 else heatmap.copy()
    return heatmap, heatmap_norm


def _dow_mean_forecast(df: pd.DataFrame, heatmap: np.ndarray, today: datetime.date) -> list[dict]:
    """DOW-mean baseline: mean events per calendar-week per DOW."""
    df = df.copy()
    df["week"] = df["ts"].dt.isocalendar().week.astype(int)
    df["year"] = df["ts"].dt.isocalendar().year.astype(int)
    week_dow_counts = df.groupby(["year", "week", "dow"]).size().reset_index(name="count")
    dow_means = week_dow_counts.groupby("dow")["count"].mean()

    forecast = []
    for i in range(7):
        day = today + datetime.timedelta(days=i)
        dow = day.weekday()
        predicted = round(float(dow_means.get(dow, heatmap[dow].sum())), 1)
        forecast.append({"date": day.isoformat(), "day_name": DAY_NAMES[dow], "predicted_events": predicted})
    return forecast


def _select_arima_order(series: np.ndarray) -> tuple[int, int, int]:
    """
    Grid-search ARIMA orders (p, 1, q) for p, q in {0, 1, 2}.
    Returns the (p, d, q) triple with the lowest AIC.
    Falls back to (1, 1, 1) if all candidates fail.
    """
    from statsmodels.tsa.arima.model import ARIMA as _ARIMA

    best_order = (1, 1, 1)
    best_aic = float("inf")

    for p in range(3):
        for q in range(3):
            if p == 0 and q == 0:
                continue
            try:
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    fit = _ARIMA(series, order=(p, 1, q)).fit()
                if fit.aic < best_aic:
                    best_aic = fit.aic
                    best_order = (p, 1, q)
            except Exception:
                pass

    return best_order


def _arima_forecast(daily_series: pd.Series, today: datetime.date) -> tuple[list[dict], float | None, float | None, tuple]:
    """
    Auto-select ARIMA(p,1,q) order by AIC grid search, then forecast 7 days.
    Returns (seven_day_forecast, aic, bic, best_order).
    Raises on complete failure so caller can fall back to DOW-mean.
    """
    from statsmodels.tsa.arima.model import ARIMA

    series = daily_series.values.astype(float)
    best_order = _select_arima_order(series)

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        result = ARIMA(series, order=best_order).fit()

    forecast_values = result.forecast(steps=7)

    seven_day_forecast = []
    for i in range(7):
        day = today + datetime.timedelta(days=i)
        predicted = max(0.0, round(float(forecast_values[i]), 1))
        seven_day_forecast.append({
            "date": day.isoformat(),
            "day_name": DAY_NAMES[day.weekday()],
            "predicted_events": predicted,
        })

    return seven_day_forecast, float(result.aic), float(result.bic), best_order


def _build_result(ts: pd.Series) -> tuple[dict, dict]:
    """Build the full result + meta dicts from a timestamp series."""
    df = pd.DataFrame({"ts": ts})
    df["hour"] = df["ts"].dt.hour
    df["dow"] = df["ts"].dt.dayofweek

    heatmap, heatmap_norm = _build_heatmap(df)
    peak_dow, peak_hour = np.unravel_index(np.argmax(heatmap), heatmap.shape)

    today = datetime.datetime.utcnow().date()

    # Build daily count series for ARIMA
    df["date"] = df["ts"].dt.normalize()
    daily_counts = df.groupby("date").size()
    # Fill missing dates with 0 to give ARIMA a regular series
    if len(daily_counts) >= MIN_DAYS_FOR_ARIMA:
        date_range = pd.date_range(daily_counts.index.min(), daily_counts.index.max(), freq="D")
        daily_series = daily_counts.reindex(date_range, fill_value=0)
    else:
        daily_series = None

    aic, bic, forecast_method, arima_order = None, None, "dow_mean", None
    if daily_series is not None:
        try:
            seven_day_forecast, aic, bic, arima_order = _arima_forecast(daily_series, today)
            forecast_method = "arima"
        except Exception as exc:
            logger.warning(f"[traffic] ARIMA failed ({exc}), falling back to DOW-mean.")
            seven_day_forecast = _dow_mean_forecast(df, heatmap, today)
    else:
        seven_day_forecast = _dow_mean_forecast(df, heatmap, today)

    result = {
        "heatmap": heatmap_norm.tolist(),
        "heatmap_raw": heatmap.tolist(),
        "peak_hour": int(peak_hour),
        "peak_day": DAY_NAMES[int(peak_dow)],
        "seven_day_forecast": seven_day_forecast,
        "day_names": DAY_NAMES,
    }
    meta_extra = {
        "forecast_method": forecast_method,
        "aic": round(aic, 2) if aic is not None else None,
        "bic": round(bic, 2) if bic is not None else None,
        "arima_order": list(arima_order) if arima_order else None,
        "method": forecast_method,
    }
    return result, meta_extra


def train() -> dict:
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    ts = _load_timestamps()

    if len(ts) < MIN_ROWS:
        return {"status": "insufficient_data", "rows": len(ts)}

    result, meta_extra = _build_result(ts)

    now = datetime.datetime.utcnow()
    meta = {
        "trained_at": now.isoformat(),
        "rows": len(ts),
        **meta_extra,
    }

    joblib.dump(meta, META_PATH)
    joblib.dump(result, RESULT_PATH)
    return meta


def predict() -> dict:
    if not os.path.exists(RESULT_PATH):
        ts = _load_timestamps()
        if ts.empty:
            return {"insufficient_data": True, "message": "No activity data yet.", "heatmap": [], "seven_day_forecast": []}
        if len(ts) < MIN_ROWS:
            return {"insufficient_data": True, "message": f"Need ≥{MIN_ROWS} activity events (have {len(ts)}).", "heatmap": [], "seven_day_forecast": []}
        result, _ = _build_result(ts)
        return {"insufficient_data": False, **result, "trained_at": None}

    meta: dict = joblib.load(META_PATH)
    result: dict = joblib.load(RESULT_PATH)

    return {
        "insufficient_data": False,
        **result,
        "trained_at": meta.get("trained_at"),
    }

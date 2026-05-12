"""
Pytest unit test suite for CookMate ML models.
All tests are isolated — db.query is monkeypatched so no real DB is needed.
Run with:  cd ml_service && pytest tests/ -v
"""

import datetime
import importlib
import sys
import types
from unittest.mock import MagicMock, patch

import numpy as np
import pandas as pd
import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_db_mock(return_value=None):
    """Return a mock for db.query that yields return_value."""
    mock_mod = types.ModuleType("db")
    mock_mod.query = MagicMock(return_value=return_value or [])
    return mock_mod


# ---------------------------------------------------------------------------
# trend model
# ---------------------------------------------------------------------------

class TestTrendHelpers:
    def test_r2_perfect_fit(self):
        from models.trend import _r2
        y = np.array([1.0, 2.0, 3.0])
        assert _r2(y, y) == pytest.approx(1.0)

    def test_r2_zero_variance(self):
        from models.trend import _r2
        y = np.array([5.0, 5.0, 5.0])
        assert _r2(y, y) == pytest.approx(1.0)

    def test_r2_bad_fit(self):
        from models.trend import _r2
        y_true = np.array([1.0, 2.0, 3.0])
        y_pred = np.array([3.0, 2.0, 1.0])
        assert _r2(y_true, y_pred) < 0.0

    def test_durbin_watson_no_autocorr(self):
        from models.trend import _durbin_watson
        residuals = np.array([1.0, -1.0, 1.0, -1.0, 1.0])
        dw = _durbin_watson(residuals)
        assert dw > 1.5, "Alternating residuals should give DW > 1.5"

    def test_durbin_watson_positive_autocorr(self):
        from models.trend import _durbin_watson
        residuals = np.array([1.0, 1.5, 2.0, 2.5, 3.0])
        dw = _durbin_watson(residuals)
        assert dw < 1.5, "Monotone increasing residuals indicate positive autocorrelation"

    def test_durbin_watson_short_series(self):
        from models.trend import _durbin_watson
        assert _durbin_watson(np.array([1.0])) == pytest.approx(2.0)

    def test_fit_recipe_known_slope(self):
        from models.trend import _fit_recipe
        wn = np.array([0.0, 1.0, 2.0, 3.0, 4.0])
        vc = np.array([10.0, 12.0, 14.0, 16.0, 18.0])
        fit = _fit_recipe(wn, vc)
        assert fit["method"] in ("linear", "holt")
        assert fit["predicted_next"] > 0

    def test_fit_recipe_single_week_fallback(self):
        from models.trend import _fit_recipe
        wn = np.array([0.0])
        vc = np.array([5.0])
        fit = _fit_recipe(wn, vc)
        assert fit["method"] == "mean"
        assert fit["predicted_next"] == pytest.approx(5.0)

    def test_fit_recipe_zero_length_no_crash(self):
        from models.trend import _fit_recipe
        wn = np.array([], dtype=float)
        vc = np.array([], dtype=float)
        fit = _fit_recipe(wn, vc)
        assert fit["method"] == "mean"
        assert fit["max_week_num"] == 0

    def test_fit_recipe_r2_range(self):
        from models.trend import _fit_recipe
        wn = np.arange(6, dtype=float)
        vc = wn * 3 + 1
        fit = _fit_recipe(wn, vc)
        assert 0.0 <= fit["r2"] <= 1.0


# ---------------------------------------------------------------------------
# churn model
# ---------------------------------------------------------------------------

class TestChurnHelpers:
    def test_rule_based_label_high(self):
        from models.churn import _rule_based_label
        assert _rule_based_label(35.0, 1) == "High"

    def test_rule_based_label_medium_inactivity(self):
        from models.churn import _rule_based_label
        assert _rule_based_label(20.0, 10) == "Medium"

    def test_rule_based_label_medium_low_freq(self):
        from models.churn import _rule_based_label
        assert _rule_based_label(5.0, 2) == "Medium"

    def test_rule_based_label_low(self):
        from models.churn import _rule_based_label
        assert _rule_based_label(3.0, 10) == "Low"

    def test_cluster_to_risk_map_ordering(self):
        from models.churn import _cluster_to_risk_map, FEATURE_COLS
        from sklearn.cluster import KMeans
        import numpy as np

        X = np.array([
            [0.0, 10.0, 20.0, 100.0],
            [50.0, 1.0, 2.0, 200.0],
            [25.0, 5.0, 10.0, 150.0],
        ])
        km = KMeans(n_clusters=3, n_init=5, random_state=0)
        km.fit(X)
        mapping = _cluster_to_risk_map(km)
        assert set(mapping.values()) <= {"High", "Medium", "Low"}
        recency_idx = FEATURE_COLS.index("recency_days")
        high_cluster = [k for k, v in mapping.items() if v == "High"][0]
        low_cluster = [k for k, v in mapping.items() if v == "Low"][0]
        assert (
            km.cluster_centers_[high_cluster][recency_idx]
            >= km.cluster_centers_[low_cluster][recency_idx]
        )

    def test_select_best_k_returns_valid_k(self):
        from models.churn import _select_best_k
        rng = np.random.default_rng(42)
        X = rng.standard_normal((30, 4))
        best_k, k_scores = _select_best_k(X)
        assert 2 <= best_k <= 5
        assert best_k in k_scores

    def test_select_best_k_too_few_samples(self):
        from models.churn import _select_best_k
        X = np.array([[1.0, 2.0, 3.0, 4.0], [5.0, 6.0, 7.0, 8.0]])
        best_k, k_scores = _select_best_k(X)
        assert best_k >= 2


# ---------------------------------------------------------------------------
# gaps model
# ---------------------------------------------------------------------------

class TestGapsHelpers:
    def _make_recipe_ingredients(self):
        return [("chicken", 5), ("beef", 3), ("garlic", 10), ("onion", 8)]

    def test_gap_score_formula_zero_recipes(self):
        from models.gaps import _build_tfidf_matcher, _build_gaps
        freq = {"unknownxyz": 4}
        ri = self._make_recipe_ingredients()
        vec, mat, ri2 = _build_tfidf_matcher(ri)
        gaps = _build_gaps(freq, ri2, vec, mat)
        assert len(gaps) == 1
        assert gaps[0]["gap_score"] == pytest.approx(4.0 / 1.0, rel=0.05)

    def test_gap_score_sorting(self):
        from models.gaps import _build_tfidf_matcher, _build_gaps
        freq = {"unknownxyz": 10, "anotherunknown999": 5}
        ri = self._make_recipe_ingredients()
        vec, mat, ri2 = _build_tfidf_matcher(ri)
        gaps = _build_gaps(freq, ri2, vec, mat)
        assert gaps[0]["gap_score"] >= gaps[1]["gap_score"]

    def test_exact_match_not_a_gap(self):
        from models.gaps import _similarity_match_count, _build_tfidf_matcher
        ri = [("chicken", 5), ("beef", 3)]
        vec, mat, ri2 = _build_tfidf_matcher(ri)
        count = _similarity_match_count("chicken", vec, mat, ri2)
        assert count >= 1

    def test_fuzzy_match_catches_partial(self):
        from models.gaps import _similarity_match_count, _build_tfidf_matcher
        ri = [("chicken breast", 3), ("boneless chicken", 2), ("beef", 1)]
        vec, mat, ri2 = _build_tfidf_matcher(ri)
        count = _similarity_match_count("chicken", vec, mat, ri2)
        assert count >= 1, "TF-IDF should find at least one fuzzy match for 'chicken'"

    def test_no_vectorizer_falls_back_to_exact(self):
        from models.gaps import _similarity_match_count
        ri = [("chicken", 5)]
        count = _similarity_match_count("chicken", None, None, ri)
        assert count == 1
        count_miss = _similarity_match_count("pork", None, None, ri)
        assert count_miss == 0


# ---------------------------------------------------------------------------
# traffic model
# ---------------------------------------------------------------------------

class TestTrafficHelpers:
    def _make_ts(self, n_days=20, events_per_day=10):
        base = pd.Timestamp("2025-01-01", tz="UTC")
        timestamps = []
        for d in range(n_days):
            for h in range(events_per_day):
                timestamps.append(base + pd.Timedelta(days=d, hours=h % 24))
        return pd.Series(timestamps)

    def test_heatmap_shape(self):
        from models.traffic import _build_heatmap
        ts = self._make_ts()
        df = pd.DataFrame({"ts": ts})
        df["hour"] = df["ts"].dt.hour
        df["dow"] = df["ts"].dt.dayofweek
        heatmap, heatmap_norm = _build_heatmap(df)
        assert heatmap.shape == (7, 24)
        assert heatmap_norm.shape == (7, 24)
        assert heatmap_norm.max() == pytest.approx(1.0)

    def test_dow_mean_forecast_length(self):
        from models.traffic import _dow_mean_forecast, _build_heatmap
        ts = self._make_ts(n_days=30)
        df = pd.DataFrame({"ts": ts})
        df["hour"] = df["ts"].dt.hour
        df["dow"] = df["ts"].dt.dayofweek
        heatmap, _ = _build_heatmap(df)
        today = datetime.date(2025, 2, 1)
        forecast = _dow_mean_forecast(df, heatmap, today)
        assert len(forecast) == 7
        for entry in forecast:
            assert "date" in entry
            assert "predicted_events" in entry
            assert entry["predicted_events"] >= 0

    def test_arima_forecast_length(self):
        from models.traffic import _arima_forecast
        rng = np.random.default_rng(0)
        daily = pd.Series(rng.integers(5, 20, size=30).astype(float))
        today = datetime.date(2025, 2, 1)
        forecast, aic, bic = _arima_forecast(daily, today)
        assert len(forecast) == 7
        assert aic is not None
        assert bic is not None
        for entry in forecast:
            assert entry["predicted_events"] >= 0

    def test_build_result_keys(self):
        from models.traffic import _build_result
        ts = self._make_ts(n_days=60)
        result, meta_extra = _build_result(ts)
        for key in ("heatmap", "heatmap_raw", "peak_hour", "peak_day", "seven_day_forecast", "day_names"):
            assert key in result
        assert len(result["seven_day_forecast"]) == 7
        assert 0 <= result["peak_hour"] <= 23

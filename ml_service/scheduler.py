import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from models import trend, churn, gaps, traffic, drift

logger = logging.getLogger("ml_scheduler")


def retrain_all():
    logger.info("[scheduler] Starting nightly retrain...")
    for name, fn in [
        ("Trend Forecaster", trend.train),
        ("Churn Risk", churn.train),
        ("Ingredient Gaps", gaps.train),
        ("Traffic Forecaster", traffic.train),
    ]:
        try:
            result = fn()
            logger.info(f"[scheduler] {name}: {result}")
        except Exception as exc:
            logger.error(f"[scheduler] {name} failed: {exc}")
    logger.info("[scheduler] Nightly retrain complete.")


def run_drift_check():
    logger.info("[scheduler] Running drift check...")
    try:
        report = drift.compute_drift_report()
        if report.get("any_drifted"):
            logger.warning("[scheduler] Drift detected — consider triggering retrain.")
        else:
            logger.info("[scheduler] No significant drift detected.")
    except Exception as exc:
        logger.error(f"[scheduler] Drift check failed: {exc}")


_scheduler: BackgroundScheduler | None = None


def start_scheduler() -> BackgroundScheduler:
    global _scheduler
    _scheduler = BackgroundScheduler()
    _scheduler.add_job(retrain_all,      CronTrigger(hour=2, minute=0))
    _scheduler.add_job(run_drift_check,  CronTrigger(hour=2, minute=30))
    _scheduler.start()
    logger.info("[scheduler] APScheduler started — retrain 02:00 UTC, drift check 02:30 UTC.")
    return _scheduler

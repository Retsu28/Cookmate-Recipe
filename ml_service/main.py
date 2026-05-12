import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from models import trend, churn, gaps, traffic
from routers.ml_router import router as ml_router
from scheduler import start_scheduler

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("ml_service")

_origins_raw = os.getenv("EXPRESS_ORIGIN", "http://localhost:5000")
EXPRESS_ORIGINS = [o.strip() for o in _origins_raw.split(",") if o.strip()]

app = FastAPI(title="CookMate ML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=EXPRESS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(ml_router)


@app.on_event("startup")
async def on_startup():
    logger.info("[startup] Training all models on first boot...")
    for name, fn in [
        ("Trend Forecaster", trend.train),
        ("Churn Risk", churn.train),
        ("Ingredient Gaps", gaps.train),
        ("Traffic Forecaster", traffic.train),
    ]:
        try:
            result = fn()
            logger.info(f"[startup] {name}: {result}")
        except Exception as exc:
            logger.warning(f"[startup] {name} skipped: {exc}")

    start_scheduler()
    logger.info("[startup] ML service ready.")


@app.get("/health")
def health():
    return {"status": "ok", "service": "CookMate ML"}

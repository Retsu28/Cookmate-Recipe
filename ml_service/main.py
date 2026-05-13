import logging
import os
import secrets

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Security, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security.api_key import APIKeyHeader

load_dotenv()

from models import trend, churn, gaps, traffic
from routers.ml_router import router as ml_router
from scheduler import start_scheduler

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("ml_service")

_origins_raw = os.getenv("EXPRESS_ORIGIN", "http://localhost:5000")
EXPRESS_ORIGINS = [o.strip() for o in _origins_raw.split(",") if o.strip()]

# ─── API Key auth ────────────────────────────────────────────────────────────
_ML_API_KEY = os.getenv("ML_API_KEY", "")
_api_key_header = APIKeyHeader(name="X-ML-API-Key", auto_error=False)


def require_api_key(key: str = Security(_api_key_header)):
    if not _ML_API_KEY:
        return  # key not configured — allow all (dev mode)
    if not key or not secrets.compare_digest(key, _ML_API_KEY):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing ML API key.")


app = FastAPI(
    title="CookMate ML Service",
    version="1.0.0",
    dependencies=[Depends(require_api_key)],
)

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


@app.get("/health", dependencies=[])
def health():
    return {"status": "ok", "service": "CookMate ML"}

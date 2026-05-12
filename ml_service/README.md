# CookMate ML Service

FastAPI microservice providing ML-powered analytics for the CookMate admin panel.

## Setup

1. **Copy env file:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` to match your PostgreSQL credentials (same as `api/.env`).

2. **Create a virtual environment:**
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # macOS/Linux:
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the service:**
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8001 --reload
   ```

The service will be available at `http://localhost:8001`.  
On first startup it trains all models automatically from live PostgreSQL data.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/ml/trending-forecast` | Top 5 recipes predicted to trend next week |
| GET | `/ml/churn-risk` | All users scored by churn risk (High/Medium/Low) |
| GET | `/ml/ingredient-gaps` | Ingredients scanned via AI Camera with zero recipe matches |
| GET | `/ml/traffic-forecast` | Hourly×daily heatmap + 7-day traffic forecast |
| GET | `/ml/model-status` | Last trained timestamp + accuracy per model |
| GET | `/health` | Health check |

## Notes

- Models retrain nightly at **02:00 UTC** via APScheduler.
- Trained model artifacts are saved to `artifacts/` (git-ignored).
- If a model has fewer than 50 data points, it returns `{ "insufficient_data": true }` gracefully.
- The service only accepts requests from `EXPRESS_ORIGIN` (default: `http://localhost:5000`).
- All admin routes go through the Express proxy — the frontend never calls this service directly.

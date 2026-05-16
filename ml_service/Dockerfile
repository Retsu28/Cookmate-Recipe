# ─── CookMate ML Service — Production Dockerfile ──────────────────────────────

FROM python:3.11-slim AS runner
WORKDIR /app

# Install system dependencies for ML libraries
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# Security: run as non-root user
RUN useradd -m -r cookmate && chown -R cookmate:cookmate /app
USER cookmate

# Create artifacts directory for trained models
RUN mkdir -p artifacts

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/health')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]

# ─────────────────────────────────────────────────────────────────
# AI Service Dockerfile
# Place at: backend/ai-service/Dockerfile
# ─────────────────────────────────────────────────────────────────

# ── Stage 1: Install Python dependencies ─────────────────────────
FROM python:3.11-slim AS builder
WORKDIR /app

# Install build tools needed for some packages (pandas, numpy etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip first
RUN pip install --upgrade pip

# Copy requirements and install into /install prefix (isolated)
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2: Final runtime image ─────────────────────────────────
FROM python:3.11-slim AS runner
WORKDIR /app

# Security: non-root user
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application source
COPY . .

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/docs')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
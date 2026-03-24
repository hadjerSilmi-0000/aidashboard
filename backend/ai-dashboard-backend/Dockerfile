# ─────────────────────────────────────────────────────────────────
# Backend Dockerfile
# Place at: backend/ai-dashboard-backend/Dockerfile
# ─────────────────────────────────────────────────────────────────

# ── Stage 1: Install dependencies ────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

# Copy only package files first (better layer caching)
COPY package.json package-lock.json ./

# Install production deps only
RUN npm ci --omit=dev

# ── Stage 2: Final runtime image ─────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

# Security: run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

# Create required directories and set ownership
RUN mkdir -p uploads logs && \
    chown -R appuser:appgroup /app

USER appuser

EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
    CMD wget --quiet --tries=1 --spider http://localhost:5000/health || exit 1

CMD ["node", "src/server.js"]
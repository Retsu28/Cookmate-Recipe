# ─── CookMate API — Production Dockerfile ─────────────────────────────────────
# Multi-stage build for minimal production image size (~180MB)

# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Stage 2: Production image
FROM node:20-alpine AS runner
WORKDIR /app

# Security: run as non-root user
RUN addgroup -g 1001 -S cookmate && \
    adduser -S cookmate -u 1001 -G cookmate

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

# Copy application source
COPY src/ ./src/

# Create uploads directory with proper permissions
RUN mkdir -p uploads/avatars && chown -R cookmate:cookmate uploads

# Switch to non-root user
USER cookmate

# Expose API port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Start the API
CMD ["node", "src/server.js"]

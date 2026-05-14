FROM node:20-alpine AS builder
WORKDIR /app

# Cài dependencies
COPY package*.json ./
RUN npm ci

# Copy toàn bộ source
COPY . .

# Build frontend (React/Vite)
RUN npm run build

# --- Production stage ---
FROM node:20-alpine AS runner
WORKDIR /app

# Chỉ cài production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Cài tsx để chạy TypeScript trực tiếp
RUN npm install -g tsx

# Copy build artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/api ./api

# Security: chạy với non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["tsx", "server.ts"]

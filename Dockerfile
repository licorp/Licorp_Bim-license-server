FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY package.json ./

# Cài tất cả dependencies (bỏ package-lock.json để tránh lỗi Windows-specific packages)
# npm install sẽ tự resolve đúng platform (linux/x64)
RUN npm install --ignore-scripts

# Copy toàn bộ source
COPY . .

# Build frontend (React/Vite)
RUN npm run build

# --- Production stage ---
FROM node:20-alpine AS runner
WORKDIR /app

# Cài tsx globally
RUN npm install -g tsx

# Chỉ copy và cài production dependencies
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts

# Copy build artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/api ./api

EXPOSE 3000
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["tsx", "server.ts"]

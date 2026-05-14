FROM node:20-alpine AS builder
WORKDIR /app

# Copy package.json only (NOT package-lock.json which has Windows-specific resolutions)
COPY package.json ./

# Install all dependencies - npm will resolve correct Linux platform packages
RUN npm install

# Copy full source code
COPY . .

# Build frontend (React/Vite)
RUN npm run build

# --- Production stage ---
FROM node:20-alpine AS runner
WORKDIR /app

# Install tsx globally to run TypeScript
RUN npm install -g tsx

# Copy package.json and install only production deps
COPY package.json ./
RUN npm install --omit=dev

# Copy build output and server files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/api ./api

EXPOSE 3000
ENV NODE_ENV=production

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["tsx", "server.ts"]

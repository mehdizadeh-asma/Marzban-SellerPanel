# Stage 1: Dependencies (برای کش بهتر)
FROM node:20-slim AS deps
WORKDIR /app

COPY package*.json ./

RUN npm ci

# Stage 2: Build
FROM node:20-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Stage 3: Production runtime
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./

RUN npm ci --omit=dev

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["npm", "start"]

# Stage 1: Dependencies
FROM node:alpine AS deps

WORKDIR /app

COPY package*.json ./

RUN npm ci

# Stage 2: Build
FROM node:alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Stage 3: Runtime
FROM node:alpine AS runner

WORKDIR /backend

COPY package*.json ./

RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV NODE_OPTIONS="--tls-min-v1.2 --max-old-space-size=8192"
CMD ["npm", "start"]
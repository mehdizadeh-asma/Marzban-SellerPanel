FROM node:22-alpine AS base
WORKDIR /backend
ENV NODE_ENV=production
ENV NODE_OPTIONS="--tls-min-v1.2 --max-old-space-size=8192"
RUN apk add --no-cache ca-certificates

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /backend
COPY --from=deps /backend/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS prod-deps
WORKDIR /backend
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base AS runner
WORKDIR /backend

RUN addgroup -S app && adduser -S app -G app

COPY --from=prod-deps /backend/node_modules ./node_modules
COPY --from=builder   /backend/dist        ./dist

USER app
EXPOSE 8080 8443

CMD ["node", "dist/app.js"]

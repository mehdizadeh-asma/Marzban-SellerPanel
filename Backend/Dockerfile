FROM node:22-slim AS base
WORKDIR /backend

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS prod-deps
WORKDIR /backend
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base AS runner
WORKDIR /backend
ENV NODE_ENV=production
ENV NODE_OPTIONS="--tls-min-v1.2 --max-old-space-size=4096"

RUN useradd -m -u 1001 app \
  && chown -R app:app /backend

USER app

COPY --from=prod-deps /backend/node_modules ./node_modules
COPY dist ./dist
COPY package.json ./

EXPOSE 8080 8443
CMD ["node", "dist/app.js"]

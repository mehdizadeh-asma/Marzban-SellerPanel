FROM node:22-slim AS base
WORKDIR /frontend
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder
ENV NODE_ENV=production
COPY . .
RUN npm run build

FROM base AS prod-deps
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /frontend

RUN useradd -m -u 1001 nextjs \
  && chown -R nextjs:nextjs /frontend

USER nextjs

COPY --from=builder   /frontend/.next   ./.next
COPY --from=builder   /frontend/public ./public
COPY --from=prod-deps /frontend/node_modules ./node_modules
COPY package.json ./

EXPOSE 3000

CMD ["npm", "start"]

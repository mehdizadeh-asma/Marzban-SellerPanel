FROM node:24-slim AS base
WORKDIR /frontend
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS prod-deps
WORKDIR /frontend
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base AS runner
WORKDIR /frontend
ENV NODE_ENV=production

RUN useradd -m -u 1001 nextjs \
  && chown -R nextjs:nextjs /frontend

USER nextjs

COPY --from=prod-deps /frontend/node_modules ./node_modules
COPY .next ./.next
COPY public ./public
COPY package.json ./

EXPOSE 3000
CMD ["npm", "start"]

FROM node:alpine AS deps
WORKDIR /app

COPY package*.json ./

RUN npm install

FROM node:alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

FROM node:alpine AS runner
WORKDIR /backend

ENV NODE_ENV=production
ENV NODE_OPTIONS="--tls-min-v1.2 --max-old-space-size=8192"

RUN apk add --no-cache ca-certificates

COPY package*.json ./

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

RUN npm prune --production || npm install --omit=dev

CMD ["npm", "start"]
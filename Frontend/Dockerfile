FROM node:slim AS deps
WORKDIR /app

COPY package*.json ./
RUN npm install

FROM node:slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

COPY --from=builder /app/node_modules ./node_modules
RUN npm prune --production || npm install --omit=dev

EXPOSE 3000
CMD ["npm", "start"]

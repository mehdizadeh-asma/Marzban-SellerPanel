FROM node:slim AS deps
WORKDIR /frontend

COPY package*.json ./
RUN npm install

FROM node:slim AS builder
WORKDIR /frontend

COPY --from=deps /frontend/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:slim AS runner
WORKDIR /frontend
ENV NODE_ENV=production

COPY package*.json ./

COPY --from=builder /frontend/.next ./.next
COPY --from=builder /frontend/public ./public

COPY --from=builder /frontend/node_modules ./node_modules
RUN npm prune --production || npm install --omit=dev

EXPOSE 3000
CMD ["npm", "start"]

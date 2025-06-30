# Stage 1: install dependencies & build
FROM node:22-alpine AS builder

# به‌روزرسانی امنیتی و نصب بسته‌های ضروری
RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache ca-certificates openssl && \
    update-ca-certificates

WORKDIR /app
COPY . .

ENV NODE_OPTIONS="--tls-min-v1.2 --max-old-space-size=8192"

# نصب وابستگی‌ها و ساخت برنامه
RUN npm install && npm run build

# Stage 2: اجرای نهایی
FROM node:22-alpine

# به‌روزرسانی امنیتی در مرحله اجرا
RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache ca-certificates openssl && \
    update-ca-certificates

WORKDIR /backend

# کپی فایل‌های لازم از مرحله builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# نصب فقط وابستگی‌های production
RUN npm install --omit=dev

# تنظیمات نهایی
ENV NODE_OPTIONS="--tls-min-v1.2 --max-old-space-size=8192"
CMD ["npm", "start"]
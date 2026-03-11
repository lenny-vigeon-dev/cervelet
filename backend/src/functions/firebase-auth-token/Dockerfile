FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY index.ts ./

RUN pnpm run build

# Production stage
FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/dist ./dist

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "node_modules/@google-cloud/functions-framework/build/src/main.js", "--target=createFirebaseToken", "--port=8080"]

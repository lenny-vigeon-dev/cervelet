# Multi-stage build for Next.js with pnpm
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.20.0 --activate
WORKDIR /app

# Install deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build Next.js
RUN pnpm build

# Production image
FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Install only prod deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --prod --frozen-lockfile

# Copy built assets and required project files
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.* /app/
COPY --from=builder /app/package.json /app/pnpm-lock.yaml* /app/

EXPOSE 8080
CMD ["pnpm", "start"]

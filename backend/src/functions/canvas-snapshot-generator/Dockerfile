# Use Node.js 22 slim image
FROM node:22-slim

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies (Sharp has pre-built binaries, no native compilation needed)
RUN pnpm install

# Copy TypeScript config and source code
COPY tsconfig*.json ./
COPY src ./src

# Build the TypeScript application
RUN pnpm run build

# Set environment to production
ENV NODE_ENV=production

# Cloud Run sets PORT automatically, default to 8080
ENV PORT=8080
EXPOSE 8080

# Start the application
CMD ["node", "dist/src/main.js"]

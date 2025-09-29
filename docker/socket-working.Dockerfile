# Working Socket Service Dockerfile
FROM node:22-alpine

# Install dependencies
RUN apk add --no-cache libc6-compat

# Set working directory
WORKDIR /app

# Enable pnpm
RUN corepack enable pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY apps/socket/package.json ./apps/socket/

# Install ALL dependencies (including dev dependencies for runtime)
RUN pnpm install --frozen-lockfile

# Copy all source files and build
COPY . .

# Build the application
RUN pnpm build --filter=@repo/types
RUN pnpm build --filter=socket

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 socket

# Change ownership of the app directory
RUN chown -R socket:nodejs /app

# Switch to non-root user
USER socket

# Expose port
EXPOSE 4001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4001

# Keep working directory at root level where node_modules are
WORKDIR /app

# Start the application
CMD ["node", "apps/socket/dist/index.js"]

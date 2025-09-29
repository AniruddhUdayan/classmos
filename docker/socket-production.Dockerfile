# Production Socket Service Dockerfile
FROM node:22-alpine

# Install dependencies
RUN apk add --no-cache libc6-compat

# Set working directory
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 socket

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY apps/socket/package.json ./apps/socket/

# Install only production dependencies
RUN corepack enable pnpm
RUN pnpm install --prod --frozen-lockfile

# Copy pre-built application files
COPY --chown=socket:nodejs packages/types/dist ./packages/types/dist
COPY --chown=socket:nodejs apps/socket/dist ./apps/socket/dist

# Switch to non-root user
USER socket

# Expose port
EXPOSE 4001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4001

# Keep working directory at root level where node_modules are
WORKDIR /app

# Start the application from the Socket app directory
CMD ["node", "apps/socket/dist/index.js"]

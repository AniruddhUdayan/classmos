# Multi-stage Dockerfile for Socket.io service
# Supports proper environment variables, health checks, and security best practices

FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies for health checks
RUN apk add --no-cache curl

# Enable corepack and set pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# --- deps layer: install root deps and workspace deps
FROM base AS deps
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./
COPY packages ./packages
COPY apps/socket/package.json ./apps/socket/package.json
RUN pnpm install --frozen-lockfile --prod=false

# --- build layer: build the Socket service
FROM deps AS build
COPY apps/socket ./apps/socket
# Build internal packages needed by the app without root turbo
WORKDIR /app/packages/types
RUN pnpm build
WORKDIR /app/apps/socket
RUN pnpm build

# --- runtime layer
FROM node:20-alpine AS runtime
WORKDIR /app/apps/socket

# Install curl for health checks
RUN apk add --no-cache curl

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set production environment
ENV NODE_ENV=production

# Copy compiled code
COPY --from=build --chown=nodejs:nodejs /app/apps/socket/dist ./dist
COPY --chown=nodejs:nodejs apps/socket/package.json ./package.json

# Copy workspace dependencies
COPY --from=deps --chown=nodejs:nodejs /app/node_modules /app/node_modules
COPY --from=deps --chown=nodejs:nodejs /app/packages /app/packages

# Create symlink to node_modules for proper resolution
RUN ln -s /app/node_modules ./node_modules && \
    chown -h nodejs:nodejs ./node_modules

# Switch to non-root user
USER nodejs

# Default port (can be overridden with environment variable)
ENV PORT=4001
EXPOSE 4001

# Health check - Socket.io health endpoint
# Note: This assumes a basic HTTP endpoint. If you don't have one, you may need to add it
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || curl -f http://localhost:${PORT}/ || exit 1

# Start the application
CMD ["node", "dist/index.js"]

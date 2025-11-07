# Multi-stage Dockerfile for Next.js Web service
# Supports proper environment variables, health checks, and security best practices

FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies for health checks
RUN apk add --no-cache curl

# Enable corepack and set pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# --- deps layer: install dependencies for workspace
FROM base AS deps
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./
COPY packages ./packages
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --frozen-lockfile --prod=false

# --- build layer: build Next.js app (standalone)
FROM deps AS build
COPY apps/web ./apps/web

# Build internal packages needed by the app without root turbo
WORKDIR /app/packages/types
RUN pnpm build

# Build the Next.js app with standalone output
WORKDIR /app/apps/web

# Build arguments for Next.js environment variables
# These are baked into the build and cannot be changed at runtime
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SOCKET_URL
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

# Set build-time environment variables
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_SOCKET_URL=${NEXT_PUBLIC_SOCKET_URL}
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}

RUN pnpm build

# --- runtime layer: Production runtime using Next standalone output
FROM node:20-alpine AS runtime
WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set production environment
ENV NODE_ENV=production

# Copy standalone output with proper ownership
COPY --from=build --chown=nodejs:nodejs /app/apps/web/.next/standalone ./
COPY --from=build --chown=nodejs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nodejs:nodejs /app/apps/web/public ./apps/web/public

# Switch to non-root user
USER nodejs

# Default port (can be overridden with environment variable)
ENV PORT=3000
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:${PORT}/api/health || curl -f http://localhost:${PORT}/ || exit 1

# Start the Next.js server
CMD ["node", "apps/web/server.js"]

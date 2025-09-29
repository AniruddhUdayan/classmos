# Production API Service Dockerfile
FROM node:22-alpine

# Install dependencies
RUN apk add --no-cache libc6-compat

# Set working directory
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 api

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY apps/api/package.json ./apps/api/

# Install only production dependencies
RUN corepack enable pnpm
RUN pnpm install --prod --frozen-lockfile

# Copy pre-built application files
COPY --chown=api:nodejs packages/types/dist ./packages/types/dist
COPY --chown=api:nodejs apps/api/dist ./apps/api/dist

# Switch to non-root user
USER api

# Expose port
EXPOSE 4000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4000

# Keep working directory at root level where node_modules are
WORKDIR /app

# Start the application from the API app directory
CMD ["node", "apps/api/dist/index.js"]

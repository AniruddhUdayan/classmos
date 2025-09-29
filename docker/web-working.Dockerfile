# Working Web Service Dockerfile
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
COPY packages/ui/package.json ./packages/ui/
COPY apps/web/package.json ./apps/web/

# Install ALL dependencies (including dev dependencies for runtime)
RUN pnpm install --frozen-lockfile

# Copy all source files and build
COPY . .

# Build the application
RUN pnpm build --filter=@repo/types
RUN pnpm build --filter=@repo/ui
RUN pnpm build --filter=web

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Change ownership of the app directory
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Set working directory to Web app
WORKDIR /app/apps/web

# Start the application
CMD ["npm", "start"]

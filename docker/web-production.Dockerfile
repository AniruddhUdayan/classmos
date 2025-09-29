# Production Web Service Dockerfile
FROM node:22-alpine

# Install dependencies
RUN apk add --no-cache libc6-compat

# Set working directory
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/ui/package.json ./packages/ui/
COPY apps/web/package.json ./apps/web/

# Install only production dependencies
RUN corepack enable pnpm
RUN pnpm install --prod --frozen-lockfile

# Copy pre-built application files
COPY --chown=nextjs:nodejs packages/types/dist ./packages/types/dist
COPY --chown=nextjs:nodejs packages/ui/src ./packages/ui/src
COPY --chown=nextjs:nodejs apps/web/.next ./apps/web/.next
COPY --chown=nextjs:nodejs apps/web/public ./apps/web/public

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

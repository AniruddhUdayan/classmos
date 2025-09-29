# Socket Service Dockerfile
FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./
COPY packages/types/package.json ./packages/types/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY apps/socket/package.json ./apps/socket/

# Enable pnpm and install dependencies
RUN corepack enable pnpm
RUN pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Enable pnpm and build the packages
RUN corepack enable pnpm
RUN pnpm build --filter=@repo/types
RUN pnpm build --filter=socket

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 socket

# Copy the built application
COPY --from=builder --chown=socket:nodejs /app/apps/socket/dist ./apps/socket/dist
COPY --from=builder --chown=socket:nodejs /app/packages/types/dist ./packages/types/dist
COPY --from=builder --chown=socket:nodejs /app/node_modules ./node_modules

# Copy package.json files for runtime
COPY --from=builder --chown=socket:nodejs /app/apps/socket/package.json ./apps/socket/
COPY --from=builder --chown=socket:nodejs /app/packages/types/package.json ./packages/types/

USER socket

EXPOSE 4001

ENV PORT=4001

WORKDIR /app/apps/socket

CMD ["node", "dist/index.js"]

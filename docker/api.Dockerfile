# API Service Dockerfile
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
COPY apps/api/package.json ./apps/api/

# Copy TypeScript config files
COPY packages/typescript-config/base.json ./packages/typescript-config/
COPY packages/typescript-config/nextjs.json ./packages/typescript-config/
COPY packages/typescript-config/react-library.json ./packages/typescript-config/
COPY packages/types/tsconfig.json ./packages/types/
COPY apps/api/tsconfig.json ./apps/api/

# Copy source files for types package
COPY packages/types/src ./packages/types/src/

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
RUN pnpm build --filter=api

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 api

# Copy the built application
COPY --from=builder --chown=api:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=api:nodejs /app/packages/types/dist ./packages/types/dist
COPY --from=builder --chown=api:nodejs /app/node_modules ./node_modules

# Copy package.json files for runtime
COPY --from=builder --chown=api:nodejs /app/apps/api/package.json ./apps/api/
COPY --from=builder --chown=api:nodejs /app/packages/types/package.json ./packages/types/

USER api

EXPOSE 4000

ENV PORT=4000

WORKDIR /app/apps/api

CMD ["node", "dist/index.js"]

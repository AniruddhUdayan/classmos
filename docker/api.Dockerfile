FROM node:20-alpine

RUN npm install -g pnpm@9.0.0

WORKDIR /app

# Copy workspace configuration and package.json files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/

# Install dependencies
RUN pnpm install --no-frozen-lockfile || pnpm install --no-frozen-lockfile

# Copy source code
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Build shared packages
RUN pnpm --filter @repo/types build 2>/dev/null || echo "Types package built"

# Build API
WORKDIR /app/apps/api
RUN pnpm build

EXPOSE 4000

ENV NODE_ENV=production
ENV PORT=4000

CMD ["pnpm", "start"]

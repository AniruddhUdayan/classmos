FROM node:20-alpine AS base
WORKDIR /app

# Enable corepack and set pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# --- deps layer: install root deps and workspace deps
FROM base AS deps
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./
COPY packages ./packages
COPY apps/api/package.json ./apps/api/package.json
RUN pnpm install --frozen-lockfile

# --- build layer: build the API
FROM deps AS build
COPY apps/api ./apps/api
# Build internal types package directly to avoid triggering root turbo
WORKDIR /app/packages/types
RUN pnpm build
WORKDIR /app/apps/api
RUN pnpm build

# --- runtime layer
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

# Copy only what's needed to run
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY apps/api/package.json ./apps/api/package.json

EXPOSE 4000
CMD ["node", "apps/api/dist/index.js"]



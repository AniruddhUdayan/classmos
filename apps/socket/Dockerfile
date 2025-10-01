FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

FROM base AS deps
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./
COPY packages ./packages
COPY apps/socket/package.json ./apps/socket/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY apps/socket ./apps/socket
# Build internal packages needed by the app without root turbo
WORKDIR /app/packages/types
RUN pnpm build
WORKDIR /app/apps/socket
RUN pnpm build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4001

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=build /app/apps/socket/dist ./apps/socket/dist
COPY apps/socket/package.json ./apps/socket/package.json

EXPOSE 4001
CMD ["node", "apps/socket/dist/index.js"]



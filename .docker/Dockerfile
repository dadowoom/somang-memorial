FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN corepack enable

FROM base AS build
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build && pnpm run build:preview

FROM base AS production-deps
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --prod --frozen-lockfile

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle
COPY package.json ./package.json
RUN groupadd -g 10001 preview && useradd -u 10001 -g 10001 -m preview
USER 10001:10001
EXPOSE 3000
CMD ["node", "dist/previewFake.js"]

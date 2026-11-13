FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
RUN corepack enable && pnpm install --frozen-lockfile=false
COPY tsconfig.json .
COPY src ./src
RUN pnpm build

FROM node:24-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
RUN corepack enable && pnpm install --prod --frozen-lockfile=false
COPY --from=build /app/dist ./dist
USER node
CMD ["node", "dist/index.js"]

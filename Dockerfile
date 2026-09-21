FROM node:26-bookworm-slim AS build
WORKDIR /app
ENV NODE_ENV=production
RUN npm install --global --no-audit pnpm@12.4.1

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json tsconfig.build.json ./
RUN pnpm install --frozen-lockfile --prod=false

COPY . .
RUN pnpm build

FROM node:26-bookworm-slim AS deps
WORKDIR /app
RUN npm install --global --no-audit pnpm@12.4.1

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

FROM gcr.io/distroless/nodejs26-debian13:nonroot
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps --chown=nonroot:nonroot /app/node_modules ./node_modules
COPY --from=build --chown=nonroot:nonroot /app/dist ./dist
COPY --from=build --chown=nonroot:nonroot /app/public ./public

EXPOSE 3000

CMD ["dist/index.js"]

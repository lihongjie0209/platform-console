FROM node:24-alpine AS build

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages ./packages
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM nginxinc/nginx-unprivileged:1.29-alpine

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --chown=101:101 docker/platform-config.js.template /usr/share/nginx/html/platform-config.js.template
COPY --chown=101:101 docker/40-platform-runtime-config.sh /docker-entrypoint.d/40-platform-runtime-config.sh
COPY --chown=101:101 --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

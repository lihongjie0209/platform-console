# Platform Console

The unified management console for platform and business-system applications. It is built on [Soybean Admin Element Plus](https://github.com/lihongjie0209/soybean-admin-element-plus) and deployed as one SPA.

It integrates Identity login and session tokens, tenant/application/published-menu navigation, safe menu-to-page mapping, runtime service configuration, and Swagger-to-TypeScript contract generation.

Run locally with `corepack enable && pnpm install --frozen-lockfile && pnpm dev`. Configure local service addresses in `public/platform-config.js`. Container deployments inject `PLATFORM_ENV`, `PLATFORM_IDENTITY_URL`, `PLATFORM_TENANT_URL`, `PLATFORM_AUTHORIZATION_URL`, and `PLATFORM_APPLICATION_URL` at startup.

Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, and `pnpm check:contracts` before release. See [docs/architecture.md](docs/architecture.md) for the security and integration model.

This repository derives from Soybean Admin Element Plus and retains its MIT license.

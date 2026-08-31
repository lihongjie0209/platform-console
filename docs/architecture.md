# Console architecture

`platform-console` is one browser application for platform administration and future business-system modules. It is deliberately a single SPA: shared navigation, authorization handling, UI primitives and deployment configuration live in one release unit.

Feature pages are split by application namespace (`platform-admin`, `audit-center`, `config-center`, and later business applications). Each module owns its API adapter and pages while sharing only the shell, authentication, request client, and reusable UI primitives.

## Trust boundary

The browser calls public HTTP APIs on the service subdomains directly. It uses the Identity service JSON login and refresh APIs, retaining tokens in `sessionStorage`; private gRPC, PSK and service credentials never enter this application. Every browser-facing service must allow the console origin through its CORS allowlist.

## Navigation and authorization

On login, the console reads `/api/v1/me` and opens the application launcher. The user can switch among active memberships, search applications granted to the selected tenant, and enter the application's valid default or first published page. Tenant/application selection is session-scoped. The application-service menu is configuration, not executable frontend code: `component` is never dynamically imported. Published pages map to an allowlisted generic platform page until a concrete page module is registered.

The server remains the authorization authority. A hidden menu is not a permission grant; every operation must be authorized again by the target service or authorization-service.

## Runtime configuration

`platform-config.js` is loaded before the Vite bundle. Local development uses `public/platform-config.js`; the container entrypoint generates it from `PLATFORM_*_URL` environment variables at startup. Production requires HTTPS URLs, which are validated before requests are created.

## API contracts

`contracts/services.json` pins the source locations for service Swagger documents. `pnpm generate:contracts` converts Swagger 2 to OpenAPI 3 and generates TypeScript declarations. CI reruns generation and rejects an uncommitted contract change, keeping API models and service documentation aligned.

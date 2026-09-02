# Console architecture

`platform-console` is one browser application for platform administration and future business-system modules. It is deliberately a single SPA: shared navigation, authorization handling, UI primitives and deployment configuration live in one release unit.

Feature pages are split by application namespace (`platform-admin`, `audit-center`, `config-center`, `notification-center`, and later business applications). Each module owns its API adapter, pages, and `manifest.ts` page allowlist while sharing only the shell, authentication, request client, and reusable UI primitives. The central registry only aggregates manifests and rejects duplicate application codes or page keys outside the owning namespace; adding a page never requires placing its loader in a global service-oriented switch.

An application is a user-facing product boundary, not a backend-service boundary. One application may call several services (`platform-admin` combines identity, tenant, authorization and application APIs), while a backend service may support several applications. The launcher groups applications using the catalog's validated `metadata_json.category`, falls back to the installed manifest category, and finally to `business`. Applications introduced by later business systems therefore remain discoverable without coupling the console to their backend service topology.

Application modules cannot import another application's implementation, and shell code cannot reach into a concrete application. Cross-application utilities must move to the platform or shared component layer only after they are genuinely reused. `pnpm check:application-boundaries` enforces both dependency directions in CI; `src/apps` root files are the explicit composition layer that may aggregate manifests and common application types.

Each manifest registers its pages with dynamic imports. The production build emits a Vite manifest, and `pnpm check:application-chunks` verifies every application page is a dynamic entry and is not statically reachable from the main entry. Selecting one application therefore loads that application's page chunks on demand without preloading every other application's implementation.

The shell view surface is intentionally small: login, error pages, the application launcher, personal center, and the generic application host. Scaffold demonstrations are not shipped as hidden routes or dormant chunks. CI checks this allowlist and prevents demo-only dependencies from returning during upstream scaffold updates.

## Trust boundary

The browser calls public HTTP APIs on the service subdomains directly. It uses the Identity service JSON login and refresh APIs, retaining tokens in `sessionStorage`; private gRPC, PSK and service credentials never enter this application. Every browser-facing service must allow the console origin through its CORS allowlist.

## Navigation and authorization

On login, the console reads `/api/v1/me` and opens the application launcher. The user can switch among active memberships, search applications granted to the selected tenant, and enter the application's valid default or first published page. Tenant/application selection is session-scoped. The application-service menu is configuration, not executable frontend code: `component` is never dynamically imported. Published pages map to an allowlisted generic platform page until a concrete page module is registered.

The launcher keeps a bounded recent-application list keyed by authenticated subject and tenant. It stores only application IDs and always intersects them with the freshly authorized, published, locally executable catalog before rendering; browser persistence is normalized as untrusted input. Recent history therefore improves navigation without becoming an authorization or availability source.

The shell also remembers the last internal page for each subject, tenant, and application. Successful router navigation records path-only state (never query parameters or fragments), and an application switch restores it only when that exact path still belongs to the application and remains authorized, published, and installed. Otherwise the shared entry decision falls back to the application's configured default or overview.

Tenant switching is available both from the launcher and the desktop global header. Both entry points first complete the Identity service tenant-scope token exchange, then replace the mounted application routes and navigate to the launcher; a failed exchange leaves the current routes and page intact. This prevents an old tenant page from continuing under a newly scoped token or partially refreshed permissions.

On mobile, the header exposes a compact context drawer instead of hiding the desktop controls. It uses the same categorized application decisions and tenant/application switch controllers, so unavailable applications remain disabled and responsive layout changes cannot create a weaker navigation or authorization path.

Global search reads the already permission-filtered published navigation for every granted application without mounting those applications' Vue routes or chunks. Results include their owning application, are bounded, exclude unavailable pages, and switch application context before navigating to the exact result. This provides cross-application discovery while preserving lazy loading and the single-active-application route boundary.

The launcher evaluates published navigation against the manifests bundled in the current console release. An application with at least one installed page or safe external entry is runnable. A granted application whose published pages are all unknown is shown as `待安装` and cannot be entered, making backend/console rollout skew explicit instead of routing users into an empty workspace. Persisted selections are restored only when the application is still granted and runnable; direct links cannot mount an unavailable application's routes. A valid deep link into another granted application switches the application context, remounts only that application's routes, and retries the original location. The launcher, top switcher, session restoration, deep-link recovery and route mounting all use the same entry decision.

The server remains the authorization authority. A hidden menu is not a permission grant; every operation must be authorized again by the target service or authorization-service.

## Runtime configuration

`platform-config.js` is loaded before the Vite bundle. Local development uses `public/platform-config.js`; the container entrypoint generates it from `PLATFORM_*_URL` environment variables at startup. Production requires HTTPS URLs, which are validated before requests are created.

## API contracts

`contracts/services.json` pins the source locations for service Swagger documents. `pnpm generate:contracts` converts Swagger 2 to OpenAPI 3 and generates TypeScript declarations. CI reruns generation and rejects an uncommitted contract change, keeping API models and service documentation aligned.

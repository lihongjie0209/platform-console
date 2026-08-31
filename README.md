# Platform Console

统一的平台与业务系统管理控制台。它基于 [Soybean Admin Element Plus](https://github.com/lihongjie0209/soybean-admin-element-plus) 构建，并作为一个单一 SPA 发布。

## 包含内容

- Identity Service 的登录、刷新令牌与会话存储；
- 登录后按租户展示已授权应用，支持搜索、切换租户和默认页面跳转；
- 租户 → 已授权应用 → 已发布菜单驱动的动态路由；
- 菜单配置安全映射：后端组件字符串不会被动态导入；
- 可在容器启动时注入的服务地址配置；
- Swagger 2 → OpenAPI 3 → TypeScript 契约生成与 CI 一致性检查。

## 本地开发

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

编辑 `public/platform-config.js` 连接本地服务。生产部署通过 `PLATFORM_ENV`、`PLATFORM_IDENTITY_URL`、`PLATFORM_TENANT_URL`、`PLATFORM_AUTHORIZATION_URL`、`PLATFORM_APPLICATION_URL` 和各应用对应的可选地址（如 `PLATFORM_AUDIT_URL`）注入配置；生产服务地址必须使用 HTTPS。

## 常用命令

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm generate:contracts
pnpm check:contracts
docker build -f docker/Dockerfile -t platform-console .
```

架构与边界说明见 [docs/architecture.md](docs/architecture.md)。

## 上游与许可证

本项目衍生自 Soybean Admin Element Plus，保留其 MIT 许可证；平台相关的应用接入和部署能力在本仓库维护。

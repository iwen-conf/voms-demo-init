#!/usr/bin/env node

import { mkdir, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import process from "node:process";

const DEFAULT_NAME = "voms-architecture-demo";

const args = process.argv.slice(2);
const options = parseArgs(args);
const projectName = options.name || DEFAULT_NAME;
const targetRoot = path.resolve(options.dir || path.join("dist", "demo", projectName));
const force = Boolean(options.force);

const context = {
  projectName,
  projectTitle: options.title || toTitle(projectName),
  generatedAt: new Date().toISOString().slice(0, 10),
};

await assertWritableTarget(targetRoot, force);
await writeProject(targetRoot, context);

console.log(`Demo architecture project created: ${targetRoot}`);
console.log("");
console.log("Next steps:");
console.log(`  cd ${path.relative(process.cwd(), targetRoot) || "."}`);
console.log("  make help");
console.log("  make dev-backend");
console.log("  open AGENTS.md");

function parseArgs(rawArgs) {
  const parsed = {};

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    if (arg === "--force") {
      parsed.force = true;
      continue;
    }

    if (arg === "--name") {
      parsed.name = requireValue(rawArgs, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--dir") {
      parsed.dir = requireValue(rawArgs, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--title") {
      parsed.title = requireValue(rawArgs, index, arg);
      index += 1;
      continue;
    }

    if (!parsed.name) {
      parsed.name = arg;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
}

function requireValue(rawArgs, index, flag) {
  const value = rawArgs[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function printHelp() {
  console.log(`Usage:
  voms-demo-init [name] [--dir <path>] [--title <title>] [--force]

Examples:
  voms-demo-init
  voms-demo-init volunteer-platform-demo
  voms-demo-init --dir ../my-demo --title "My Platform"

This creates a VOMS-style architecture demo with a user CRUD vertical slice:
  backend/                  Go service boundary
  backend/internal/domain   User entity and repository contract
  backend/internal/usecase  User service
  backend/internal/interface/rest User REST controller
  backend/internal/interface/rest/middlewares CORS, trace, request log, recovery
  backend/internal/interface/rest/router Route assembly
  backend/internal/interface/rest/router/routes User route registration
  backend/internal/infrastructure/gateways/persistence/memory User repository gateway
  backend/internal/infrastructure/gateways/notification/memory User notification gateway
  backend/internal/infrastructure/gateways/queue/memory Domain event gateway
  backend/internal/infrastructure/support/cache/memory Read model cache
  backend/internal/infrastructure/support/logger/std Structured logger
  front/admin/web/          Admin Web boundary
  front/admin/web/src/api/users.ts
  front/admin/web/src/store/userStore.ts
  front/admin/web/src/views/UserManagement.vue
  front/public/             Public and self-service Web boundary
  front/miniprogram/        Mini program boundary
  docs/                     Product and API documentation boundary
  ops/deploy/               Deployment wizard boundary
  ops/recovery/             Recovery tool boundary
  ops/cloud/                Cloud publishing boundary
`);
}

async function assertWritableTarget(target, forceTarget) {
  try {
    await access(target, constants.F_OK);
    if (!forceTarget) {
      throw new Error(`Target already exists: ${target}. Re-run with --force to add or overwrite template files.`);
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

async function writeProject(root, ctx) {
  const directories = [
    "",
    "backend/cmd/server",
    "backend/cmd/workers/consumer",
    "backend/cmd/workers/scheduler",
    "backend/configs",
    "backend/internal/domain",
    "backend/internal/domain/user",
    "backend/internal/usecase",
    "backend/internal/usecase/user",
    "backend/internal/interface/rest",
    "backend/internal/interface/rest/controllers",
    "backend/internal/interface/rest/dto",
    "backend/internal/interface/rest/dto/requests",
    "backend/internal/interface/rest/dto/responses",
    "backend/internal/interface/rest/middlewares",
    "backend/internal/interface/rest/router",
    "backend/internal/interface/rest/router/routes",
    "backend/internal/infrastructure",
    "backend/internal/infrastructure/gateways",
    "backend/internal/infrastructure/gateways/notification",
    "backend/internal/infrastructure/gateways/notification/memory",
    "backend/internal/infrastructure/gateways/persistence",
    "backend/internal/infrastructure/gateways/persistence/memory",
    "backend/internal/infrastructure/gateways/persistence/memory/repository",
    "backend/internal/infrastructure/gateways/queue",
    "backend/internal/infrastructure/gateways/queue/memory",
    "backend/internal/infrastructure/support",
    "backend/internal/infrastructure/support/cache",
    "backend/internal/infrastructure/support/cache/memory",
    "backend/internal/infrastructure/support/logger",
    "backend/internal/infrastructure/support/logger/std",
    "backend/internal/wire",
    "backend/migrations/up",
    "front/admin/web/src/api",
    "front/admin/web/src/components",
    "front/admin/web/src/router",
    "front/admin/web/src/store",
    "front/admin/web/src/views",
    "front/admin/web/src/views/users",
    "front/public/src/api",
    "front/public/src/components",
    "front/public/src/router",
    "front/public/src/store",
    "front/public/src/views",
    "front/miniprogram/miniprogram/pages/home",
    "front/miniprogram/miniprogram/pages/profile",
    "docs/01-requirements",
    "docs/02-architecture",
    "docs/03-permissions",
    "docs/04-business-flows",
    "docs/05-data-model",
    "docs/06-api",
    "docs/07-operations",
    "ops/deploy/src",
    "ops/deploy/ui/src",
    "ops/recovery/src",
    "ops/cloud/docs-site",
    "ops/cloud/release-api/src",
    "tasks",
  ];

  for (const directory of directories) {
    await mkdir(path.join(root, directory), { recursive: true });
  }

  const files = buildFiles(ctx);
  for (const [relativePath, content] of Object.entries(files)) {
    await writeFile(path.join(root, relativePath), content, "utf8");
  }
}

function buildFiles(ctx) {
  return {
    "README.md": rootReadme(ctx),
    "AGENTS.md": rootAgents(ctx),
    "CLAUDE.md": rootClaude(ctx),
    "codemap.md": rootCodemap(ctx),
    "Makefile": rootMakefile(ctx),
    "tasks/todo.md": tasksTodo(ctx),
    "backend/AGENTS.md": moduleAgents("backend", "../AGENTS.md", "cd backend && go test ./...", [
      "后端 API、鉴权、中间件、异步任务、存储与对象层",
      "生产发布前的后端构建与回归",
    ]),
    "backend/CLAUDE.md": moduleClaude("backend", "Go 后端服务"),
    "backend/FOLDER_INDEX.md": backendFolderIndex(),
    "backend/codemap.md": backendCodemap(),
    "backend/go.mod": backendGoMod(ctx),
    "backend/cmd/server/main.go": backendServerMain(ctx),
    "backend/cmd/workers/consumer/main.go": goMain("consumer worker"),
    "backend/cmd/workers/scheduler/main.go": goMain("scheduler worker"),
    "backend/configs/app.example.yaml": "app:\n  name: demo-service\n  env: local\n",
    "backend/internal/domain/README.md": layerReadme("领域层", "实体、值对象、领域规则和仓储接口定义。"),
    "backend/internal/domain/user/model.go": backendUserDomainModel(),
    "backend/internal/domain/user/repository.go": backendUserRepositoryContract(),
    "backend/internal/usecase/README.md": layerReadme("应用服务层", "编排业务流程、事务边界和跨领域协作。"),
    "backend/internal/usecase/user/service.go": backendUserService(ctx),
    "backend/internal/interface/rest/README.md": layerReadme("接口适配层", "HTTP 路由、请求绑定、响应封装和协议转换。"),
    "backend/internal/interface/rest/controllers/response.go": backendRestResponse(),
    "backend/internal/interface/rest/controllers/user_handler.go": backendUserHandler(ctx),
    "backend/internal/interface/rest/dto/requests/user.go": backendUserRequestDTO(ctx),
    "backend/internal/interface/rest/dto/responses/user.go": backendUserResponseDTO(ctx),
    "backend/internal/interface/rest/middlewares/cors.go": backendCorsMiddleware(ctx),
    "backend/internal/interface/rest/middlewares/recovery.go": backendRecoveryMiddleware(ctx),
    "backend/internal/interface/rest/middlewares/request_log.go": backendRequestLogMiddleware(ctx),
    "backend/internal/interface/rest/middlewares/trace.go": backendTraceMiddleware(),
    "backend/internal/interface/rest/router/router.go": backendRouter(ctx),
    "backend/internal/interface/rest/router/routes/users.go": backendUserRoutes(ctx),
    "backend/internal/infrastructure/README.md": layerReadme("基础设施层", "数据库、缓存、消息、文件、外部服务和可观测实现。"),
    "backend/internal/infrastructure/gateways/README.md": layerReadme("Gateways", "对外部系统和持久化能力的适配层，如数据库、队列、通知、对象存储和第三方 API。"),
    "backend/internal/infrastructure/gateways/persistence/README.md": layerReadme("Persistence Gateway", "持久化网关，负责把领域仓储契约适配到具体存储实现。"),
    "backend/internal/infrastructure/gateways/persistence/memory/repository/user_repository.go": backendMemoryUserRepository(ctx),
    "backend/internal/infrastructure/gateways/notification/contract.go": backendNotificationContract(ctx),
    "backend/internal/infrastructure/gateways/notification/memory/notifier.go": backendMemoryNotifier(ctx),
    "backend/internal/infrastructure/gateways/queue/contract.go": backendQueueContract(),
    "backend/internal/infrastructure/gateways/queue/memory/event_bus.go": backendMemoryEventBus(ctx),
    "backend/internal/infrastructure/support/README.md": layerReadme("Support", "跨业务的技术支撑能力，如缓存、日志、鉴权、会话、可观测和通用工具。"),
    "backend/internal/infrastructure/support/cache/contract.go": backendCacheContract(),
    "backend/internal/infrastructure/support/cache/memory/cache.go": backendMemoryCache(),
    "backend/internal/infrastructure/support/logger/contract.go": backendLoggerContract(),
    "backend/internal/infrastructure/support/logger/std/logger.go": backendStdLogger(),
    "backend/internal/wire/README.md": layerReadme("组装层", "依赖注入、生命周期管理和应用装配。"),
    "backend/internal/wire/app.go": backendWireApp(ctx),
    "backend/internal/wire/infrastructure.go": backendWireInfrastructure(ctx),
    "backend/internal/wire/repositories.go": backendWireRepositories(ctx),
    "backend/internal/wire/usecases.go": backendWireUsecases(ctx),
    "backend/internal/wire/controllers.go": backendWireControllers(ctx),
    "backend/migrations/up/000001_init_users.sql": backendUsersMigration(),
    "front/AGENTS.md": moduleAgents("front", "../AGENTS.md", "make build-front-admin && make build-front-public", [
      "Web 与小程序客户端族",
      "前端路由、状态、组件和后端 API 契约消费",
    ]),
    "front/codemap.md": frontCodemap(),
    "front/admin/web/AGENTS.md": moduleAgents("front/admin/web", "../../../AGENTS.md", "cd front/admin/web && pnpm build", [
      "管理后台页面、路由、状态管理与后台 API 对接",
      "后台会话、权限守卫和运营工作台",
    ]),
    "front/admin/web/CLAUDE.md": moduleClaude("front/admin/web", "管理后台 Web"),
    "front/admin/web/FOLDER_INDEX.md": webFolderIndex("front/admin/web", "管理后台"),
    "front/admin/web/codemap.md": webCodemap("front/admin/web", "Admin Web"),
    "front/admin/web/package.json": adminPackageJson(ctx),
    "front/admin/web/pnpm-workspace.yaml": adminPnpmWorkspace(),
    "front/admin/web/index.html": adminIndexHtml(ctx),
    "front/admin/web/vite.config.ts": adminViteConfig(),
    "front/admin/web/tsconfig.json": adminTsconfig(),
    "front/admin/web/src/vite-env.d.ts": "/// <reference types=\"vite/client\" />\n",
    "front/admin/web/src/main.ts": adminMainTs(),
    "front/admin/web/src/App.vue": adminAppVue(ctx),
    "front/admin/web/src/api/http.ts": adminHttpApi(),
    "front/admin/web/src/api/users.ts": adminUsersApi(),
    "front/admin/web/src/store/userStore.ts": adminUserStore(),
    "front/admin/web/src/router/index.ts": adminRouter(),
    "front/admin/web/src/views/users/UserManagement.vue": adminUserManagementVue(),
    "front/admin/web/src/router/README.md": layerReadme("路由层", "页面注册、访问控制和导航守卫。"),
    "front/admin/web/src/store/README.md": layerReadme("状态层", "用户、权限和全局 UI 状态管理。"),
    "front/admin/web/src/api/README.md": layerReadme("API 层", "按业务域封装后端接口和请求类型。"),
    "front/admin/web/src/views/README.md": layerReadme("页面层", "组合业务组件并承载页面级交互。"),
    "front/admin/web/src/components/README.md": layerReadme("组件层", "复用 UI 和业务组件。"),
    "front/public/AGENTS.md": moduleAgents("front/public", "../../AGENTS.md", "cd front/public && pnpm build", [
      "公众门户、自助端页面、路由与公开 API 对接",
      "公开报名、信息查询和个人中心入口",
    ]),
    "front/public/CLAUDE.md": moduleClaude("front/public", "公众访问端与自助端"),
    "front/public/FOLDER_INDEX.md": webFolderIndex("front/public", "公众访问端"),
    "front/public/codemap.md": webCodemap("front/public", "Public Web"),
    "front/public/src/main.ts": vueMain("public"),
    "front/public/src/router/README.md": layerReadme("路由层", "公开路由、自助端路由和访问边界。"),
    "front/public/src/store/README.md": layerReadme("状态层", "公开站点状态、用户自助状态和 UI 状态。"),
    "front/public/src/api/README.md": layerReadme("API 层", "公开接口和自助端接口封装。"),
    "front/public/src/views/README.md": layerReadme("页面层", "公开页面、自助端页面和查询表单。"),
    "front/public/src/components/README.md": layerReadme("组件层", "站点组件、表单组件和通用展示组件。"),
    "front/miniprogram/AGENTS.md": moduleAgents("front/miniprogram", "../../AGENTS.md", "cd front/miniprogram && npm run typecheck", [
      "微信小程序客户端页面、组件和移动端服务链路",
      "扫码、活动、个人中心等移动场景",
    ]),
    "front/miniprogram/CLAUDE.md": moduleClaude("front/miniprogram", "微信小程序"),
    "front/miniprogram/FOLDER_INDEX.md": miniprogramFolderIndex(),
    "front/miniprogram/codemap.md": miniprogramCodemap(),
    "front/miniprogram/miniprogram/app.ts": "App({\n  globalData: {},\n});\n",
    "front/miniprogram/miniprogram/pages/home/README.md": layerReadme("小程序首页", "移动端核心入口和常用业务聚合。"),
    "front/miniprogram/miniprogram/pages/profile/README.md": layerReadme("个人中心", "用户信息、服务记录、资产和消息入口。"),
    "docs/AGENTS.md": moduleAgents("docs", "../AGENTS.md", "make docs-check", [
      "需求、权限矩阵、业务流、API、开发和运维文档中心",
      "跨端契约和产品语义基准",
    ]),
    "docs/CLAUDE.md": moduleClaude("docs", "项目文档中心"),
    "docs/codemap.md": docsCodemap(),
    "docs/01-requirements/README.md": docSection("需求文档", "记录业务背景、用户角色、场景和验收标准。"),
    "docs/02-architecture/README.md": docSection("架构设计", "记录模块边界、依赖方向、关键链路和技术选型。"),
    "docs/03-permissions/README.md": docSection("权限矩阵", "记录角色、资源、动作和授权边界。"),
    "docs/04-business-flows/README.md": userBusinessFlowDoc(),
    "docs/05-data-model/README.md": userDataModelDoc(),
    "docs/06-api/README.md": userApiDoc(),
    "docs/07-operations/README.md": docSection("运维文档", "记录部署、备份、恢复、监控和发布流程。"),
    "ops/AGENTS.md": moduleAgents("ops", "../AGENTS.md", "make build-deploy && make build-recovery", [
      "部署、恢复、云端分发和发布工具",
      "交付链路、运行时配置和应急修复",
    ]),
    "ops/codemap.md": opsCodemap(),
    "ops/deploy/AGENTS.md": moduleAgents("ops/deploy", "../../AGENTS.md", "cd ops/deploy && cargo check", [
      "一键部署向导",
      "配置生成、发布编排和部署链路修复",
    ]),
    "ops/deploy/CLAUDE.md": moduleClaude("ops/deploy", "部署向导"),
    "ops/deploy/FOLDER_INDEX.md": opsToolFolderIndex("ops/deploy", "部署向导", "src/", "ui/"),
    "ops/deploy/codemap.md": opsToolCodemap("ops/deploy", "Deployment wizard"),
    "ops/deploy/src/main.rs": rustMain("deploy"),
    "ops/deploy/ui/src/README.md": layerReadme("部署向导 UI", "安装步骤、日志展示和配置表单。"),
    "ops/recovery/AGENTS.md": moduleAgents("ops/recovery", "../../AGENTS.md", "cd ops/recovery && cargo check", [
      "终端恢复、卸载和应急修复工具",
      "运行时检查、备份恢复和服务修复",
    ]),
    "ops/recovery/CLAUDE.md": moduleClaude("ops/recovery", "恢复向导"),
    "ops/recovery/FOLDER_INDEX.md": opsToolFolderIndex("ops/recovery", "恢复向导", "src/", "target/"),
    "ops/recovery/codemap.md": opsToolCodemap("ops/recovery", "Recovery tool"),
    "ops/recovery/src/main.rs": rustMain("recovery"),
    "ops/cloud/AGENTS.md": moduleAgents("ops/cloud", "../../AGENTS.md", "make build-cloud", [
      "云端文档站、发布 API 和对象存储分发",
      "发布元数据、下载入口和远端校验",
    ]),
    "ops/cloud/CLAUDE.md": moduleClaude("ops/cloud", "云端辅助服务"),
    "ops/cloud/FOLDER_INDEX.md": cloudFolderIndex(),
    "ops/cloud/codemap.md": cloudCodemap(),
    "ops/cloud/docs-site/README.md": layerReadme("文档站", "对外发布安装说明、用户手册和版本说明。"),
    "ops/cloud/release-api/src/index.ts": "export default {\n  fetch() {\n    return Response.json({ service: \"release-api\", ok: true });\n  },\n};\n",
  };
}

function rootReadme(ctx) {
  return `# ${ctx.projectTitle}

这是一个 VOMS 风格的架构 demo 项目。它保留清晰的 monorepo 分层、模块入口文档、文件夹索引和架构地图，并内置一个用户 CRUD 纵切片。

## 快速入口

\`\`\`bash
make help
make dev-backend
curl -s http://127.0.0.1:8080/api/v1/users
make tree
\`\`\`

## 生成目标

- 用根级 \`AGENTS.md\` 说明全局架构、模块职责、启动和测试入口。
- 用每个模块的 \`AGENTS.md\` 说明协作入口、当前门禁和适用范围。
- 用 \`FOLDER_INDEX.md\` 描述文件夹层次、依赖方向和维护规则。
- 用 \`codemap.md\` 描述模块的 Responsibility、Design、Flow、Integration。
- 用 \`backend/internal/*/user\`、\`front/admin/web/src/views/users\` 和 \`docs/06-api\` 展示一条完整用户 CRUD 业务链路。

生成时间：${ctx.generatedAt}
`;
}

function rootAgents(ctx) {
  return `# ${ctx.projectTitle} - Demo Architecture

## 项目愿景

本项目是一个可复用的全栈业务系统架构模板，适合需要同时交付后端服务、管理后台、公众端、移动端、项目文档和运维工具的团队。

## 架构总览

| 维度 | 默认技术栈 | 职责 |
|------|------------|------|
| 后端 | Go + Gin + PostgreSQL + Redis/NATS | API、领域逻辑、异步任务、权限、可观测 |
| 管理后台 | Vue 3 + TypeScript + Vite | 运营管理、权限控制、后台工作台 |
| 公众端 | Vue 3 + TypeScript + Vite | 官网、公开表单、个人自助端 |
| 小程序 | 原生小程序 + TypeScript | 移动端高频业务入口 |
| 文档 | Markdown | 需求、权限、业务流、API、运维手册 |
| 部署工具 | Rust + Web UI | 一键部署、配置生成、发布编排 |
| 恢复工具 | Rust TUI | 故障恢复、卸载、备份回滚 |
| 云端服务 | Workers/Pages | 文档站、发布 API、下载分发 |

## 模块结构图

\`\`\`mermaid
graph TD
    ROOT["${ctx.projectName}"] --> BACKEND["backend<br/>后端服务"]
    ROOT --> ADMIN["front/admin/web<br/>管理后台"]
    ROOT --> PUBLIC["front/public<br/>公众端 + 自助端"]
    ROOT --> MINI["front/miniprogram<br/>小程序"]
    ROOT --> DOCS["docs<br/>项目文档"]
    ROOT --> DEPLOY["ops/deploy<br/>部署向导"]
    ROOT --> RECOVERY["ops/recovery<br/>恢复向导"]
    ROOT --> CLOUD["ops/cloud<br/>云端辅助服务"]

    BACKEND --> DOMAIN["internal/domain"]
    BACKEND --> USECASE["internal/usecase"]
    BACKEND --> INTERFACE["internal/interface"]
    BACKEND --> INFRA["internal/infrastructure"]
    ADMIN --> ADMIN_SRC["src/api router store views components"]
    PUBLIC --> PUBLIC_SRC["src/api router store views components"]
    DOCS --> API_DOCS["06-api"]
    DEPLOY --> DEPLOY_UI["ui"]
\`\`\`

## 模块索引

| 模块路径 | 职责 | 入口文档 |
|---------|------|----------|
| \`backend/\` | 后端 API、领域核心、异步任务和基础设施 | [backend/AGENTS.md](./backend/AGENTS.md) |
| \`front/admin/web/\` | 管理后台 Web 端 | [front/admin/web/AGENTS.md](./front/admin/web/AGENTS.md) |
| \`front/public/\` | 公众端与个人自助端 | [front/public/AGENTS.md](./front/public/AGENTS.md) |
| \`front/miniprogram/\` | 小程序客户端 | [front/miniprogram/AGENTS.md](./front/miniprogram/AGENTS.md) |
| \`docs/\` | 项目文档中心 | [docs/AGENTS.md](./docs/AGENTS.md) |
| \`ops/deploy/\` | 部署向导 | [ops/deploy/AGENTS.md](./ops/deploy/AGENTS.md) |
| \`ops/recovery/\` | 恢复向导 | [ops/recovery/AGENTS.md](./ops/recovery/AGENTS.md) |
| \`ops/cloud/\` | 云端文档与发布服务 | [ops/cloud/AGENTS.md](./ops/cloud/AGENTS.md) |

## AI 使用指引

1. 修改前优先阅读对应模块的 \`AGENTS.md\`。
2. 后端开发优先参考 \`backend/FOLDER_INDEX.md\` 与 \`backend/codemap.md\`。
3. 前端开发需区分管理后台、公众端和小程序，避免跨端职责混杂。
4. 产品、权限、接口语义优先以 \`docs/\` 为准。
5. 若目录结构、职责或入口发生变化，应同步更新根级与模块级索引文档。
`;
}

function rootClaude(ctx) {
  return `# ${ctx.projectTitle} Context

这个文件用于给 AI 和开发者提供稳定的项目上下文。详细模块边界见 \`AGENTS.md\`、\`codemap.md\` 与各模块 \`FOLDER_INDEX.md\`。
`;
}

function rootCodemap(ctx) {
  return `# ${ctx.projectName}/

## Responsibility

仓库承载完整业务系统交付面：后端、管理后台、公众端、小程序、项目文档与部署运维工具。

## Design

- **Monorepo 分层**: 以 \`backend/\`、\`front/\`、\`docs/\`、\`ops/\` 四大域组织实现、文档与交付工具。
- **Backend-First Contract**: 后端定义业务能力和接口契约，前端与运维围绕其展开。
- **Multi-Surface Delivery**: 同一业务能力面向管理后台、公众端和移动端投放。
- **Docs as Contract**: 文档目录沉淀需求、权限、API 和运维边界。

## Flow

1. \`docs/\` 记录需求、API、技术规范和运维手册。
2. \`backend/\` 提供 API、异步任务和核心业务状态。
3. \`front/admin/web\`、\`front/public\`、\`front/miniprogram\` 消费后端契约。
4. \`ops/deploy\`、\`ops/recovery\`、\`ops/cloud\` 负责部署、恢复和云端分发。

## Module Maps

| 路径 | 职责 | 详细地图 |
|------|------|----------|
| \`backend/\` | 后端服务与领域核心 | [View Map](backend/codemap.md) |
| \`front/\` | Web 与小程序客户端族 | [View Map](front/codemap.md) |
| \`docs/\` | 需求、接口、规范与运维文档 | [View Map](docs/codemap.md) |
| \`ops/\` | 部署、恢复、云端分发工具 | [View Map](ops/codemap.md) |
`;
}

function rootMakefile() {
  return `.PHONY: help tree dev-backend verify-user-crud build-backend build-front-admin build-front-public check-miniprogram build-deploy build-recovery build-cloud docs-check build-all

.DEFAULT_GOAL := help

help:
\t@echo "Demo architecture commands:"
\t@echo "  make tree              - show top-level architecture tree"
\t@echo "  make dev-backend       - run the demo Go API on :8080"
\t@echo "  make verify-user-crud  - curl the running user CRUD API"
\t@echo "  make build-backend     - run backend tests"
\t@echo "  make build-front-admin - install/build admin Web"
\t@echo "  make build-front-public - placeholder public web gate"
\t@echo "  make check-miniprogram - placeholder mini program gate"
\t@echo "  make build-deploy      - placeholder deploy tool gate"
\t@echo "  make build-recovery    - placeholder recovery tool gate"
\t@echo "  make docs-check        - placeholder docs gate"
\t@echo "  make build-all         - run all placeholders"

tree:
\t@find . -maxdepth 4 -type d | sort | sed 's#^./##'

dev-backend:
\t@cd backend && go run ./cmd/server

verify-user-crud:
\t@curl -fsS http://127.0.0.1:8080/api/v1/health
\t@echo ""
\t@curl -fsS -X POST http://127.0.0.1:8080/api/v1/users -H 'Content-Type: application/json' -d '{"name":"Demo User","email":"demo@example.com","role":"operator","status":"active"}'
\t@echo ""
\t@curl -fsS http://127.0.0.1:8080/api/v1/users
\t@echo ""

build-backend:
\t@cd backend && go test ./...

build-front-admin:
\t@cd front/admin/web && npm install && npm run build

build-front-public:
\t@echo "public web gate placeholder: cd front/public && pnpm build"

check-miniprogram:
\t@echo "mini program gate placeholder: cd front/miniprogram && npm run typecheck"

build-deploy:
\t@echo "deploy tool gate placeholder: cd ops/deploy && cargo check"

build-recovery:
\t@echo "recovery tool gate placeholder: cd ops/recovery && cargo check"

build-cloud:
\t@echo "cloud gate placeholder: build docs site and release API"

docs-check:
\t@echo "docs gate placeholder: lint markdown and check links"

build-all: build-backend build-front-admin build-front-public check-miniprogram build-deploy build-recovery docs-check
\t@echo "all demo gates passed"
`;
}

function moduleAgents(modulePath, rootLink, gate, scopes) {
  return `# ${modulePath} - 模块协作入口

[← 返回项目根目录 AGENTS](${rootLink})

## 先看什么

1. [CLAUDE.md](./CLAUDE.md)
2. [FOLDER_INDEX.md](./FOLDER_INDEX.md)
3. [codemap.md](./codemap.md)

## 当前门禁

\`\`\`bash
${gate}
\`\`\`

## 适用范围

${scopes.map((item) => `- ${item}`).join("\n")}
`;
}

function moduleClaude(modulePath, name) {
  return `# ${modulePath} Context

${modulePath} 是 ${name} 模块。修改该模块前先看本目录 \`AGENTS.md\`、\`FOLDER_INDEX.md\` 和 \`codemap.md\`。
`;
}

function backendFolderIndex() {
  return `# backend 文件夹索引

## 架构说明

\`backend\` 是系统核心服务模块，采用分层架构组织业务、接口和基础设施。
入口层位于 \`cmd/\`，业务核心位于 \`internal/\`，并通过 \`configs/\` 与 \`migrations/\` 管理运行配置和数据库演进。
本 demo 提供一个用户 CRUD 纵切片，可直接运行并通过 HTTP 调用。

## 文件清单（核心）

### \`cmd/server/main.go\`
- 地位: 主 API 服务入口
- 功能: 加载配置、构建应用、启动服务、处理优雅退出
- 依赖: \`configs\`、\`internal/wire\`

### \`cmd/workers/consumer/main.go\`
- 地位: 异步消费工作器入口
- 功能: 消费业务事件并触发后台流程
- 依赖: \`internal/infrastructure/*\`、\`internal/usecase/*\`

### \`cmd/workers/scheduler/main.go\`
- 地位: 定时调度工作器入口
- 功能: 周期性触发后台任务与补偿流程

### \`internal/domain/\`
- 地位: 领域层
- 功能: 实体、领域规则、仓储接口约束
- 示例: \`internal/domain/user\` 定义用户实体、状态、角色和仓储契约

### \`internal/usecase/\`
- 地位: 应用服务层
- 功能: 编排业务流程与事务边界
- 示例: \`internal/usecase/user.Service\` 编排创建、查询、更新和删除用户

### \`internal/interface/\`
- 地位: 接口适配层
- 功能: HTTP/gRPC 协议适配、参数绑定与响应封装
- 示例: \`internal/interface/rest/controllers.UserHandler\` 处理用户请求，\`router/routes\` 注册 \`/api/v1/users\` 路由，\`middlewares\` 处理 CORS、Trace、请求日志和 Recovery

### \`internal/infrastructure/\`
- 地位: 基础设施实现层
- 功能: 数据库、缓存、消息、日志、可观测等技术实现
- 示例: \`gateways/persistence/memory/repository.UserRepository\` 提供持久化网关，\`support/cache/memory.Cache\` 提供缓存支撑，\`gateways/queue/memory.EventBus\` 记录领域事件

### \`internal/wire/\`
- 地位: 组装层
- 功能: 应用依赖注入与生命周期管理
- 示例: \`internal/wire.NewApp\` 串起 \`InitInfrastructure\`、\`InitRepositories\`、\`InitUseCases\`、\`InitControllers\` 和 HTTP Router

### \`migrations/up/\`
- 地位: 数据库 schema 演进入口
- 功能: 按版本管理数据库结构与索引变更

---
自指声明: 当 \`backend\` 目录结构、职责或核心依赖变化时，请更新本索引。
`;
}

function backendCodemap() {
  return `# backend/

## Responsibility

提供系统 API、领域核心、异步任务、权限与基础设施适配。本 demo 内置用户 CRUD 纵切片。

## Design

- \`cmd/\`: 进程入口。
- \`internal/domain/\`: 领域实体和业务规则。
- \`internal/usecase/\`: 应用服务和事务边界。
- \`internal/interface/\`: 协议适配。
- \`internal/infrastructure/gateways/\`: 持久化、通知、队列、对象存储、第三方 API 等外部能力适配。
- \`internal/infrastructure/support/\`: 缓存、日志、鉴权、可观测、会话等跨业务技术支撑。
- \`internal/wire/\`: 依赖组装。

## Flow

用户 CRUD 请求先经过 \`interface/rest/middlewares\`，再由 \`interface/rest/router/routes\` 分发到 \`controllers.UserHandler\`。Handler 调用 \`internal/usecase/user.Service\`，Service 围绕 \`internal/domain/user.User\` 执行业务规则，并通过 \`gateways/persistence\` 完成持久化，通过 \`support/cache\` 缓存列表读模型，通过 \`gateways/queue\` 发布领域事件，通过 \`gateways/notification\` 触发通知。依赖由 \`internal/wire\` 分层装配。
`;
}

function frontCodemap() {
  return `# front/

## Responsibility

承载管理后台、公众访问端和小程序客户端。

## Design

- \`admin/web/\`: 管理端运营工作台。
- \`public/\`: 公众门户和用户自助端。
- \`miniprogram/\`: 移动端小程序场景。

## Flow

三个客户端共享后端契约，但保持路由、状态和 UI 体验边界独立。
`;
}

function webFolderIndex(modulePath, name) {
  return `# ${modulePath} 文件夹索引

## 架构说明

\`${modulePath}\` 是${name}模块，使用 Vue 3 + TypeScript 构建。
核心代码集中在 \`src/\`，通过 \`router\`、\`store\`、\`api\`、\`views\` 与 \`components\` 形成页面到数据的完整链路。

## 文件清单（核心）

### \`src/main.ts\`
- 地位: 前端应用入口
- 功能: 初始化应用、路由、状态、样式和错误处理

### \`src/router/\`
- 地位: 路由与访问控制中心
- 功能: 页面路由注册、权限守卫与导航流程

### \`src/store/\`
- 地位: 状态管理层
- 功能: 用户状态、权限状态、全局 UI 状态管理

### \`src/api/\`
- 地位: 后端接口封装层
- 功能: 统一请求与响应类型，按业务域组织 API 客户端

### \`src/views/\`
- 地位: 页面层
- 功能: 业务页面组合与交互入口

### \`src/components/\`
- 地位: 组件层
- 功能: 复用 UI 组件与业务组件封装

---
自指声明: 当 \`${modulePath}\` 目录结构、核心模块职责或 API 依赖方向变化时，请更新本索引。
`;
}

function webCodemap(modulePath, title) {
  return `# ${modulePath}/

## Responsibility

${title} 承载对应用户群体的 Web 交互、路由、状态和后端 API 消费。

## Design

- \`src/api/\`: 后端契约封装。
- \`src/router/\`: 路由表与访问控制。
- \`src/store/\`: 状态管理。
- \`src/views/\`: 页面组合。
- \`src/components/\`: 复用组件。

## Flow

页面从路由进入，读取状态并调用 API 层，API 层与后端契约交互后回写 store 或页面局部状态。
`;
}

function backendGoMod(ctx) {
  return `module ${moduleName(ctx.projectName)}/backend

go 1.22
`;
}

function backendServerMain(ctx) {
  const mod = moduleName(ctx.projectName);
  return `package main

import (
\t"log"
\t"net/http"
\t"os"

\t"${mod}/backend/internal/wire"
)

func main() {
\tapp := wire.NewApp()
\tport := os.Getenv("PORT")
\tif port == "" {
\t\tport = "8080"
\t}
\tserver := &http.Server{
\t\tAddr:    ":" + port,
\t\tHandler: app.Router,
\t}

\tlog.Printf("demo backend listening on http://127.0.0.1:%s", port)
\tlog.Printf("user CRUD API: http://127.0.0.1:%s/api/v1/users", port)
\tif err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
\t\tlog.Fatal(err)
\t}
}
`;
}

function backendUserDomainModel() {
  return `package user

import (
\t"errors"
\t"net/mail"
\t"strings"
\t"time"
)

type Status string

const (
\tStatusActive   Status = "active"
\tStatusDisabled Status = "disabled"
)

type User struct {
\tID        string    \`json:"id"\`
\tName      string    \`json:"name"\`
\tEmail     string    \`json:"email"\`
\tRole      string    \`json:"role"\`
\tStatus    Status    \`json:"status"\`
\tCreatedAt time.Time \`json:"created_at"\`
\tUpdatedAt time.Time \`json:"updated_at"\`
}

type CreateInput struct {
\tName   string \`json:"name"\`
\tEmail  string \`json:"email"\`
\tRole   string \`json:"role"\`
\tStatus Status \`json:"status"\`
}

type UpdateInput struct {
\tName   string \`json:"name"\`
\tEmail  string \`json:"email"\`
\tRole   string \`json:"role"\`
\tStatus Status \`json:"status"\`
}

func NewUser(id string, input CreateInput, now time.Time) (User, error) {
\tinput = normalizeCreateInput(input)
\tif err := validate(input.Name, input.Email, input.Role, input.Status); err != nil {
\t\treturn User{}, err
\t}

\treturn User{
\t\tID:        id,
\t\tName:      input.Name,
\t\tEmail:     input.Email,
\t\tRole:      input.Role,
\t\tStatus:    input.Status,
\t\tCreatedAt: now,
\t\tUpdatedAt: now,
\t}, nil
}

func (u User) Apply(input UpdateInput, now time.Time) (User, error) {
\tinput = normalizeUpdateInput(input)
\tif err := validate(input.Name, input.Email, input.Role, input.Status); err != nil {
\t\treturn User{}, err
\t}

\tu.Name = input.Name
\tu.Email = input.Email
\tu.Role = input.Role
\tu.Status = input.Status
\tu.UpdatedAt = now
\treturn u, nil
}

func normalizeCreateInput(input CreateInput) CreateInput {
\tinput.Name = strings.TrimSpace(input.Name)
\tinput.Email = strings.ToLower(strings.TrimSpace(input.Email))
\tinput.Role = strings.TrimSpace(input.Role)
\tif input.Status == "" {
\t\tinput.Status = StatusActive
\t}
\treturn input
}

func normalizeUpdateInput(input UpdateInput) UpdateInput {
\treturn UpdateInput(normalizeCreateInput(CreateInput(input)))
}

func validate(name string, email string, role string, status Status) error {
\tif name == "" {
\t\treturn errors.New("name is required")
\t}
\tif _, err := mail.ParseAddress(email); err != nil {
\t\treturn errors.New("email is invalid")
\t}
\tif role == "" {
\t\treturn errors.New("role is required")
\t}
\tif status != StatusActive && status != StatusDisabled {
\t\treturn errors.New("status must be active or disabled")
\t}
\treturn nil
}
`;
}

function backendUserRepositoryContract() {
  return `package user

import (
\t"context"
\t"errors"
)

var (
\tErrNotFound       = errors.New("user not found")
\tErrEmailConflicts = errors.New("email already exists")
)

type Repository interface {
\tCreate(ctx context.Context, user User) (User, error)
\tList(ctx context.Context) ([]User, error)
\tFindByID(ctx context.Context, id string) (User, error)
\tUpdate(ctx context.Context, user User) (User, error)
\tDelete(ctx context.Context, id string) error
\tNextID(ctx context.Context) (string, error)
}
`;
}

function backendUserService(ctx) {
  const mod = moduleName(ctx.projectName);
  return `package user

import (
\t"context"
\t"encoding/json"
\t"time"

\tdomain "${mod}/backend/internal/domain/user"
\t"${mod}/backend/internal/infrastructure/gateways/notification"
\t"${mod}/backend/internal/infrastructure/gateways/queue"
\t"${mod}/backend/internal/infrastructure/support/cache"
\t"${mod}/backend/internal/infrastructure/support/logger"
)

type Service struct {
\trepository domain.Repository
\tcache      cache.Contract
\tevents     queue.Contract
\tnotifier   notification.Contract
\tlogger     logger.Contract
\tnow        func() time.Time
}

func NewService(
\trepository domain.Repository,
\tcache cache.Contract,
\tevents queue.Contract,
\tnotifier notification.Contract,
\tlogger logger.Contract,
) *Service {
\treturn &Service{
\t\trepository: repository,
\t\tcache:      cache,
\t\tevents:     events,
\t\tnotifier:   notifier,
\t\tlogger:     logger,
\t\tnow:        time.Now,
\t}
}

func (s *Service) Create(ctx context.Context, input domain.CreateInput) (domain.User, error) {
\tid, err := s.repository.NextID(ctx)
\tif err != nil {
\t\treturn domain.User{}, err
\t}

\tentity, err := domain.NewUser(id, input, s.now().UTC())
\tif err != nil {
\t\treturn domain.User{}, err
\t}
\tcreated, err := s.repository.Create(ctx, entity)
\tif err != nil {
\t\treturn domain.User{}, err
\t}
\ts.afterUserChanged(ctx, "user.created", created)
\treturn created, nil
}

func (s *Service) List(ctx context.Context) ([]domain.User, error) {
\tconst key = "users:list"
\tif cached, ok := s.cache.Get(ctx, key); ok {
\t\tvar items []domain.User
\t\tif err := json.Unmarshal(cached, &items); err == nil {
\t\t\ts.logger.Debug(ctx, "user list cache hit", map[string]string{"key": key})
\t\t\treturn items, nil
\t\t}
\t}

\titems, err := s.repository.List(ctx)
\tif err != nil {
\t\treturn nil, err
\t}
\tif encoded, err := json.Marshal(items); err == nil {
\t\ts.cache.Set(ctx, key, encoded, 30*time.Second)
\t}
\treturn items, nil
}

func (s *Service) Get(ctx context.Context, id string) (domain.User, error) {
\treturn s.repository.FindByID(ctx, id)
}

func (s *Service) Update(ctx context.Context, id string, input domain.UpdateInput) (domain.User, error) {
\tcurrent, err := s.repository.FindByID(ctx, id)
\tif err != nil {
\t\treturn domain.User{}, err
\t}

\tnext, err := current.Apply(input, s.now().UTC())
\tif err != nil {
\t\treturn domain.User{}, err
\t}
\tupdated, err := s.repository.Update(ctx, next)
\tif err != nil {
\t\treturn domain.User{}, err
\t}
\ts.afterUserChanged(ctx, "user.updated", updated)
\treturn updated, nil
}

func (s *Service) Delete(ctx context.Context, id string) error {
\tif err := s.repository.Delete(ctx, id); err != nil {
\t\treturn err
\t}
\ts.cache.Delete(ctx, "users:list")
\ts.events.Publish(ctx, queue.Event{Subject: "user.deleted", Payload: map[string]string{"id": id}})
\ts.logger.Info(ctx, "user deleted", map[string]string{"id": id})
\treturn nil
}

func (s *Service) afterUserChanged(ctx context.Context, subject string, entity domain.User) {
\ts.cache.Delete(ctx, "users:list")
\ts.events.Publish(ctx, queue.Event{Subject: subject, Payload: entity})
\ts.notifier.Send(ctx, notification.Message{
\t\tRecipient: entity.Email,
\t\tTitle:     "User profile changed",
\t\tBody:      "The demo user record has been updated.",
\t})
\ts.logger.Info(ctx, subject, map[string]string{"user_id": entity.ID, "email": entity.Email})
}
`;
}

function backendRestResponse() {
  return `package controllers

import (
\t"encoding/json"
\t"net/http"
)

type response struct {
\tCode    int         \`json:"code"\`
\tMessage string      \`json:"message"\`
\tData    interface{} \`json:"data,omitempty"\`
}

func writeJSON(w http.ResponseWriter, status int, message string, data interface{}) {
\tw.Header().Set("Content-Type", "application/json; charset=utf-8")
\tw.WriteHeader(status)
\t_ = json.NewEncoder(w).Encode(response{
\t\tCode:    status,
\t\tMessage: message,
\t\tData:    data,
\t})
}

func writeError(w http.ResponseWriter, status int, message string) {
\twriteJSON(w, status, message, nil)
}
`;
}

function backendUserHandler(ctx) {
  const mod = moduleName(ctx.projectName);
  return `package controllers

import (
\t"encoding/json"
\t"errors"
\t"net/http"
\t"strings"

\tdomain "${mod}/backend/internal/domain/user"
\t"${mod}/backend/internal/interface/rest/dto/requests"
\t"${mod}/backend/internal/interface/rest/dto/responses"
\tuseruc "${mod}/backend/internal/usecase/user"
)

type UserHandler struct {
\tservice *useruc.Service
}

func NewUserHandler(service *useruc.Service) *UserHandler {
\treturn &UserHandler{service: service}
}

func (h *UserHandler) List(w http.ResponseWriter, r *http.Request) {
\titems, err := h.service.List(r.Context())
\tif err != nil {
\t\twriteError(w, http.StatusInternalServerError, err.Error())
\t\treturn
\t}
\twriteJSON(w, http.StatusOK, "ok", responses.UserListFromDomain(items))
}

func (h *UserHandler) Create(w http.ResponseWriter, r *http.Request) {
\tvar input requests.UserPayload
\tif err := json.NewDecoder(r.Body).Decode(&input); err != nil {
\t\twriteError(w, http.StatusBadRequest, "invalid json body")
\t\treturn
\t}

\tentity, err := h.service.Create(r.Context(), input.ToCreateInput())
\tif err != nil {
\t\thandleUserError(w, err)
\t\treturn
\t}
\twriteJSON(w, http.StatusCreated, "created", responses.UserFromDomain(entity))
}

func (h *UserHandler) Get(w http.ResponseWriter, r *http.Request) {
\tentity, err := h.service.Get(r.Context(), strings.TrimSpace(r.PathValue("id")))
\tif err != nil {
\t\thandleUserError(w, err)
\t\treturn
\t}
\twriteJSON(w, http.StatusOK, "ok", responses.UserFromDomain(entity))
}

func (h *UserHandler) Update(w http.ResponseWriter, r *http.Request) {
\tvar input requests.UserPayload
\tif err := json.NewDecoder(r.Body).Decode(&input); err != nil {
\t\twriteError(w, http.StatusBadRequest, "invalid json body")
\t\treturn
\t}

\tentity, err := h.service.Update(r.Context(), strings.TrimSpace(r.PathValue("id")), input.ToUpdateInput())
\tif err != nil {
\t\thandleUserError(w, err)
\t\treturn
\t}
\twriteJSON(w, http.StatusOK, "updated", responses.UserFromDomain(entity))
}

func (h *UserHandler) Delete(w http.ResponseWriter, r *http.Request) {
\tif err := h.service.Delete(r.Context(), strings.TrimSpace(r.PathValue("id"))); err != nil {
\t\thandleUserError(w, err)
\t\treturn
\t}
\twriteJSON(w, http.StatusOK, "deleted", map[string]string{"id": r.PathValue("id")})
}

func handleUserError(w http.ResponseWriter, err error) {
\tswitch {
\tcase errors.Is(err, domain.ErrNotFound):
\t\twriteError(w, http.StatusNotFound, err.Error())
\tcase errors.Is(err, domain.ErrEmailConflicts):
\t\twriteError(w, http.StatusConflict, err.Error())
\tdefault:
\t\twriteError(w, http.StatusBadRequest, err.Error())
\t}
}
`;
}

function backendUserRequestDTO(ctx) {
  const mod = moduleName(ctx.projectName);
  return `package requests

import domain "${mod}/backend/internal/domain/user"

type UserPayload struct {
\tName   string        \`json:"name"\`
\tEmail  string        \`json:"email"\`
\tRole   string        \`json:"role"\`
\tStatus domain.Status \`json:"status"\`
}

func (p UserPayload) ToCreateInput() domain.CreateInput {
\treturn domain.CreateInput{
\t\tName:   p.Name,
\t\tEmail:  p.Email,
\t\tRole:   p.Role,
\t\tStatus: p.Status,
\t}
}

func (p UserPayload) ToUpdateInput() domain.UpdateInput {
\treturn domain.UpdateInput{
\t\tName:   p.Name,
\t\tEmail:  p.Email,
\t\tRole:   p.Role,
\t\tStatus: p.Status,
\t}
}
`;
}

function backendUserResponseDTO(ctx) {
  const mod = moduleName(ctx.projectName);
  return `package responses

import domain "${mod}/backend/internal/domain/user"

type User struct {
\tID        string        \`json:"id"\`
\tName      string        \`json:"name"\`
\tEmail     string        \`json:"email"\`
\tRole      string        \`json:"role"\`
\tStatus    domain.Status \`json:"status"\`
\tCreatedAt string        \`json:"created_at"\`
\tUpdatedAt string        \`json:"updated_at"\`
}

type UserList struct {
\tItems []User \`json:"items"\`
}

func UserFromDomain(entity domain.User) User {
\treturn User{
\t\tID:        entity.ID,
\t\tName:      entity.Name,
\t\tEmail:     entity.Email,
\t\tRole:      entity.Role,
\t\tStatus:    entity.Status,
\t\tCreatedAt: entity.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
\t\tUpdatedAt: entity.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
\t}
}

func UserListFromDomain(items []domain.User) UserList {
\tresult := UserList{Items: make([]User, 0, len(items))}
\tfor _, item := range items {
\t\tresult.Items = append(result.Items, UserFromDomain(item))
\t}
\treturn result
}
`;
}

function backendCorsMiddleware() {
  return `package middlewares

import "net/http"

func CORS(next http.Handler) http.Handler {
\treturn http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
\t\tw.Header().Set("Access-Control-Allow-Origin", "*")
\t\tw.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
\t\tw.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Trace-ID")
\t\tw.Header().Set("Access-Control-Expose-Headers", "X-Trace-ID")
\t\tif r.Method == http.MethodOptions {
\t\t\tw.WriteHeader(http.StatusNoContent)
\t\t\treturn
\t\t}
\t\tnext.ServeHTTP(w, r)
\t})
}
`;
}

function backendTraceMiddleware() {
  return `package middlewares

import (
\t"context"
\t"crypto/rand"
\t"encoding/hex"
\t"net/http"
)

type traceIDKey struct{}

func Trace(next http.Handler) http.Handler {
\treturn http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
\t\ttraceID := r.Header.Get("X-Trace-ID")
\t\tif traceID == "" {
\t\t\ttraceID = newTraceID()
\t\t}
\t\tw.Header().Set("X-Trace-ID", traceID)
\t\tctx := context.WithValue(r.Context(), traceIDKey{}, traceID)
\t\tnext.ServeHTTP(w, r.WithContext(ctx))
\t})
}

func GetTraceID(ctx context.Context) string {
\tif value, ok := ctx.Value(traceIDKey{}).(string); ok {
\t\treturn value
\t}
\treturn ""
}

func newTraceID() string {
\tbuf := make([]byte, 8)
\tif _, err := rand.Read(buf); err != nil {
\t\treturn "trace-fallback"
\t}
\treturn hex.EncodeToString(buf)
}
`;
}

function backendRequestLogMiddleware(ctx) {
  const mod = moduleName(ctx.projectName);
  return `package middlewares

import (
\t"net/http"
\t"strconv"
\t"time"

\t"${mod}/backend/internal/infrastructure/support/logger"
)

type statusRecorder struct {
\thttp.ResponseWriter
\tstatus int
}

func (r *statusRecorder) WriteHeader(status int) {
\tr.status = status
\tr.ResponseWriter.WriteHeader(status)
}

func RequestLog(log logger.Contract) func(http.Handler) http.Handler {
\treturn func(next http.Handler) http.Handler {
\t\treturn http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
\t\t\tstartedAt := time.Now()
\t\t\trecorder := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
\t\t\tnext.ServeHTTP(recorder, r)
\t\t\tlog.Info(r.Context(), "request completed", map[string]string{
\t\t\t\t"trace_id": GetTraceID(r.Context()),
\t\t\t\t"method":   r.Method,
\t\t\t\t"path":     r.URL.Path,
\t\t\t\t"status":   strconv.Itoa(recorder.status),
\t\t\t\t"latency":  time.Since(startedAt).String(),
\t\t\t})
\t\t})
\t}
}
`;
}

function backendRecoveryMiddleware(ctx) {
  const mod = moduleName(ctx.projectName);
  return `package middlewares

import (
\t"net/http"
\t"runtime/debug"

\t"${mod}/backend/internal/infrastructure/support/logger"
)

func Recovery(log logger.Contract) func(http.Handler) http.Handler {
\treturn func(next http.Handler) http.Handler {
\t\treturn http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
\t\t\tdefer func() {
\t\t\t\tif err := recover(); err != nil {
\t\t\t\t\tlog.Error(r.Context(), "panic recovered", map[string]string{
\t\t\t\t\t\t"trace_id": GetTraceID(r.Context()),
\t\t\t\t\t\t"stack":    string(debug.Stack()),
\t\t\t\t\t})
\t\t\t\t\thttp.Error(w, "internal server error", http.StatusInternalServerError)
\t\t\t\t}
\t\t\t}()
\t\t\tnext.ServeHTTP(w, r)
\t\t})
\t}
}
`;
}

function backendRouter(ctx) {
  const mod = moduleName(ctx.projectName);
  return `package router

import (
\t"net/http"

\t"${mod}/backend/internal/infrastructure/support/logger"
\t"${mod}/backend/internal/interface/rest/controllers"
\t"${mod}/backend/internal/interface/rest/middlewares"
\t"${mod}/backend/internal/interface/rest/router/routes"
)

type Controllers struct {
\tUsers *controllers.UserHandler
}

func SetupRouter(ctrl Controllers, log logger.Contract) http.Handler {
\tmux := http.NewServeMux()
\tmux.HandleFunc("GET /api/v1/health", func(w http.ResponseWriter, r *http.Request) {
\t\tw.Header().Set("Content-Type", "application/json; charset=utf-8")
\t\t_, _ = w.Write([]byte(\`{"code":200,"message":"ok","data":{"service":"demo-backend"}}\`))
\t})
\troutes.RegisterUserRoutes(mux, ctrl.Users)

\tvar handler http.Handler = mux
\thandler = middlewares.Recovery(log)(handler)
\thandler = middlewares.RequestLog(log)(handler)
\thandler = middlewares.Trace(handler)
\thandler = middlewares.CORS(handler)
\treturn handler
}
`;
}

function backendUserRoutes(ctx) {
  const mod = moduleName(ctx.projectName);
  return `package routes

import (
\t"net/http"

\t"${mod}/backend/internal/interface/rest/controllers"
)

func RegisterUserRoutes(mux *http.ServeMux, users *controllers.UserHandler) {
\tmux.HandleFunc("GET /api/v1/users", users.List)
\tmux.HandleFunc("POST /api/v1/users", users.Create)
\tmux.HandleFunc("GET /api/v1/users/{id}", users.Get)
\tmux.HandleFunc("PUT /api/v1/users/{id}", users.Update)
\tmux.HandleFunc("DELETE /api/v1/users/{id}", users.Delete)
}
`;
}

function backendMemoryUserRepository(ctx) {
  const mod = moduleName(ctx.projectName);
  return `package repository

import (
\t"context"
\t"fmt"
\t"sort"
\t"strings"
\t"sync"

\tdomain "${mod}/backend/internal/domain/user"
)

type UserRepository struct {
\tmu       sync.RWMutex
\tsequence int
\titems    map[string]domain.User
}

func NewUserRepository() *UserRepository {
\treturn &UserRepository{
\t\titems: make(map[string]domain.User),
\t}
}

func (r *UserRepository) NextID(context.Context) (string, error) {
\tr.mu.Lock()
\tdefer r.mu.Unlock()
\tr.sequence += 1
\treturn fmt.Sprintf("usr_%04d", r.sequence), nil
}

func (r *UserRepository) Create(_ context.Context, entity domain.User) (domain.User, error) {
\tr.mu.Lock()
\tdefer r.mu.Unlock()
\tif r.emailExists(entity.Email, entity.ID) {
\t\treturn domain.User{}, domain.ErrEmailConflicts
\t}
\tr.items[entity.ID] = entity
\treturn entity, nil
}

func (r *UserRepository) List(context.Context) ([]domain.User, error) {
\tr.mu.RLock()
\tdefer r.mu.RUnlock()

\titems := make([]domain.User, 0, len(r.items))
\tfor _, item := range r.items {
\t\titems = append(items, item)
\t}
\tsort.Slice(items, func(i, j int) bool {
\t\treturn items[i].CreatedAt.Before(items[j].CreatedAt)
\t})
\treturn items, nil
}

func (r *UserRepository) FindByID(_ context.Context, id string) (domain.User, error) {
\tr.mu.RLock()
\tdefer r.mu.RUnlock()
\titem, ok := r.items[id]
\tif !ok {
\t\treturn domain.User{}, domain.ErrNotFound
\t}
\treturn item, nil
}

func (r *UserRepository) Update(_ context.Context, entity domain.User) (domain.User, error) {
\tr.mu.Lock()
\tdefer r.mu.Unlock()
\tif _, ok := r.items[entity.ID]; !ok {
\t\treturn domain.User{}, domain.ErrNotFound
\t}
\tif r.emailExists(entity.Email, entity.ID) {
\t\treturn domain.User{}, domain.ErrEmailConflicts
\t}
\tr.items[entity.ID] = entity
\treturn entity, nil
}

func (r *UserRepository) Delete(_ context.Context, id string) error {
\tr.mu.Lock()
\tdefer r.mu.Unlock()
\tif _, ok := r.items[id]; !ok {
\t\treturn domain.ErrNotFound
\t}
\tdelete(r.items, id)
\treturn nil
}

func (r *UserRepository) emailExists(email string, exceptID string) bool {
\tfor _, item := range r.items {
\t\tif item.ID != exceptID && strings.EqualFold(item.Email, email) {
\t\t\treturn true
\t\t}
\t}
\treturn false
}
`;
}

function backendNotificationContract() {
  return `package notification

import "context"

type Message struct {
\tRecipient string \`json:"recipient"\`
\tTitle     string \`json:"title"\`
\tBody      string \`json:"body"\`
}

type Contract interface {
\tSend(ctx context.Context, message Message) error
}
`;
}

function backendMemoryNotifier(ctx) {
  const mod = moduleName(ctx.projectName);
  return `package memory

import (
\t"context"

\t"${mod}/backend/internal/infrastructure/gateways/notification"
\t"${mod}/backend/internal/infrastructure/support/logger"
)

type Notifier struct {
\tlogger logger.Contract
}

func NewNotifier(logger logger.Contract) *Notifier {
\treturn &Notifier{logger: logger}
}

func (n *Notifier) Send(ctx context.Context, message notification.Message) error {
\tn.logger.Info(ctx, "notification queued", map[string]string{
\t\t"recipient": message.Recipient,
\t\t"title":     message.Title,
\t})
\treturn nil
}
`;
}

function backendQueueContract() {
  return `package queue

import "context"

type Event struct {
\tSubject string      \`json:"subject"\`
\tPayload interface{} \`json:"payload"\`
}

type Contract interface {
\tPublish(ctx context.Context, event Event) error
\tPublished(ctx context.Context) []Event
}
`;
}

function backendMemoryEventBus(ctx) {
  const mod = moduleName(ctx.projectName);
  return `package memory

import (
\t"context"
\t"sync"

\t"${mod}/backend/internal/infrastructure/gateways/queue"
)

type EventBus struct {
\tmu     sync.RWMutex
\tevents []queue.Event
}

func NewEventBus() *EventBus {
\treturn &EventBus{}
}

func (b *EventBus) Publish(_ context.Context, event queue.Event) error {
\tb.mu.Lock()
\tdefer b.mu.Unlock()
\tb.events = append(b.events, event)
\treturn nil
}

func (b *EventBus) Published(context.Context) []queue.Event {
\tb.mu.RLock()
\tdefer b.mu.RUnlock()
\titems := make([]queue.Event, len(b.events))
\tcopy(items, b.events)
\treturn items
}
`;
}

function backendCacheContract() {
  return `package cache

import (
\t"context"
\t"time"
)

type Contract interface {
\tSet(ctx context.Context, key string, value []byte, ttl time.Duration)
\tGet(ctx context.Context, key string) ([]byte, bool)
\tDelete(ctx context.Context, keys ...string)
}
`;
}

function backendMemoryCache() {
  return `package memory

import (
\t"context"
\t"sync"
\t"time"
)

type item struct {
\tvalue     []byte
\texpiresAt time.Time
}

type Cache struct {
\tmu    sync.RWMutex
\titems map[string]item
}

func NewCache() *Cache {
\treturn &Cache{items: make(map[string]item)}
}

func (c *Cache) Set(_ context.Context, key string, value []byte, ttl time.Duration) {
\tc.mu.Lock()
\tdefer c.mu.Unlock()
\tc.items[key] = item{value: append([]byte(nil), value...), expiresAt: time.Now().Add(ttl)}
}

func (c *Cache) Get(_ context.Context, key string) ([]byte, bool) {
\tc.mu.RLock()
\titem, ok := c.items[key]
\tc.mu.RUnlock()
\tif !ok {
\t\treturn nil, false
\t}
\tif !item.expiresAt.IsZero() && time.Now().After(item.expiresAt) {
\t\tc.Delete(context.Background(), key)
\t\treturn nil, false
\t}
\treturn append([]byte(nil), item.value...), true
}

func (c *Cache) Delete(_ context.Context, keys ...string) {
\tc.mu.Lock()
\tdefer c.mu.Unlock()
\tfor _, key := range keys {
\t\tdelete(c.items, key)
\t}
}
`;
}

function backendLoggerContract() {
  return `package logger

import "context"

type Contract interface {
\tDebug(ctx context.Context, message string, fields map[string]string)
\tInfo(ctx context.Context, message string, fields map[string]string)
\tError(ctx context.Context, message string, fields map[string]string)
}
`;
}

function backendStdLogger() {
  return `package std

import (
\t"context"
\t"log"
\t"sort"
\t"strings"
)

type Logger struct{}

func NewLogger() *Logger {
\treturn &Logger{}
}

func (l *Logger) Debug(ctx context.Context, message string, fields map[string]string) {
\tl.write("DEBUG", message, fields)
}

func (l *Logger) Info(ctx context.Context, message string, fields map[string]string) {
\tl.write("INFO", message, fields)
}

func (l *Logger) Error(ctx context.Context, message string, fields map[string]string) {
\tl.write("ERROR", message, fields)
}

func (l *Logger) write(level string, message string, fields map[string]string) {
\tparts := make([]string, 0, len(fields))
\tfor key, value := range fields {
\t\tparts = append(parts, key+"="+value)
\t}
\tsort.Strings(parts)
\tif len(parts) > 0 {
\t\tlog.Printf("%s %s %s", level, message, strings.Join(parts, " "))
\t\treturn
\t}
\tlog.Printf("%s %s", level, message)
}
`;
}

function backendWireApp(ctx) {
  const mod = moduleName(ctx.projectName);
  return `package wire

import (
\t"net/http"

\t"${mod}/backend/internal/interface/rest/router"
)

type App struct {
\tInfrastructure *Infrastructure
\tRepositories   *Repositories
\tUseCases       *UseCases
\tControllers    *Controllers
\tRouter         http.Handler
}

func NewApp() *App {
\tinfra := InitInfrastructure()
\trepos := InitRepositories()
\tuseCases := InitUseCases(repos, infra)
\tcontrollers := InitControllers(useCases)
\thandler := router.SetupRouter(router.Controllers{Users: controllers.Users}, infra.Logger)
\treturn &App{
\t\tInfrastructure: infra,
\t\tRepositories:   repos,
\t\tUseCases:       useCases,
\t\tControllers:    controllers,
\t\tRouter:         handler,
\t}
}
`;
}

function backendWireInfrastructure(ctx) {
  const mod = moduleName(ctx.projectName);
  return `package wire

import (
\tnotificationmem "${mod}/backend/internal/infrastructure/gateways/notification/memory"
\tqueuemem "${mod}/backend/internal/infrastructure/gateways/queue/memory"
\t"${mod}/backend/internal/infrastructure/gateways/notification"
\t"${mod}/backend/internal/infrastructure/gateways/queue"
\t"${mod}/backend/internal/infrastructure/support/cache"
\tcachemem "${mod}/backend/internal/infrastructure/support/cache/memory"
\t"${mod}/backend/internal/infrastructure/support/logger"
\tloggermem "${mod}/backend/internal/infrastructure/support/logger/std"
)

type Infrastructure struct {
\tLogger       logger.Contract
\tCache        cache.Contract
\tEventBus     queue.Contract
\tNotification notification.Contract
}

func InitInfrastructure() *Infrastructure {
\tlog := loggermem.NewLogger()
\treturn &Infrastructure{
\t\tLogger:       log,
\t\tCache:        cachemem.NewCache(),
\t\tEventBus:     queuemem.NewEventBus(),
\t\tNotification: notificationmem.NewNotifier(log),
\t}
}
`;
}

function backendWireRepositories(ctx) {
  const mod = moduleName(ctx.projectName);
  return `package wire

import (
\tdomain "${mod}/backend/internal/domain/user"
\trepositorymem "${mod}/backend/internal/infrastructure/gateways/persistence/memory/repository"
)

type Repositories struct {
\tUsers domain.Repository
}

func InitRepositories() *Repositories {
\treturn &Repositories{
\t\tUsers: repositorymem.NewUserRepository(),
\t}
}
`;
}

function backendWireUsecases(ctx) {
  const mod = moduleName(ctx.projectName);
  return `package wire

import useruc "${mod}/backend/internal/usecase/user"

type UseCases struct {
\tUsers *useruc.Service
}

func InitUseCases(repos *Repositories, infra *Infrastructure) *UseCases {
\treturn &UseCases{
\t\tUsers: useruc.NewService(repos.Users, infra.Cache, infra.EventBus, infra.Notification, infra.Logger),
\t}
}
`;
}

function backendWireControllers(ctx) {
  const mod = moduleName(ctx.projectName);
  return `package wire

import "${mod}/backend/internal/interface/rest/controllers"

type Controllers struct {
\tUsers *controllers.UserHandler
}

func InitControllers(useCases *UseCases) *Controllers {
\treturn &Controllers{
\t\tUsers: controllers.NewUserHandler(useCases.Users),
\t}
}
`;
}

function backendUsersMigration() {
  return `CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_users_status ON users(status);
`;
}

function adminPackageJson(ctx) {
  return `{
  "name": "${packageName(ctx.projectName)}-admin-web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "vue-tsc --noEmit && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@vitejs/plugin-vue": "^5.2.4",
    "pinia": "^2.3.1",
    "vite": "^5.4.19",
    "vue": "^3.5.13",
    "vue-router": "^4.5.0"
  },
  "devDependencies": {
    "typescript": "^5.8.3",
    "vue-tsc": "^2.2.10"
  }
}
`;
}

function adminPnpmWorkspace() {
  return `packages:
  - "."

onlyBuiltDependencies:
  - esbuild
  - vue-demi
`;
}

function adminIndexHtml(ctx) {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${ctx.projectTitle} Admin</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`;
}

function adminViteConfig() {
  return `import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8080",
    },
  },
});
`;
}

function adminTsconfig() {
  return `{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "jsx": "preserve",
    "sourceMap": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts", "src/**/*.vue"]
}
`;
}

function adminMainTs() {
  return `import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { router } from "./router";

createApp(App).use(createPinia()).use(router).mount("#app");
`;
}

function adminAppVue(ctx) {
  return `<template>
  <main class="shell">
    <aside class="sidebar">
      <strong>${ctx.projectTitle}</strong>
      <RouterLink to="/users">用户管理</RouterLink>
    </aside>
    <section class="content">
      <RouterView />
    </section>
  </main>
</template>

<style scoped>
.shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 220px 1fr;
  background: #f6f8fb;
  color: #1f2937;
  font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif;
}
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  background: #0f172a;
  color: #fff;
}
.sidebar a {
  color: #dbeafe;
  text-decoration: none;
}
.content {
  padding: 28px;
}
@media (max-width: 760px) {
  .shell {
    grid-template-columns: 1fr;
  }
  .sidebar {
    flex-direction: row;
    align-items: center;
  }
}
</style>
`;
}

function adminHttpApi() {
  return `const API_BASE = import.meta.env.VITE_API_BASE || "/api/v1";

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(\`\${API_BASE}\${path}\`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });
  const payload = (await response.json()) as ApiResponse<T>;
  if (!response.ok) {
    throw new Error(payload.message || "request failed");
  }
  return payload.data;
}
`;
}

function adminUsersApi() {
  return `import { request } from "./http";

export type UserStatus = "active" | "disabled";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface UserPayload {
  name: string;
  email: string;
  role: string;
  status: UserStatus;
}

export function listUsers() {
  return request<{ items: User[] }>("/users");
}

export function createUser(payload: UserPayload) {
  return request<User>("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateUser(id: string, payload: UserPayload) {
  return request<User>(\`/users/\${id}\`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteUser(id: string) {
  return request<{ id: string }>(\`/users/\${id}\`, {
    method: "DELETE",
  });
}
`;
}

function adminUserStore() {
  return `import { defineStore } from "pinia";
import { createUser, deleteUser, listUsers, updateUser, type User, type UserPayload } from "../api/users";

export const useUserStore = defineStore("users", {
  state: () => ({
    items: [] as User[],
    loading: false,
    error: "",
  }),
  actions: {
    async fetchUsers() {
      this.loading = true;
      this.error = "";
      try {
        const result = await listUsers();
        this.items = result.items;
      } catch (error) {
        this.error = error instanceof Error ? error.message : "加载用户失败";
      } finally {
        this.loading = false;
      }
    },
    async create(payload: UserPayload) {
      await createUser(payload);
      await this.fetchUsers();
    },
    async update(id: string, payload: UserPayload) {
      await updateUser(id, payload);
      await this.fetchUsers();
    },
    async remove(id: string) {
      await deleteUser(id);
      await this.fetchUsers();
    },
  },
});
`;
}

function adminRouter() {
  return `import { createRouter, createWebHistory } from "vue-router";
import UserManagement from "../views/users/UserManagement.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/users" },
    {
      path: "/users",
      name: "UserManagement",
      component: UserManagement,
      meta: {
        title: "用户管理",
      },
    },
  ],
});
`;
}

function adminUserManagementVue() {
  return `<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useUserStore } from "../../store/userStore";
import type { User, UserPayload, UserStatus } from "../../api/users";

const store = useUserStore();
const editingId = ref<string | null>(null);
const form = reactive<UserPayload>({
  name: "",
  email: "",
  role: "operator",
  status: "active",
});

const isEditing = computed(() => Boolean(editingId.value));

onMounted(() => {
  store.fetchUsers();
});

function resetForm() {
  editingId.value = null;
  form.name = "";
  form.email = "";
  form.role = "operator";
  form.status = "active";
}

function editUser(user: User) {
  editingId.value = user.id;
  form.name = user.name;
  form.email = user.email;
  form.role = user.role;
  form.status = user.status;
}

async function submit() {
  if (editingId.value) {
    await store.update(editingId.value, { ...form });
  } else {
    await store.create({ ...form });
  }
  resetForm();
}

function statusText(status: UserStatus) {
  return status === "active" ? "启用" : "禁用";
}
</script>

<template>
  <section class="page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Admin / Users</p>
        <h1>用户管理</h1>
      </div>
      <button type="button" class="ghost" @click="store.fetchUsers">刷新</button>
    </header>

    <form class="panel form" @submit.prevent="submit">
      <label>
        姓名
        <input v-model="form.name" required placeholder="Demo User" />
      </label>
      <label>
        邮箱
        <input v-model="form.email" required type="email" placeholder="demo@example.com" />
      </label>
      <label>
        角色
        <input v-model="form.role" required placeholder="operator" />
      </label>
      <label>
        状态
        <select v-model="form.status">
          <option value="active">启用</option>
          <option value="disabled">禁用</option>
        </select>
      </label>
      <div class="actions">
        <button type="submit">{{ isEditing ? "保存用户" : "创建用户" }}</button>
        <button type="button" class="ghost" @click="resetForm">重置</button>
      </div>
    </form>

    <p v-if="store.error" class="error">{{ store.error }}</p>

    <section class="panel">
      <table>
        <thead>
          <tr>
            <th>姓名</th>
            <th>邮箱</th>
            <th>角色</th>
            <th>状态</th>
            <th>更新时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="store.loading">
            <td colspan="6">加载中...</td>
          </tr>
          <tr v-else-if="store.items.length === 0">
            <td colspan="6">暂无用户</td>
          </tr>
          <tr v-for="user in store.items" :key="user.id">
            <td>{{ user.name }}</td>
            <td>{{ user.email }}</td>
            <td>{{ user.role }}</td>
            <td><span class="status">{{ statusText(user.status) }}</span></td>
            <td>{{ new Date(user.updated_at).toLocaleString() }}</td>
            <td class="row-actions">
              <button type="button" class="ghost" @click="editUser(user)">编辑</button>
              <button type="button" class="danger" @click="store.remove(user.id)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </section>
</template>

<style scoped>
.page {
  display: grid;
  gap: 20px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
.eyebrow {
  margin: 0 0 4px;
  color: #64748b;
  font-size: 13px;
}
h1 {
  margin: 0;
  font-size: 26px;
}
.panel {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 18px;
}
.form {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr)) auto;
  gap: 14px;
  align-items: end;
}
label {
  display: grid;
  gap: 6px;
  color: #475569;
  font-size: 13px;
}
input,
select {
  height: 38px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 0 10px;
  font: inherit;
}
button {
  height: 38px;
  border: 0;
  border-radius: 6px;
  padding: 0 14px;
  background: #2563eb;
  color: #fff;
  cursor: pointer;
}
.ghost {
  background: #e2e8f0;
  color: #1f2937;
}
.danger {
  background: #dc2626;
}
.actions,
.row-actions {
  display: flex;
  gap: 8px;
}
.error {
  margin: 0;
  color: #b91c1c;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
  padding: 12px 10px;
}
th {
  color: #475569;
  font-size: 13px;
}
.status {
  display: inline-flex;
  border-radius: 999px;
  background: #dcfce7;
  color: #166534;
  padding: 3px 9px;
  font-size: 12px;
}
@media (max-width: 980px) {
  .form {
    grid-template-columns: 1fr;
  }
}
</style>
`;
}

function miniprogramFolderIndex() {
  return `# front/miniprogram 文件夹索引

## 架构说明

\`front/miniprogram\` 是移动端小程序模块，按原生小程序目录组织。

## 文件清单（核心）

### \`miniprogram/app.ts\`
- 地位: 小程序应用入口
- 功能: 初始化全局状态、登录态和运行时配置

### \`miniprogram/pages/\`
- 地位: 页面层
- 功能: 按移动端业务场景组织首页、扫码、活动、个人中心等页面

---
自指声明: 当小程序目录结构或页面职责变化时，请更新本索引。
`;
}

function miniprogramCodemap() {
  return `# front/miniprogram/

## Responsibility

面向移动端用户提供高频业务入口。

## Design

- \`miniprogram/app.ts\`: 应用入口。
- \`miniprogram/pages/\`: 页面。
- 可按需要扩展 \`components/\`、\`services/\`、\`stores/\`。
`;
}

function docsCodemap() {
  return `# docs/

## Responsibility

沉淀需求、架构、权限、业务流、数据模型、API 和运维文档。

## Design

文档按生命周期组织，从业务需求到接口契约，再到部署运维。
`;
}

function userBusinessFlowDoc() {
  return `# 业务流设计

## 用户 CRUD 示例流

### 创建用户

1. 管理员在 \`front/admin/web/src/views/users/UserManagement.vue\` 填写用户表单。
2. 页面调用 \`src/store/userStore.ts\` 的 \`create(...)\` action。
3. Store 调用 \`src/api/users.ts#createUser\` 发起 \`POST /api/v1/users\`。
4. 后端请求先经过 \`internal/interface/rest/middlewares\`，再由 \`router/routes\` 分发到 \`controllers.UserHandler\`。
5. \`internal/usecase/user.Service\` 创建领域实体并调用仓储。
6. \`internal/infrastructure/gateways/persistence/memory/repository.UserRepository\` 保存用户并返回结果。
7. 用例层清理 \`support/cache\` 中的用户列表缓存，并通过 \`gateways/queue\` 记录领域事件。
8. \`gateways/notification\` 发送用户变更通知，\`support/logger\` 记录结构化日志。

### 更新和删除用户

- 更新走 \`PUT /api/v1/users/{id}\`，先读取当前实体，再应用领域校验。
- 删除走 \`DELETE /api/v1/users/{id}\`，仓储负责确认目标存在。
- 邮箱唯一性由持久化网关实现约束，领域层负责字段合法性。
- 列表读取会先查 \`support/cache\`，写操作会主动失效缓存。
`;
}

function userDataModelDoc() {
  return `# 数据模型

## users

| 字段 | 类型 | 说明 |
|------|------|------|
| \`id\` | string | 用户 ID，demo 中形如 \`usr_0001\` |
| \`name\` | string | 用户姓名 |
| \`email\` | string | 邮箱，唯一 |
| \`role\` | string | 角色编码，如 \`operator\`、\`admin\` |
| \`status\` | enum | \`active\` 或 \`disabled\` |
| \`created_at\` | timestamp | 创建时间 |
| \`updated_at\` | timestamp | 更新时间 |

SQL 示例见 \`backend/migrations/up/000001_init_users.sql\`。
`;
}

function userApiDoc() {
  return `# API 文档

## 用户管理

基础路径：\`/api/v1/users\`

### 列表

\`\`\`http
GET /api/v1/users
\`\`\`

响应：

\`\`\`json
{
  "code": 200,
  "message": "ok",
  "data": {
    "items": []
  }
}
\`\`\`

### 创建

\`\`\`http
POST /api/v1/users
Content-Type: application/json

{
  "name": "Demo User",
  "email": "demo@example.com",
  "role": "operator",
  "status": "active"
}
\`\`\`

### 详情

\`\`\`http
GET /api/v1/users/usr_0001
\`\`\`

### 更新

\`\`\`http
PUT /api/v1/users/usr_0001
Content-Type: application/json

{
  "name": "Demo Admin",
  "email": "admin@example.com",
  "role": "admin",
  "status": "active"
}
\`\`\`

### 删除

\`\`\`http
DELETE /api/v1/users/usr_0001
\`\`\`

## 本地验证

\`\`\`bash
make dev-backend
make verify-user-crud
\`\`\`
`;
}

function opsCodemap() {
  return `# ops/

## Responsibility

承载部署、恢复和云端辅助服务。

## Design

- \`deploy/\`: 一键部署向导。
- \`recovery/\`: 恢复和卸载工具。
- \`cloud/\`: 文档站和发布 API。
`;
}

function opsToolFolderIndex(modulePath, name, codeDir, secondaryDir) {
  return `# ${modulePath} 文件夹索引

## 架构说明

\`${modulePath}\` 是${name}模块，核心逻辑位于 \`${codeDir}\`，辅助资源位于 \`${secondaryDir}\`。

## 文件清单（核心）

### \`${codeDir}\`
- 地位: 工具主逻辑
- 功能: 命令入口、流程编排、系统检查和错误处理

### \`${secondaryDir}\`
- 地位: 辅助资源
- 功能: UI、构建产物或运行时资源

---
自指声明: 当 \`${modulePath}\` 的工具职责或目录结构变化时，请更新本索引。
`;
}

function opsToolCodemap(modulePath, title) {
  return `# ${modulePath}/

## Responsibility

${title} 负责交付链路中的一个独立运维能力。

## Design

保持命令入口、流程编排、系统依赖和 UI/资源清晰分层。
`;
}

function cloudFolderIndex() {
  return `# ops/cloud 文件夹索引

## 架构说明

\`ops/cloud\` 承载云端文档和发布辅助服务。

## 文件清单（核心）

### \`docs-site/\`
- 地位: 文档站
- 功能: 对外展示安装说明、用户手册和版本说明

### \`release-api/\`
- 地位: 发布 API
- 功能: 提供版本元数据、下载地址和远端校验入口
`;
}

function cloudCodemap() {
  return `# ops/cloud/

## Responsibility

提供云端文档站、发布 API 和分发辅助能力。
`;
}

function tasksTodo(ctx) {
  return `# Tasks

## ${ctx.generatedAt} Demo init

- [x] 生成 VOMS 风格 demo 架构骨架
- [x] 生成根级与模块级架构说明
- [ ] 替换占位代码为真实业务实现
- [ ] 按团队技术栈补齐实际构建门禁
`;
}

function layerReadme(title, description) {
  return `# ${title}

${description}
`;
}

function docSection(title, description) {
  return `# ${title}

${description}
`;
}

function goMain(name) {
  return `package main

import "fmt"

func main() {
\tfmt.Println("demo ${name}")
}
`;
}

function vueMain(name) {
  return `console.log("demo ${name} app entry");
`;
}

function rustMain(name) {
  return `fn main() {
    println!("demo ${name} tool");
}
`;
}

function toTitle(value) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function moduleName(projectName) {
  return `example.com/${packageName(projectName)}`;
}

function packageName(projectName) {
  return projectName
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "voms-architecture-demo";
}

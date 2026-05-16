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
  node tools/voms-demo-init.mjs [name] [--dir <path>] [--title <title>] [--force]

Examples:
  node tools/voms-demo-init.mjs
  node tools/voms-demo-init.mjs volunteer-platform-demo
  node tools/voms-demo-init.mjs --dir ../my-demo --title "My Platform"

This creates a VOMS-style architecture demo skeleton:
  backend/                  Go service boundary
  front/admin/web/          Admin Web boundary
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
    "backend/internal/usecase",
    "backend/internal/interface/rest",
    "backend/internal/infrastructure",
    "backend/internal/wire",
    "backend/migrations/up",
    "front/admin/web/src/api",
    "front/admin/web/src/components",
    "front/admin/web/src/router",
    "front/admin/web/src/store",
    "front/admin/web/src/views",
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
    "backend/cmd/server/main.go": goMain("server"),
    "backend/cmd/workers/consumer/main.go": goMain("consumer worker"),
    "backend/cmd/workers/scheduler/main.go": goMain("scheduler worker"),
    "backend/configs/app.example.yaml": "app:\n  name: demo-service\n  env: local\n",
    "backend/internal/domain/README.md": layerReadme("领域层", "实体、值对象、领域规则和仓储接口定义。"),
    "backend/internal/usecase/README.md": layerReadme("应用服务层", "编排业务流程、事务边界和跨领域协作。"),
    "backend/internal/interface/rest/README.md": layerReadme("接口适配层", "HTTP 路由、请求绑定、响应封装和协议转换。"),
    "backend/internal/infrastructure/README.md": layerReadme("基础设施层", "数据库、缓存、消息、文件、外部服务和可观测实现。"),
    "backend/internal/wire/README.md": layerReadme("组装层", "依赖注入、生命周期管理和应用装配。"),
    "backend/migrations/up/000001_init.sql": "-- Initial database schema goes here.\n",
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
    "front/admin/web/src/main.ts": vueMain("admin"),
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
    "docs/04-business-flows/README.md": docSection("业务流设计", "记录端到端流程、状态机和异常分支。"),
    "docs/05-data-model/README.md": docSection("数据模型", "记录核心实体、关系、索引和迁移策略。"),
    "docs/06-api/README.md": docSection("API 文档", "记录后端契约、请求响应、错误码和兼容策略。"),
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

这是一个 VOMS 风格的架构 demo 项目。它保留清晰的 monorepo 分层、模块入口文档、文件夹索引和架构地图，但不绑定具体业务实现。

## 快速入口

\`\`\`bash
make help
make tree
\`\`\`

## 生成目标

- 用根级 \`AGENTS.md\` 说明全局架构、模块职责、启动和测试入口。
- 用每个模块的 \`AGENTS.md\` 说明协作入口、当前门禁和适用范围。
- 用 \`FOLDER_INDEX.md\` 描述文件夹层次、依赖方向和维护规则。
- 用 \`codemap.md\` 描述模块的 Responsibility、Design、Flow、Integration。

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
  return `.PHONY: help tree build-backend build-front-admin build-front-public check-miniprogram build-deploy build-recovery build-cloud docs-check build-all

.DEFAULT_GOAL := help

help:
\t@echo "Demo architecture commands:"
\t@echo "  make tree              - show top-level architecture tree"
\t@echo "  make build-backend     - placeholder backend gate"
\t@echo "  make build-front-admin - placeholder admin web gate"
\t@echo "  make build-front-public - placeholder public web gate"
\t@echo "  make check-miniprogram - placeholder mini program gate"
\t@echo "  make build-deploy      - placeholder deploy tool gate"
\t@echo "  make build-recovery    - placeholder recovery tool gate"
\t@echo "  make docs-check        - placeholder docs gate"
\t@echo "  make build-all         - run all placeholders"

tree:
\t@find . -maxdepth 4 -type d | sort | sed 's#^./##'

build-backend:
\t@echo "backend gate placeholder: cd backend && go test ./..."

build-front-admin:
\t@echo "admin web gate placeholder: cd front/admin/web && pnpm build"

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

### \`internal/usecase/\`
- 地位: 应用服务层
- 功能: 编排业务流程与事务边界

### \`internal/interface/\`
- 地位: 接口适配层
- 功能: HTTP/gRPC 协议适配、参数绑定与响应封装

### \`internal/infrastructure/\`
- 地位: 基础设施实现层
- 功能: 数据库、缓存、消息、日志、可观测等技术实现

### \`internal/wire/\`
- 地位: 组装层
- 功能: 应用依赖注入与生命周期管理

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

提供系统 API、领域核心、异步任务、权限与基础设施适配。

## Design

- \`cmd/\`: 进程入口。
- \`internal/domain/\`: 领域实体和业务规则。
- \`internal/usecase/\`: 应用服务和事务边界。
- \`internal/interface/\`: 协议适配。
- \`internal/infrastructure/\`: 外部技术实现。
- \`internal/wire/\`: 依赖组装。

## Flow

请求进入接口层，接口层调用用例层，用例层围绕领域对象执行业务规则，并通过基础设施层完成持久化、缓存、消息和外部调用。
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

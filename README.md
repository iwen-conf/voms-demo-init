# voms-demo-init

Generate a VOMS-style full-stack monorepo demo with a user CRUD vertical slice.

The generated project keeps the architecture documentation style from VOMS:

- root `AGENTS.md`, `CLAUDE.md`, `codemap.md`, `README.md`, `Makefile`
- backend layered boundaries: `cmd`, `domain`, `usecase`, `interface`, `infrastructure`, `wire`
- admin Web, public Web, and mini program frontend boundaries
- docs sections for requirements, architecture, permissions, flows, data model, API, and operations
- ops boundaries for deploy, recovery, and cloud publishing
- runnable Go backend user CRUD API: `GET/POST/PUT/DELETE /api/v1/users`
- admin Web user management page, API client, Pinia store, and route
- API, data model, and business-flow documentation for the CRUD slice

## Install

### Homebrew

```bash
brew tap iwen-conf/voms-demo-init
brew install voms-demo-init
```

### npm

```bash
npm install -g voms-demo-init
```

### Direct

```bash
npx voms-demo-init my-demo
```

## Usage

```bash
voms-demo-init
voms-demo-init my-platform-demo
voms-demo-init --dir ../my-platform-demo --title "My Platform"
voms-demo-init my-platform-demo --force
```

Default output:

```bash
dist/demo/voms-architecture-demo
```

After generation:

```bash
cd dist/demo/voms-architecture-demo
make help
make dev-backend
open AGENTS.md
```

## Options

| Option | Description |
|--------|-------------|
| `[name]` | Project name. Defaults to `voms-architecture-demo`. |
| `--name <name>` | Explicit project name. |
| `--dir <path>` | Output directory. Defaults to `dist/demo/<name>`. |
| `--title <title>` | Human-readable title used in generated docs. |
| `--force` | Allow writing into an existing target directory. |
| `--help` | Show CLI help. |

## Development

```bash
npm run check
npm run smoke
```

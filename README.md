<div align="center">

# 🗄️ NexQL

### *Universal SQL Database Management for VS Code*

[![Version](https://img.shields.io/visual-studio-marketplace/v/ric-v.nexql?style=for-the-badge&logo=visual-studio-code&logoColor=white&color=0066CC)](https://marketplace.visualstudio.com/items?itemName=ric-v.nexql)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/ric-v.nexql?style=for-the-badge&logo=visual-studio-code&logoColor=white&color=2ECC71)](https://marketplace.visualstudio.com/items?itemName=ric-v.nexql)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/ric-v.nexql?style=for-the-badge&logo=visual-studio-code&logoColor=white&color=F39C12)](https://marketplace.visualstudio.com/items?itemName=ric-v.nexql)
[![Status](https://img.shields.io/badge/status-stable%20v1.0.0%20%2B%20nightly-blue?style=for-the-badge&logo=git&logoColor=white)](https://github.com/dev-asterix/PgStudio/releases)

**NexQL** (formerly PgStudio) is a universal SQL database management platform for VS Code. It provides interactive SQL notebooks, real-time monitoring dashboards, AI-powered assistance, and advanced database operations — all within your editor. Connect to PostgreSQL, MySQL, SQLite, and more through a modular extension architecture.

[📖 **Documentation**](https://pgstudio.astrx.dev/) • [🛒 **Marketplace**](https://marketplace.visualstudio.com/items?itemName=ric-v.nexql) • [🤝 **Contributing**](#-contributing) • [📋 **Changelog**](CHANGELOG.md)

</div>

---

## 🗃️ Database Extensions

NexQL uses a modular architecture. The **Core Extension** provides the shared UI, notebooks, AI assistant, and connection management. Each database engine is supported through a dedicated **Database Extension**:

| Extension | Marketplace ID | Status | Description |
|-----------|---------------|--------|-------------|
| **NexQL** (Core) | [`ric-v.nexql`](https://marketplace.visualstudio.com/items?itemName=ric-v.nexql) | ✅ Stable | Core platform — UI, notebooks, AI, connection management |
| **NexQL - PostgreSQL** | [`ric-v.postgres-explorer`](https://marketplace.visualstudio.com/items?itemName=ric-v.postgres-explorer) | ✅ Stable | Full PostgreSQL support with all advanced features |
| **NexQL - MySQL** | [`ric-v.nexql-mysql`](https://marketplace.visualstudio.com/items?itemName=ric-v.nexql-mysql) | 🚧 Preview | MySQL / MariaDB support |
| **NexQL - SQLite** | [`ric-v.nexql-sqlite`](https://marketplace.visualstudio.com/items?itemName=ric-v.nexql-sqlite) | 🚧 Preview | SQLite file-based database support |

> **Install the Core Extension first**, then add Database Extensions for the engines you use. The Core Extension is a prerequisite for all Database Extensions.

---

## 📺 Video Guides

### 1. Setup
![NexQL Setup](docs/assets/01-setup.gif)

### 2. Database Explorer
![Database Explorer](docs/assets/03-explorer.gif)

### 3. AI Assistant Setup
![AI Assistant Setup](docs/assets/02-ai-assist-setup.gif)

### 4. AI Assistant Usage
![AI Assistant Usage](docs/assets/04-ai-assist.gif)

---

## ✨ Key Features

- 🔌 **Secure Connections** — VS Code SecretStorage encryption
- 🗄️ **Multi-Database** — PostgreSQL, MySQL, SQLite (and more coming)
- 🛡️ **Connection Safety** — Environment tagging (🔴 PROD, 🟡 STAGING, 🟢 DEV), read-only mode, query safety analyzer
- ⏱️ **Performance Tracking** — Historical query execution monitoring with degradation alerts
- 📊 **Live Dashboard** — Real-time metrics & query monitoring
- 🚦 **Dashboard Health Signals** — Status badges, lock/wait indicators, and performance-focused telemetry cards
- 📓 **SQL Notebooks** — Interactive notebooks with AI assistance
- 🗂️ **Notebook Manager** — Open/create notebooks with searchable picker and improved metadata context
- 💾 **Saved Queries** — Tag-based organization, connection context restoration, AI metadata generation, edit & reuse
- 🌳 **Database Explorer** — Browse tables, views, functions, types, and more
- 🛠️ **Object Operations** — CRUD, scripts, VACUUM, ANALYZE, REINDEX, plus triggers/sequences/domains/rules/partitions
- 🏗️ **Visual Table Designer** — Create/Edit tables with a robust GUI
- 🧭 **Definition Viewer (SQL Preview)** — Open object DDL with toggleable SQL preview, copy/edit workflows
- 🔑 **Index & Constraint Manager** — Visual management of DB constraints
- 🧠 **Schema Intelligence** — Schema search, index advisor, and migration generator workflows
- 📋 **Smart Paste** — Context-aware clipboard actions (SQL/CSV/JSON)
- 📊 **Table Intelligence** — Profile, activity monitor, index usage, definition viewer
- 🔍 **EXPLAIN CodeLens** — One-click query analysis directly in notebooks
- 🎛️ **Advanced Result UX** — Column stats, transpose view, enhanced filtering, and improved in-grid editing controls
- 🛡️ **Auto-LIMIT** — Intelligent query protection (configurable, default 1000 rows)
- 🌍 **Foreign Data Wrappers** — Manage foreign servers, user mappings & tables
- 🤖 **AI-Powered** — Generate, Optimize, Explain & Analyze with guided follow-ups and next-step suggestions (GitHub Models, OpenAI, Anthropic, Gemini, VS Code LM)
- 🧩 **Flexible SQL Assistant layout** — Open SQL Assistant in editor tabs and keep multiple assistant tabs open
- 🖼️ **Vision AI** — Paste or upload images in the SQL Assistant; sent to vision-capable AI providers
- 📎 **File preview** — Click attached file chips to open them as preview tabs in the editor
- 📤 **Export Data** — Export results to CSV, JSON, or Excel

---

## 🎯 Why NexQL?

<table>
<tr>
<td width="50%">

### 🎨 Modern Interface
- Beautiful, intuitive UI designed for developers
- Real-time dashboard with live metrics
- Context-aware operations
- Seamless VS Code integration

</td>
<td width="50%">

### ⚡ Powerful Features
- Interactive SQL notebooks
- 🤖 AI-powered Copilot & agentic support
- Table intelligence & performance insights
- Complete CRUD operations
- EXPLAIN CodeLens for query analysis

</td>
</tr>
<tr>
<td>

### 🛡️ Production-Ready Safety
- Environment tagging (Production/Staging/Dev)
- Read-only mode enforcement
- Query safety analyzer with risk scoring
- Auto-LIMIT for SELECT queries
- Status bar risk indicators

</td>
<td>

### 🗄️ Multi-Database Architecture
- Modular engine extensions
- Consistent UI across all databases
- Engine-specific SQL templates & introspection
- Add new databases without touching core code
- Feature flags control per-engine capabilities

</td>
</tr>
</table>

---

## 🚀 Quick Start

```bash
# Install the Core Extension
ext install ric-v.nexql

# Install a Database Extension (e.g., PostgreSQL)
ext install ric-v.postgres-explorer

# Or via command line
code --install-extension ric-v.nexql
code --install-extension ric-v.postgres-explorer
```

Then: **NexQL icon in Activity Bar** → **Add Connection** → Select engine → Enter details → **Connect!**

---

## 🏗️ Project Structure (Monorepo)

```
NexQL/
├── packages/
│   ├── core/                 # Core Extension (ric-v.nexql)
│   │   ├── src/
│   │   │   ├── extension.ts          # Extension entry point
│   │   │   ├── core/                 # Provider API, registry, interfaces
│   │   │   ├── commands/             # Command implementations
│   │   │   ├── providers/            # VS Code providers
│   │   │   ├── services/             # Business logic
│   │   │   ├── dashboard/            # Dashboard webview
│   │   │   └── common/              # Shared utilities
│   │   ├── resources/                # Icons & assets
│   │   └── package.json             # Extension manifest
│   ├── ext-postgres/         # PostgreSQL Database Extension
│   │   ├── src/
│   │   │   ├── extension.ts          # Registers with Core API
│   │   │   ├── driver.ts             # pg library wrapper
│   │   │   ├── dialect.ts            # PG-specific SQL dialect
│   │   │   ├── introspection.ts      # Schema discovery queries
│   │   │   └── ...                   # Templates, monitoring, etc.
│   │   └── package.json
│   ├── ext-mysql/            # MySQL Database Extension
│   │   ├── src/
│   │   └── package.json
│   └── ext-sqlite/           # SQLite Database Extension
│       ├── src/
│       └── package.json
├── package.json              # Root workspace config
├── tsconfig.base.json        # Shared TypeScript config
├── Makefile                  # Build/package/publish targets
└── docs/                     # Documentation
```

---

## 🤖 AI-Powered Operations

NexQL integrates advanced AI capabilities directly into your workflow, but keeps **YOU** in control.

### 🧩 SQL Assistant Tabs
Use SQL Assistant where you work, not only in the sidebar.
- **Open in Editor Tab**: Run `SQL Assistant: Open in Editor Tab` from Command Palette.
- **Parallel Assistants**: Open multiple SQL Assistant tabs for separate tasks (e.g., optimization, migration, and schema exploration).

### 🪄 Generate Query (Natural Language → SQL)
Describe what you need in plain English, and NexQL generates the SQL using your schema context.

### ⚡ Performance Optimization
Click the **Optimize** button on any successful query result for EXPLAIN analysis and index suggestions.

### 📊 Data Analysis
Click **Analyze Data** in result tables for AI-powered pattern and trend detection.

### ✨ Error Handling (Explain & Fix)
When a query fails, get instant plain-English explanations and suggested fixes.

### 🛡️ Safe Execution Model (Notebook-First)
No query is ever executed automatically. AI generates → You review → You execute.

---

## 🛠️ Local Development

### Prerequisites

- **Node.js** ≥ 18.0.0
- **VS Code** ≥ 1.105.0
- **PostgreSQL** (for integration testing)

### Setup

```bash
# Clone the repository
git clone https://github.com/dev-asterix/PgStudio.git
cd PgStudio

# Install dependencies (all workspaces)
npm install

# Build all packages
make build
```

### Development Commands

| Command | Description |
|---------|-------------|
| `make build` | Build all packages |
| `make test` | Run all tests |
| `make package` | Package all extensions as .vsix |
| `make clean` | Clean build artifacts |
| `npm run watch` | Watch mode (core package) |

### Running the Extension

1. Open the project in VS Code
2. Press `F5` to launch Extension Development Host
3. Or use **Run and Debug** (`Ctrl+Shift+D`) → "Run Extension"

---

## 🧪 Testing

```bash
# Run all tests
make test

# Run core tests only
make test-core

# Run with coverage
npm run coverage --workspace=packages/core
```

---

## 📦 Building & Publishing

```bash
# Package all extensions
make package

# Package nightly (pre-release)
make package-nightly

# Publish all (core first, then extensions)
make publish

# Publish individual packages
make publish-core
make publish-postgres
make publish-mysql
make publish-sqlite
```

### Channels

- **Stable**: Published from version tags (`v*`) via `.github/workflows/publish.yml`
- **Nightly**: Published on every merge to `main` via `.github/workflows/publish-nightly.yml`

---

## 🤝 Contributing

- 🐛 [Report Bugs](https://github.com/dev-asterix/PgStudio/issues/new?template=bug_report.md)
- 💡 [Request Features](https://github.com/dev-asterix/PgStudio/issues/new?template=feature_request.md)
- 🔧 Fork → Branch → PR
- 🧪 Ensure all tests pass: `make test`

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: resolve bug
docs: update documentation
refactor: code restructuring
test: add/update tests
chore: maintenance tasks
```

---

## 📝 License

[MIT License](LICENSE)

---

<div align="center">

**Made with ❤️ for the Database Community**

[![Made with TypeScript](https://img.shields.io/badge/TypeScript-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=flat-square&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![VS Code](https://img.shields.io/badge/VS%20Code-007ACC?style=flat-square&logo=visual-studio-code&logoColor=white)](https://code.visualstudio.com/)

</div>

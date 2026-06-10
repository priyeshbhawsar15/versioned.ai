# Versioned.AI — Architecture Overview

## System Overview

Versioned.AI is a developer-centric AI prompt evaluation workbench distributed as a zero-configuration `npx` CLI tool. It uses a hybrid architecture: a **Node.js/Express CLI backend** serves a **pre-compiled Next.js static UI** and exposes a local REST API for execution, caching, and evaluation.

---

## Monorepo Structure

```
versioned-ai/
├── package.json              # Root workspace config (npm workspaces)
├── tsconfig.base.json        # Shared TypeScript base config
├── ARCHITECTURE.md           # This file
├── DESIGN.md                 # Design system tokens & guidelines
├── PRD.md                    # Product requirements
├── mockups/                  # UI mockup HTML files
│
├── packages/
│   ├── ui/                   # Next.js React application (static export)
│   │   ├── src/
│   │   │   ├── app/          # Next.js App Router pages
│   │   │   │   ├── page.tsx              # Playground (/)
│   │   │   │   ├── providers/page.tsx    # Providers (/providers)
│   │   │   │   ├── datasets/page.tsx     # Datasets (/datasets)
│   │   │   │   └── history/page.tsx      # History (/history)
│   │   │   └── components/   # React components
│   │   │       ├── AppShell.tsx
│   │   │       ├── TopNavBar.tsx
│   │   │       ├── SideNavBar.tsx
│   │   │       ├── playground/
│   │   │       ├── providers/
│   │   │       ├── datasets/
│   │   │       └── history/
│   │   ├── tailwind.config.ts
│   │   ├── next.config.js     # output: 'export' for static build
│   │   └── out/               # Static HTML/JS/CSS export (build output)
│   │
│   └── cli/                   # Node.js backend & CLI wrapper
│       ├── src/
│       │   ├── index.ts       # CLI entry point (commander.js)
│       │   ├── commands/
│       │   │   ├── dev.ts     # `versioned-ai dev` — starts Express + UI
│       │   │   └── run.ts     # `versioned-ai run` — headless execution
│       │   ├── config/
│       │   │   ├── loader.ts  # YAML config parser
│       │   │   └── schema.ts  # Zod validation schema
│       │   ├── engine/
│       │   │   └── execution.ts  # Matrix execution orchestrator
│       │   ├── providers/     # LLM provider adapters
│       │   │   ├── index.ts   # Provider factory
│       │   │   ├── openai.ts
│       │   │   ├── anthropic.ts
│       │   │   ├── bedrock.ts
│       │   │   ├── ollama.ts
│       │   │   └── openapi.ts # Custom OpenAI-compatible provider
│       │   ├── graders/       # Evaluation graders
│       │   │   ├── index.ts   # Grader orchestrator
│       │   │   ├── systematic.ts  # Deterministic checks
│       │   │   └── model.ts   # LLM-as-a-Judge
│       │   ├── cache/
│       │   │   └── manager.ts # SQLite cache layer
│       │   ├── routes/        # Express API routes
│       │   │   ├── index.ts
│       │   │   ├── config.ts
│       │   │   ├── run.ts
│       │   │   ├── results.ts
│       │   │   ├── cache.ts
│       │   │   └── providers.ts
│       │   └── utils/
│       │       └── retry.ts   # Exponential backoff
│       ├── scripts/
│       │   └── copy-ui.js     # Copies UI static export into dist/
│       └── dist/
│           ├── index.js       # Compiled CLI
│           └── ui/            # Injected Next.js static export
```

---

## Data Flow

```
Developer's CWD
    │
    ├── prompt_eval.yaml ──→ Config Loader (Zod validation)
    ├── .env ──→ dotenv (env vars for API keys)
    ├── prompts/*.txt ──→ Prompt file reader
    │
    ▼
Execution Engine
    │
    ├── Provider Adapters (OpenAI, Anthropic, Bedrock, Ollama, OpenAPI)
    │   └── Parallel execution with Promise.allSettled
    │   └── Exponential backoff for rate limits
    │
    ├── Cache Manager (SQLite: .prompt_cache.db)
    │   └── Deterministic hash: SHA-256(prompt + vars + model config)
    │
    ├── Graders
    │   ├── Systematic: is-json, matches-schema, contains-substring, latency
    │   └── Model: llm-rubric, semantic-similarity (LLM-as-a-Judge)
    │
    ▼
Express API Server (localhost:3000)
    │
    ├── GET  /api/config       → Parsed YAML config
    ├── POST /api/run          → Trigger matrix execution
    ├── GET  /api/results      → Fetch execution results
    ├── POST /api/cache/bypass → Delete specific cache entry
    ├── DELETE /api/cache      → Clear entire cache
    ├── GET  /api/providers    → List configured providers
    │
    └── Static file serving → Next.js exported UI (dist/ui/)
```

---

## Build & Distribution Pipeline

1. **`npm run build:ui`** — Next.js compiles the React app into static HTML/JS/CSS → `packages/ui/out/`
2. **`npm run build:cli`** — TypeScript compiles CLI → `packages/cli/dist/index.js`, then `copy-ui.js` copies UI assets into `packages/cli/dist/ui/`
3. **`npm run build`** — Orchestrates both in sequence
4. **npm publish** — Only `packages/cli` is published with `"files": ["dist/"]`, bundling the pre-built UI

### How `npx versioned-ai dev` works:
1. Express server starts on localhost:3000
2. Static UI assets served from `dist/ui/`
3. API routes mounted at `/api/*`
4. Browser auto-opens to localhost:3000
5. UI fetches data from local API endpoints

---

## Provider Architecture

| Provider | SDK | Config Key | Auth |
|---|---|---|---|
| OpenAI | `openai` | `openai:<model>` | `OPENAI_API_KEY` |
| Anthropic | `@anthropic-ai/sdk` | `anthropic:<model>` | `ANTHROPIC_API_KEY` |
| AWS Bedrock | `@aws-sdk/client-bedrock-runtime` | `bedrock:<model>` | AWS credentials |
| Ollama | `ollama` | `ollama:<model>` | None (local) |
| Custom OpenAPI | `openai` (custom baseURL) | `openapi:<name>` | `config.api_key` |

The Custom OpenAPI provider reuses the OpenAI SDK with a custom `baseURL`, supporting any server that implements the `/v1/chat/completions` contract.

---

## Design System

See `DESIGN.md` for the complete design token system. Key implementation notes:

- **Font**: Inter (Google Fonts) at weight 300 as Sohne substitute
- **`font-feature-settings: "ss01"`** applied globally
- **Tailwind CSS** config maps all design tokens (colors, typography, spacing, border-radius, elevation)
- **Dark theme** with Material Design 3 color system from mockups
- **Material Symbols Outlined** for icons

# Versioned.AI

AI Prompt Playground & Regression Evaluation Platform — a developer-centric workbench for test-driven prompt engineering, distributed as a zero-configuration `npx` CLI tool.

## Quick Start

```bash
# Install globally
npm install -g versioned-ai

# Or run directly with npx
npx versioned-ai dev
```

## Setup

### 1. Create a `prompt_eval.yaml` in your project root

```yaml
version: "1.0"
description: "My Evaluation Suite"

providers:
  - id: openai:gpt-4o
    config:
      temperature: 0.2
  - id: anthropic:claude-3-5-sonnet-20240620

prompts:
  - id: v1_stable
    file: ./prompts/agent_v1.txt
  - id: v2_experimental
    file: ./prompts/agent_v2.txt

tests:
  - vars:
      customer_query: "Can I track my item? ID: 9921A"
    assert:
      - type: is-json
      - type: contains-substring
        value: "tracking"
  - vars:
      customer_query: "Your app crashed!"
    assert:
      - type: llm-rubric
        provider: openai:gpt-4o
        value: "The response must contain an explicit apology."
```

### 2. Set your API keys

```bash
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...
```

Or create a `.env` file in your project root.

### 3. Run the playground

```bash
npx versioned-ai dev
```

Opens `http://localhost:3000` with the interactive UI.

## CLI Commands

| Command | Description |
|---|---|
| `versioned-ai dev` | Start the local UI server and open the playground |
| `versioned-ai dev --port 8080` | Run on a custom port |
| `versioned-ai dev --no-open` | Start without auto-opening the browser |
| `versioned-ai run` | Run evaluation matrix in headless mode |
| `versioned-ai run --ci` | CI mode — exit code 1 on any failure |
| `versioned-ai run --config ./custom.yaml` | Use a custom config file |

## Supported Providers

| Provider | Config ID | Auth |
|---|---|---|
| OpenAI | `openai:<model>` | `OPENAI_API_KEY` |
| Anthropic | `anthropic:<model>` | `ANTHROPIC_API_KEY` |
| AWS Bedrock | `bedrock:<model>` | AWS credentials |
| Ollama | `ollama:<model>` | None (local) |
| Custom OpenAPI | `openapi:<name>` | `config.api_key` |

### Custom OpenAPI Provider

Connect any server that implements the OpenAI-compatible `/v1/chat/completions` endpoint:

```yaml
providers:
  - id: openapi:my-server
    config:
      base_url: http://localhost:8000/v1
      api_key: ${LOCAL_API_KEY}
      model: my-fine-tuned-model
      temperature: 0.3
```

Works with Azure OpenAI, LiteLLM, vLLM, Together AI, Fireworks, and any OpenAI-compatible server.

## Assertion Types

| Type | Category | Description |
|---|---|---|
| `is-json` | Systematic | Checks if response is valid JSON |
| `matches-schema` | Systematic | Validates against a JSON schema file |
| `contains-substring` | Systematic | Checks for substring presence |
| `latency` | Systematic | Asserts response time threshold |
| `llm-rubric` | Model | LLM-as-a-Judge evaluation |
| `semantic-similarity` | Model | Semantic similarity scoring |

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full system architecture, data flow, and build pipeline.

## Development

```bash
# Install all dependencies
npm install

# Run UI dev server
npm run dev:ui

# Run CLI in dev mode
npm run dev:cli

# Build everything
npm run build
```

## Project Structure

```
packages/
├── ui/     # Next.js React app (static export)
└── cli/    # Node.js backend & CLI wrapper
```

## License

MIT

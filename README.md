# Versioned.AI

**AI Prompt Playground & Regression Evaluation Platform** — a developer-centric workbench for test-driven prompt engineering, distributed as a zero-configuration `npx` CLI tool.

Run prompts across multiple models side-by-side, apply automated assertions, and catch regressions before they reach production — all from a single YAML file and a local web UI.

---

## Requirements

- **Node.js 18+**
- At least one supported AI provider (API key or local Ollama instance)

---

## Quick Start

```bash
npx versioned-ai dev
```

This starts the local playground UI and opens it at `http://localhost:3000`. No installation required.

---

## Getting Started

### Step 1 — Create a `prompt_eval.yaml` in your project directory

This file defines which providers to test, which prompt variants to compare, and what test cases to run.

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
    content: "You are a helpful assistant. Answer the following: {{input}}"

tests:
  - vars:
      input: "Can I track my order? ID: 9921A"
    assert:
      - type: contains-substring
        value: "tracking"
      - type: is-json
  - vars:
      input: "Your app just crashed on me!"
    assert:
      - type: llm-rubric
        provider: openai:gpt-4o
        value: "The response must contain an explicit apology."
```

### Step 2 — Set your API keys

Export them in your terminal or create a `.env` file in your project root:

```bash
# Terminal
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...
export AWS_REGION=us-east-1          # for Bedrock
```

```ini
# .env file
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

### Step 3 — Run the playground

```bash
npx versioned-ai dev
```

The interactive UI opens at `http://localhost:3000`. From there you can:
- View the evaluation matrix (prompts × models × test cases)
- Edit prompts inline and re-run specific columns
- Inspect per-assertion pass/fail results and LLM judge reasoning
- Compare outputs side-by-side with visual diffing

---

## CLI Commands

| Command | Description |
|---|---|
| `npx versioned-ai dev` | Start the local UI server and open the playground |
| `npx versioned-ai dev --port 8080` | Run on a custom port |
| `npx versioned-ai dev --no-open` | Start the server without auto-opening the browser |
| `npx versioned-ai run` | Run evaluations headlessly (no UI) |
| `npx versioned-ai run --ci` | CI mode — exits with code `1` on any test failure |
| `npx versioned-ai run --config ./path/to/custom.yaml` | Use a specific config file |

---

## Configuration Reference

### `prompt_eval.yaml` structure

```yaml
version: "1.0"           # Schema version (optional)
description: ""          # Human-readable description (optional)

providers: []            # List of model providers to test against
prompts: []              # List of prompt variants to compare
tests: []                # Test cases with inputs and assertions

grader_mode: assertions  # "assertions" (default) or "model-grader"
model_grader_prompt: ""  # Custom rubric for model-grader mode (optional)
use_variables: true      # Whether to interpolate {{vars}} into prompts
```

### Providers

| Provider | ID format | Required auth |
|---|---|---|
| OpenAI | `openai:<model>` | `OPENAI_API_KEY` |
| Anthropic | `anthropic:<model>` | `ANTHROPIC_API_KEY` |
| AWS Bedrock | `bedrock:<model>` | `AWS_REGION` + AWS credentials |
| Ollama (local) | `ollama:<model>` | None |
| Custom OpenAPI | `openapi:<name>` | `config.api_key` (optional) |

**Provider config options:**

```yaml
providers:
  - id: openai:gpt-4o-mini
    config:
      temperature: 0.7       # 0–2, controls randomness
      max_tokens: 512        # max response length
      top_p: 0.9             # nucleus sampling
```

#### Custom OpenAPI-compatible Provider

Connect any server that implements the OpenAI `/v1/chat/completions` endpoint (Azure OpenAI, LiteLLM, vLLM, Together AI, Fireworks, etc.):

```yaml
providers:
  - id: openapi:my-server
    config:
      base_url: http://localhost:8000/v1
      api_key: ${MY_API_KEY}       # reads from env variable
      model: my-fine-tuned-model
      temperature: 0.3
```

#### Ollama (local models)

```yaml
providers:
  - id: ollama:llama3.2
    config:
      base_url: http://localhost:11434   # default Ollama port
      temperature: 0.5
```

To use a remote Ollama instance, set `base_url` to its address.

### Prompts

Prompts can be loaded from a file or written inline. Use `{{variable_name}}` to interpolate test variables.

```yaml
prompts:
  - id: v1
    file: ./prompts/system_v1.txt    # path relative to project root

  - id: v2_inline
    content: "You are a helpful assistant. Answer: {{input}}"
```

### Tests

Each test case defines input variables and optional assertions:

```yaml
tests:
  - user_prompt: "What is 4 + 4?"     # displayed in the UI
    vars:
      input: "What is 4 + 4?"         # injected into prompt templates
    assert:
      - type: contains-substring
        value: "8"
```

### Assertions

#### Systematic (deterministic)

| Type | Description | `value` field |
|---|---|---|
| `is-json` | Response must be valid parseable JSON | Not required |
| `equals-json` | Response JSON must deeply equal `value` | JSON string |
| `matches-schema` | Response JSON must match a JSON Schema file | Path to schema file |
| `contains-substring` | Response must contain the given string | String to find |
| `latency` | Response time must be under threshold (ms) | Number (e.g. `1200`) |

#### Model-based (LLM-as-a-Judge)

| Type | Description | `value` field |
|---|---|---|
| `llm-rubric` | LLM judges whether the response satisfies a rubric | Rubric string |
| `semantic-similarity` | LLM scores semantic similarity to expected output | Expected output string |

For model-based assertions, specify which model to use as the judge:

```yaml
assert:
  - type: llm-rubric
    provider: openai:gpt-4o
    value: "The response must acknowledge the issue and offer next steps."
```

### Grader Modes

**`assertions` mode** (default) — each test case runs the assertions defined in its `assert` block.

**`model-grader` mode** — skips per-test assertions and instead uses a single LLM prompt to evaluate all outputs:

```yaml
grader_mode: model-grader
model_grader_prompt: "Score the response out of 100. Deduct points for unnecessary verbosity or incorrect facts."
```

---

## Caching

Versioned.AI caches LLM responses locally in a `.prompt_cache.db` SQLite file in your project directory. Cache keys are a hash of the prompt content, variables, and model config — so identical runs are instant and free.

To force a fresh run, delete `.prompt_cache.db` or modify your prompt/config.

---

## CI/CD Integration

Use `versioned-ai run --ci` in your pipeline. It exits with code `1` if any assertion fails, making it compatible with GitHub Actions, GitLab CI, and other standard CI systems.

```yaml
# .github/workflows/eval.yml
- name: Run prompt evaluations
  run: npx versioned-ai run --ci
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

---

## Architecture

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the full system architecture, data flow, and build pipeline.

---

## Contributing / Local Development

```bash
# Clone and install all dependencies
git clone https://github.com/your-org/versioned-ai.git
cd versioned-ai
npm install

# Run the UI dev server (hot reload)
npm run dev:ui

# Run the CLI in dev mode (watches for changes)
npm run dev:cli

# Build everything (required before publishing)
npm run build
```

### Project Structure

```
packages/
├── ui/    # Next.js React app — compiled to static export at build time
└── cli/   # Node.js/Express backend + CLI entry point
           # The static UI is copied into cli/dist/ui/ at build time
```

---

## License

MIT

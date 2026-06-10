# Product Requirements Document (PRD)

## Application: AI Prompt Playground & Regression Evaluation Platform

**Version:** 2.0 (Updated Architecture for `npx` Distribution)

---

### 1. Executive Summary & Vision

The AI Prompt Playground & Regression Evaluation Platform is a developer-centric workbench designed to transition prompt engineering into a rigorous, test-driven discipline.

The platform’s core interface is an interactive Web UI Playground that empowers developers to iteratively compose prompts, run multi-model matrix evaluations side-by-side, and inspect evaluation grader results. Crucially, the platform is distributed as a **zero-configuration `npx` CLI tool**, leveraging a hybrid architecture (Static Next.js Export + Node CLI) to ensure instant boot times and seamless local file system integration without the bloat of a live Next.js production server.

---

### 2. System Architecture & Distribution Model

To achieve a lightweight, instant-boot `npx` experience while delivering a complex React UI, the application utilizes a decoupled **Monorepo Architecture**.

#### 2.1. The Hybrid Architecture

* **The CLI Engine (Node.js/Express):** A lightweight executable that reads the developer's local `prompt_eval.yaml` from their current working directory (`process.cwd()`), executes the LLM calls, and manages the local cache.
* **The Visualization UI (Next.js Static Export):** The React frontend is pre-compiled into static HTML/JS/CSS files at build time.
* **The Bridge:** When the developer runs `npx prompt-eval`, the CLI engine spins up an Express server on `localhost`, serves the static Next.js assets, and exposes a minimal local API for the UI to read the execution results and trigger new test runs.

#### 2.2. Directory & Distribution Flow

```text
[ Monorepo Root ]
 ├── packages/
 │   ├── cli/ (Node.js backend & CLI wrapper)
 │   │    └── dist/
 │   │         ├── index.js (Compiled CLI)
 │   │         └── ui/      (Injected Next.js static export) 
 │   └── ui/  (Next.js React application)

```

*When published to npm, only the `cli` package (containing the pre-built static UI folder) is shipped, resulting in a tiny package footprint with zero React/Next.js server-side dependencies.*

---

### 3. Core Feature Requirements

#### 3.1. Developer Experience & CLI (`npx` Tooling)

* **Instant Execution:** Running `npx your-tool dev` must boot the local UI server in under 1 second.
* **Working Directory Awareness:** The tool must execute entirely based on the directory it is run in. It reads `./prompt_eval.yaml` and outputs caches to `./.prompt_cache.db`.
* **Headless CI/CD Mode:** Running `npx your-tool run` bypasses the UI entirely, executing the matrix tests against the local files and outputting a terminal pass/fail exit code for GitHub Actions/CI pipelines.

#### 3.2. Interactive Matrix UI (Primary Interface)

* **The Matrix View Grid:**
* **Rows:** Test cases (individual inputs and variables from the golden dataset).
* **Columns:** Grouped by **Prompt Variation** and **Target Model** (e.g., *Prompt V1 × GPT-4o*, *Prompt V2 × Claude 3.5 Sonnet*).
* **Cells:** Display the raw text response, execution metadata (latency/tokens), and PASS/FAIL evaluation badges.


* **Side-by-Side Diffing Engine:** A toggleable visual mode highlighting character/word additions and deletions between two arbitrary outputs in the matrix.
* **Inline Playground:** A built-in code editor to tweak prompt templates. Clicking "Run Selected" patches the change through the local CLI API and re-renders the specific matrix column.
* **Grader Inspection Panel:** Clicking a cell opens a drawer displaying exact assertion breakdowns (e.g., JSON schema failures or the LLM Judge's textual reasoning).

#### 3.3. Unified Multi-Provider Execution Engine

* **Cross-Provider Paralleled Calls:** The CLI routes prompts concurrently to **OpenAI**, **Anthropic**, **AWS Bedrock**, and **Ollama**.
* **Environment Variable Passthrough:** The Node CLI automatically inherits the developer's local `.env` file or terminal environment variables to authenticate with providers.
* **Rate-Limit Handling:** Built-in exponential backoff for cloud APIs to prevent large matrix runs from failing mid-execution.

#### 3.4. Dual-Layer Evaluation Graders

| Grader Type | Mechanism | Target Use Case | Example Assertions |
| --- | --- | --- | --- |
| **Systematic Grader** | Node.js deterministic checks (regex, JSON parse, AST). | Structured data, latency tracking, formatting. | `is-json`, `matches-schema`, `contains-substring`, `latency < 1200ms` |
| **Model Grader** | LLM-as-a-Judge using highly capable evaluator models. | Qualitative criteria, tone compliance, semantic variance. | `llm-rubric`, `semantic-similarity` |

#### 3.5. Smart Local Caching

* **Deterministic Hashing:** `Hash(Prompt Template + Variables + Model Config + System Prompt)`.
* **SQLite Persistence:** The CLI maintains a local `.prompt_cache.db` file in the user's working directory. If a hash matches, the CLI instantly serves the cached API response to the UI.
* **UI Controls:** Buttons in the web interface to selectively "Bypass Cache" for a specific cell or row.

---

### 4. Technical Configuration Schema (`prompt_eval.yaml`)

Because the Node CLI parses the user's workspace, the configuration remains strictly declarative:

```yaml
version: "1.0"
description: "E-Commerce Support Engine Evaluation"

providers:
  - id: openai:gpt-4o
    config:
      temperature: 0.2
  - id: anthropic:claude-3-5-sonnet-20240620

prompts:
  - id: v1_stable
    file: ./prompts/customer_agent_v1.txt
  - id: v2_experimental
    file: ./prompts/customer_agent_v2.txt

tests:
  - vars:
      customer_query: "Can I track my item? ID: 9921A"
    assert:
      - type: is-json
      - type: matches-schema
        value: ./schemas/tracking_response.json
  - vars:
      customer_query: "Your app crashed!"
    assert:
      - type: llm-rubric
        provider: openai:gpt-4o 
        value: "The response must contain an explicit apology."

```

---

### 5. Success Metrics & Acceptance Criteria

1. **Distribution:** The application successfully installs and runs via a single `npx` command without requiring the user to manually install `react`, `next`, or any heavy frontend build tools.
2. **Boot Time:** The local UI is accessible at `localhost:3000` within 1 second of executing the CLI command.
3. **Multi-Model Execution:** A developer can execute a single test suite across OpenAI, Anthropic, Bedrock, and Ollama simultaneously.
4. **CI/CD Parity:** The exact same assertions and grading logic used to populate the UI matrix also block GitHub Pull Requests if run in headless mode (`npx my-tool run --ci`).

### 6. References & Resources
* **Promptfoo:** https://promptfoo.dev/
* **Promptfoo GitHub:** https://github.com/promptfoo/promptfoo
* **Promptfoo Documentation:** https://promptfoo.dev/docs/
* **Promptfoo CLI Commands:** https://promptfoo.dev/docs/cli/

### 7. Mockups
The mockups for the UI are provided in the `mockups` directory.
Use DESIGN.md files to understand the design and implement it accordingly, and code.html files to see the actual implementation.
Keep the design consistent with the DESIGN.md files. DO NOT CHANGE THE LAYOUT FROM code.html files, but use the colors, styles, font, border radius and other design elements from the DESIGN.md files.
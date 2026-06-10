# Playground Page (`/`)

The primary interface of Versioned.AI. A split-view workspace for iteratively composing prompts and evaluating LLM responses across multiple models in a matrix grid.

## Layout

The page is divided into two horizontal halves:

### Top Half — Prompt Editor
- **Tab bar**: Switches between "System Prompt" and "User Prompt" editors
- **Code editor**: Monospace text area with line numbers, styled as an IDE panel
- **Toolbar** (right side of tab bar):
  - **Model selector dropdown**: Checkboxes for GPT-4o, Claude 3.5, Gemini 1.5 Pro with "Manage Models" link
  - **Run Selected**: Executes the current prompt against selected models
  - **Save**: Persists the prompt to disk

### Bottom Half — Evaluation Matrix
- **Header bar**: "Evaluation Matrix" title, Diff Mode toggle, test case count
- **Matrix table**:
  - **Rows**: Test cases (input text from the golden dataset)
  - **Columns**: Prompt variation × Model (e.g., "Prompt V1 - GPT-4o")
  - **Cells**: LLM response text + PASS/FAIL badge + latency/token metadata
- **Comparison View**: Expandable row showing side-by-side diff between two model outputs with highlighted additions/deletions

## Components

| Component | File | Purpose |
|---|---|---|
| `PlaygroundWorkspace` | `components/playground/PlaygroundWorkspace.tsx` | Container splitting top/bottom halves |
| `PromptEditor` | `components/playground/PromptEditor.tsx` | Tab bar + code editor + toolbar |
| `EvaluationMatrix` | `components/playground/EvaluationMatrix.tsx` | Matrix table + comparison view |

## API Dependencies

| Endpoint | Usage |
|---|---|
| `GET /api/config` | Load prompt templates and test cases |
| `POST /api/run` | Trigger matrix execution |
| `GET /api/results` | Fetch execution results to populate the matrix |

## User Interactions

- Switch between System/User prompt tabs
- Edit prompt text in the code editor
- Select/deselect models in the dropdown
- Click "Run Selected" to execute against chosen models
- Hover over test case cells to see the edit icon
- Toggle "Diff Mode" to enable comparison view
- Click a matrix row to expand the comparison panel

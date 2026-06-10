# History Page (`/history`)

View regression test results with aggregate metrics, per-test-case assertion breakdowns, and a detailed inspector panel for debugging failures.

## Layout

Vertical stack with three sections:

### Section 1 — Metrics Overview (fixed)
- **Header**: Regression suite name + "Export" and "Run Suite" buttons
- **Metrics grid**: 4 cards in a row:
  - **Total Pass Rate**: Percentage with up/down trend indicator
  - **Avg Score**: Score out of 1.0
  - **Median Latency**: Milliseconds with trend indicator
  - **Assertion Success**: Percentage with raw count (e.g., 891/907)

### Section 2 — Results Table (scrollable, left side)
- **Sticky header row**: Status | Input Snippet | Assertion Breakdown
- **Rows**: One per test case with:
  - Status icon (check_circle green / cancel red)
  - Input text snippet with test ID
  - Inline assertion badges (pass = gray border, fail = red border)
- **Selected row**: Highlighted with blue left border accent

### Section 3 — Inspector Panel (450px, right side)
- **Header**: "Inspector: {test_id}" with close button
- **Tab bar**: "Diff View", "Raw Output", "Trace"
- **Diff View content**: JSON diff showing expected vs actual with:
  - Red-highlighted missing fields (line-through + "Missing in output" label)
  - Green-highlighted actual values ("Actual" label)
- **Model Metadata footer**: Tokens, Latency, Model name

## Components

| Component | File | Purpose |
|---|---|---|
| `HistoryWorkspace` | `components/history/HistoryWorkspace.tsx` | Full history page with metrics, table, and inspector |

## API Dependencies

| Endpoint | Usage |
|---|---|
| `GET /api/results` | Fetch execution results and evaluation summary |
| `POST /api/run` | Re-run the regression suite |
| `GET /api/results/:testIndex` | Fetch details for a specific test case |

## User Interactions

- Click a row in the results table to select it and load its details in the inspector
- Switch between Diff View / Raw Output / Trace tabs in the inspector
- Click "Export" to download results
- Click "Run Suite" to re-execute all tests
- Close the inspector panel with the X button

# Datasets Page (`/datasets`)

Manage golden test datasets for prompt evaluation. Generate new datasets via AI, upload existing ones, or connect to external data sources. Preview and edit test cases before applying them to the playground.

## Layout

A horizontal split-panel view:

### Left Panel (400px) — Dataset Generation
- **Header**: "Dataset Generation" title
- **Tab bar**: Three modes — "AI Generate", "Upload", "Connect"
- **Config form** (AI Generate tab):
  - Scenario description textarea
  - Number of test cases input
  - "Generate Dataset" button with sparkle icon
- Form sticks to the panel with the generate button at the bottom

### Right Panel (flex) — Dataset Preview
- **Header bar**: Active dataset name and version, action buttons (Export, Save Dataset, Apply to Playground)
- **Data table**: Scrollable table with columns:
  - **ID**: Test case identifier (e.g., `tc_01`)
  - **Input**: The test input string
  - **Expected Outcome**: Expected JSON response
- **Footer**: Row count indicator ("Showing 5 of 50 generated test cases")

## Components

| Component | File | Purpose |
|---|---|---|
| `DatasetsWorkspace` | `components/datasets/DatasetsWorkspace.tsx` | Split-panel container with form + table |

## API Dependencies

| Endpoint | Usage |
|---|---|
| `GET /api/config` | Load current test cases from YAML config |
| `POST /api/run` | Execute tests after applying dataset to playground |

## User Interactions

- Switch between AI Generate / Upload / Connect tabs
- Describe scenarios in the text area
- Set number of test cases to generate
- Click "Generate Dataset" to create test cases via AI
- Review generated test cases in the table
- Click "Export" to download dataset
- Click "Save Dataset" to persist changes
- Click "Apply to Playground" to use dataset in the evaluation matrix

# GET /api/results

Returns the latest execution results and evaluation summary.

## Endpoint

| Field | Value |
|---|---|
| URL | `/api/results` |
| Method | `GET` |
| Auth | None (local server) |

## Response

### 200 OK

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "testIndex": 0,
        "promptId": "v1_stable",
        "providerId": "openai:gpt-4o",
        "response": "...",
        "latencyMs": 342,
        "tokenUsage": { "prompt": 120, "completion": 45, "total": 165 },
        "error": null,
        "cached": true
      }
    ],
    "evaluation": {
      "results": [...],
      "totalPass": 7,
      "totalFail": 1,
      "passRate": 0.875
    },
    "summary": {
      "totalTests": 8,
      "passed": 7,
      "failed": 1,
      "passRate": 0.875
    }
  }
}
```

### 404 Not Found — No results yet

```json
{
  "error": "No results available",
  "message": "No test execution has been run yet. Use POST /api/run to trigger execution."
}
```

---

# GET /api/results/:testIndex

Returns results for a specific test case by index.

## Parameters

| Param | Type | Description |
|---|---|---|
| `testIndex` | `number` | Zero-based index of the test case in the config |

## Response

### 200 OK

```json
{
  "success": true,
  "data": [
    {
      "testIndex": 0,
      "promptId": "v1_stable",
      "providerId": "openai:gpt-4o",
      "response": "...",
      "latencyMs": 342,
      "tokenUsage": { "prompt": 120, "completion": 45, "total": 165 },
      "error": null,
      "cached": false
    },
    {
      "testIndex": 0,
      "promptId": "v1_stable",
      "providerId": "anthropic:claude-3-5-sonnet",
      "response": "...",
      "latencyMs": 510,
      "tokenUsage": { "prompt": 118, "completion": 52, "total": 170 },
      "error": null,
      "cached": false
    }
  ]
}
```

### 404 Not Found

```json
{
  "error": "No results for test index",
  "message": "No results found for test index 5."
}
```

## Notes

- Results are stored in memory. They persist until the server restarts or a new `POST /api/run` overwrites them.
- The `cached` field indicates whether the response was served from the SQLite cache.

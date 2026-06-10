# POST /api/run

Triggers a full matrix execution: all configured providers × prompts × test cases. Returns execution results and evaluation grades.

## Endpoint

| Field | Value |
|---|---|
| URL | `/api/run` |
| Method | `POST` |
| Content-Type | `application/json` |
| Auth | None (local server) |

## Request Body

```json
{
  "bypassCache": false,
  "testIndices": [0, 1],
  "promptIds": ["v1_stable"],
  "providerIds": ["openai:gpt-4o"]
}
```

All fields are optional. If omitted, the full matrix is executed.

| Field | Type | Description |
|---|---|---|
| `bypassCache` | `boolean` | If `true`, skips the SQLite cache and re-fetches from providers |
| `testIndices` | `number[]` | Filter to specific test case indices |
| `promptIds` | `string[]` | Filter to specific prompt IDs |
| `providerIds` | `string[]` | Filter to specific provider IDs |

## Response

### 200 OK — Execution complete

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "testIndex": 0,
        "promptId": "v1_stable",
        "providerId": "openai:gpt-4o",
        "response": "{ \"intent\": \"track_order\" ... }",
        "latencyMs": 342,
        "tokenUsage": { "prompt": 120, "completion": 45, "total": 165 },
        "error": null,
        "cached": false
      }
    ],
    "evaluation": {
      "results": [
        {
          "testIndex": 0,
          "promptId": "v1_stable",
          "providerId": "openai:gpt-4o",
          "pass": true,
          "assertions": [
            { "type": "is-json", "pass": true, "message": "Response is valid JSON" }
          ]
        }
      ],
      "totalPass": 1,
      "totalFail": 0,
      "passRate": 1.0
    }
  }
}
```

### 400 Bad Request — No config

```json
{
  "error": "No configuration loaded",
  "message": "Cannot run without a prompt_eval.yaml file."
}
```

### 409 Conflict — Already running

```json
{
  "error": "Execution in progress",
  "message": "A test run is already in progress. Please wait for it to complete."
}
```

### 500 Internal Server Error

```json
{
  "error": "Execution failed",
  "message": "Rate limit exceeded for OpenAI API"
}
```

---

# GET /api/run/status

Returns the current execution status.

## Response

```json
{
  "isRunning": false,
  "hasResults": true,
  "resultCount": 8
}
```

## Notes

- Only one execution can run at a time. Concurrent requests return 409.
- Provider calls run in parallel via `Promise.allSettled` — a single provider failure does not block others.
- Rate-limited requests are retried with exponential backoff (max 3 retries).
- Results are stored in memory and persist until the server restarts or a new run is triggered.

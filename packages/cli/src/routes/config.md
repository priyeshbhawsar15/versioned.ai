# GET /api/config

Returns the parsed `prompt_eval.yaml` configuration from the developer's working directory.

## Endpoint

| Field | Value |
|---|---|
| URL | `/api/config` |
| Method | `GET` |
| Auth | None (local server) |

## Response

### 200 OK — Config found

```json
{
  "success": true,
  "data": {
    "version": "1.0",
    "description": "E-Commerce Support Engine Evaluation",
    "providers": [
      { "id": "openai:gpt-4o", "config": { "temperature": 0.2 } },
      { "id": "anthropic:claude-3-5-sonnet-20240620" }
    ],
    "prompts": [
      { "id": "v1_stable", "file": "./prompts/customer_agent_v1.txt" },
      { "id": "v2_experimental", "file": "./prompts/customer_agent_v2.txt" }
    ],
    "tests": [
      {
        "vars": { "customer_query": "Can I track my item? ID: 9921A" },
        "assert": [
          { "type": "is-json" },
          { "type": "matches-schema", "value": "./schemas/tracking_response.json" }
        ]
      }
    ]
  }
}
```

### 404 Not Found — No config file

```json
{
  "error": "No configuration found",
  "message": "No prompt_eval.yaml file found in the current working directory."
}
```

## Notes

- The config is loaded once at server startup and cached in memory.
- Changes to `prompt_eval.yaml` require restarting the dev server.
- The config is validated against a Zod schema on load; invalid configs return `null` and log validation errors to the terminal.

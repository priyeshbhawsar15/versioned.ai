# GET /api/providers

Returns the list of configured LLM providers from `prompt_eval.yaml`.

## Endpoint

| Field | Value |
|---|---|
| URL | `/api/providers` |
| Method | `GET` |
| Auth | None (local server) |

## Response

### 200 OK — Providers configured

```json
{
  "success": true,
  "data": [
    {
      "id": "openai:gpt-4o",
      "type": "openai",
      "model": "gpt-4o",
      "hasConfig": true,
      "temperature": 0.2,
      "isCustom": false
    },
    {
      "id": "anthropic:claude-3-5-sonnet-20240620",
      "type": "anthropic",
      "model": "claude-3-5-sonnet-20240620",
      "hasConfig": false,
      "temperature": null,
      "isCustom": false
    },
    {
      "id": "openapi:my-local-server",
      "type": "openapi",
      "model": "my-fine-tuned-model",
      "hasConfig": true,
      "temperature": 0.3,
      "isCustom": true,
      "baseUrl": "http://localhost:8000/v1"
    }
  ]
}
```

### 200 OK — No config loaded

```json
{
  "success": true,
  "data": [],
  "message": "No configuration loaded."
}
```

## Provider Types

| Type | SDK | Config Key | Auth Env Var |
|---|---|---|---|
| `openai` | `openai` | `openai:<model>` | `OPENAI_API_KEY` |
| `anthropic` | `@anthropic-ai/sdk` | `anthropic:<model>` | `ANTHROPIC_API_KEY` |
| `bedrock` | `@aws-sdk/client-bedrock-runtime` | `bedrock:<model>` | AWS credentials |
| `ollama` | `ollama` | `ollama:<model>` | None (local) |
| `openapi` | `openai` (custom `baseURL`) | `openapi:<name>` | `config.api_key` |

## Notes

- Custom OpenAPI providers show `isCustom: true` and include the `baseUrl` field.
- API keys are never exposed in the response — only the provider type and model are returned.
- The provider list is derived from the `providers` array in `prompt_eval.yaml`.

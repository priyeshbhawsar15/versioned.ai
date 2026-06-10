# POST /api/cache/bypass

Deletes a specific cache entry so the next execution re-fetches from the provider.

## Endpoint

| Field | Value |
|---|---|
| URL | `/api/cache/bypass` |
| Method | `POST` |
| Content-Type | `application/json` |
| Auth | None (local server) |

## Request Body

```json
{
  "key": "a1b2c3d4e5f6..."
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `key` | `string` | Yes | The SHA-256 cache key for the specific prompt+provider combination |

## Response

### 200 OK

```json
{
  "success": true,
  "message": "Cache entry \"a1b2c3...\" deleted. Next execution will re-fetch from provider."
}
```

### 400 Bad Request

```json
{
  "error": "Invalid request",
  "message": "A valid cache key must be provided."
}
```

### 500 Internal Server Error

```json
{
  "error": "Cache operation failed",
  "message": "SQLITE_ERROR: ..."
}
```

---

# DELETE /api/cache

Clears the entire SQLite cache (`.prompt_cache.db`).

## Endpoint

| Field | Value |
|---|---|
| URL | `/api/cache` |
| Method | `DELETE` |
| Auth | None (local server) |

## Response

### 200 OK

```json
{
  "success": true,
  "message": "Cache cleared successfully."
}
```

## Notes

- The cache is stored in `.prompt_cache.db` in the developer's working directory.
- Cache keys are deterministic SHA-256 hashes of `JSON.stringify({ prompt, providerId })`.
- Deleting a cache entry only affects the next run — current in-memory results are not modified.
- The cache file is created automatically on first use.

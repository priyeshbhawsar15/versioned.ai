# Providers Page (`/providers`)

Manage API connections for LLM inference. View connected providers with their status and API key info, and browse available integrations to connect new providers.

## Layout

A single scrollable content area with two sections:

### Section 1 — Connected Providers
- **Header**: "Connected Providers" with a green status dot
- **Grid**: 2-column grid of provider cards (collapses to 1 on mobile)
- **Each card**: Provider icon, name, active status badge, version, default model, masked API key with copy button, settings gear (hover-reveal)
- **Left accent line**: 2px green bar indicating active status

### Section 2 — Available Integrations
- **Header**: "Available Integrations" with native plugin count
- **Grid**: 3-column grid (2 on tablet, 1 on mobile) of integration cards
- **Each card**: Circular icon, provider name, description, "Connect" button
- **Providers shown**: Google Vertex AI, Meta Llama 3, Mistral AI, Ollama, Groq, Cohere

### Page Header
- Title "Providers" with subtitle
- Search bar for filtering
- "Custom" button for adding OpenAPI-compatible providers

## Components

| Component | File | Purpose |
|---|---|---|
| `ProvidersWorkspace` | `components/providers/ProvidersWorkspace.tsx` | Full providers page content |

## API Dependencies

| Endpoint | Usage |
|---|---|
| `GET /api/providers` | Fetch list of configured providers from YAML config |

## User Interactions

- Search/filter providers by name
- Click "Connect" on an available integration to set it up
- Click settings gear on a connected provider to edit its config
- Click "Copy" button to copy API key to clipboard
- Click "Custom" to add an OpenAPI-compatible provider

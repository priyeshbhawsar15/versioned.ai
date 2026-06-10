import { Router } from 'express';
import { ConfigStore } from '../config/store';
import { createProvider } from '../providers';

function maskKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  if (key.length <= 8) return '••••••••';
  return key.slice(0, 4) + '••••' + key.slice(-4);
}

export function providersRouter(store: ConfigStore): Router {
  const router = Router();

  /**
   * GET /api/providers
   * Returns the list of configured providers from prompt_eval.yaml.
   */
  router.get('/', (_req, res) => {
    const config = store.get();
    if (!config) {
      return res.json({
        success: true,
        data: [],
        message: 'No configuration loaded.',
      });
    }

    const providers = config.providers.map((p) => {
      const colonIdx = p.id.indexOf(':');
      const type = colonIdx >= 0 ? p.id.slice(0, colonIdx) : p.id;
      const model = colonIdx >= 0 ? p.id.slice(colonIdx + 1) : (p.config?.model || 'default');
      return {
        id: p.id,
        type,
        model: model || p.config?.model || 'default',
        hasConfig: !!p.config,
        temperature: p.config?.temperature,
        isCustom: type === 'openapi',
        baseUrl: p.config?.base_url,
        apiKeyHint: maskKey(p.config?.api_key),
        hasApiKey: !!p.config?.api_key,
        awsRegion: p.config?.aws_region,
        teamId: p.config?.team_id,
        projectId: p.config?.project_id,
      };
    });

    return res.json({
      success: true,
      data: providers,
    });
  });

  /**
   * POST /api/providers/test
   * Tests a provider connection by sending a minimal completion request.
   * Body: { type, model, config: { api_key?, base_url?, aws_region?, aws_access_key_id?, aws_secret_access_key? } }
   */
  router.post('/test', async (req, res) => {
    const { type, model, config: providerConfig } = req.body;

    if (!type || !model) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, model',
      });
    }

    const providerId = `${type}:${model}`;

    try {
      const adapter = createProvider({
        id: providerId,
        config: providerConfig || {},
      });

      const start = Date.now();
      const result = await Promise.race([
        adapter.complete('Say "hello" in one word.'),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Connection timed out after 15 seconds')), 15000)
        ),
      ]);
      const latencyMs = Date.now() - start;

      return res.json({
        success: true,
        data: {
          model: providerId,
          response: result.content.slice(0, 100),
          latencyMs,
          tokenUsage: result.tokenUsage,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(400).json({
        success: false,
        error: `Connection failed: ${message}`,
      });
    }
  });

  /**
   * POST /api/providers/models
   * Fetches available models from a provider's API.
   * Body: { type, config: { api_key?, base_url? } }
   */
  router.post('/models', async (req, res) => {
    const { type, config: providerConfig } = req.body;

    if (!type) {
      return res.status(400).json({ success: false, error: 'Missing required field: type' });
    }

    try {
      let models: string[] = [];

      if (type === 'openai') {
        const OpenAI = (await import('openai')).default;
        const client = new OpenAI({
          apiKey: providerConfig?.api_key || process.env.OPENAI_API_KEY,
          ...(providerConfig?.base_url ? { baseURL: providerConfig.base_url } : {}),
        });
        const list = await client.models.list();
        models = list.data
          .map((m: { id: string }) => m.id)
          .filter((id: string) => id.includes('gpt') || id.includes('o1') || id.includes('o3') || id.includes('o4'))
          .sort();
      } else if (type === 'ollama') {
        const host = providerConfig?.base_url || process.env.OLLAMA_HOST || 'http://localhost:11434';
        const response = await fetch(`${host}/api/tags`);
        const data = await response.json() as { models?: { name: string }[] };
        models = (data.models || []).map((m: { name: string }) => m.name).sort();
      } else if (type === 'openapi') {
        if (providerConfig?.base_url) {
          const OpenAI = (await import('openai')).default;
          const client = new OpenAI({
            baseURL: providerConfig.base_url,
            apiKey: providerConfig?.api_key || 'no-key',
          });
          const list = await client.models.list();
          models = list.data.map((m: { id: string }) => m.id).sort();
        }
      }

      return res.json({ success: true, data: models });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return res.json({ success: true, data: [], error: message });
    }
  });

  return router;
}

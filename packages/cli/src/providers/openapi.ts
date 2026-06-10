import OpenAI from 'openai';
import { type ProviderConfig } from '../config/schema';
import { type ProviderAdapter, type CompletionResult } from './index';
import { withRetry } from '../utils/retry';

/**
 * Custom OpenAPI-compatible provider.
 *
 * Uses the OpenAI SDK with a custom baseURL to connect to any server
 * that implements the /v1/chat/completions contract:
 * - Azure OpenAI
 * - LiteLLM
 * - vLLM
 * - Together AI
 * - Fireworks
 * - Any local OpenAI-compatible server
 *
 * Config example in prompt_eval.yaml:
 *   - id: openapi:my-server
 *     config:
 *       base_url: http://localhost:8000/v1
 *       api_key: ${LOCAL_API_KEY}
 *       model: my-fine-tuned-model
 */
export class OpenAPIProvider implements ProviderAdapter {
  id: string;
  private client: OpenAI;
  private model: string;
  private config: ProviderConfig;

  constructor(config: ProviderConfig, name: string) {
    this.id = config.id;
    this.config = config;

    const baseURL = this.resolveEnvVars(config.config?.base_url || '');
    const apiKey = this.resolveEnvVars(config.config?.api_key || 'no-key');
    this.model = config.config?.model || name;

    if (!baseURL) {
      throw new Error(
        `OpenAPI provider "${name}" requires a base_url in config. ` +
        `Example: base_url: http://localhost:8000/v1`
      );
    }

    this.client = new OpenAI({
      baseURL,
      apiKey,
    });
  }

  async complete(prompt: string, systemPrompt?: string): Promise<CompletionResult> {
    return withRetry(async () => {
      const messages: { role: 'system' | 'user'; content: string }[] = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push({ role: 'user', content: prompt });

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: this.config.config?.temperature ?? 0.7,
        max_tokens: this.config.config?.max_tokens,
        top_p: this.config.config?.top_p,
      });

      const choice = response.choices[0];
      return {
        content: choice?.message?.content || '',
        tokenUsage: {
          prompt: response.usage?.prompt_tokens || 0,
          completion: response.usage?.completion_tokens || 0,
          total: response.usage?.total_tokens || 0,
        },
      };
    });
  }

  private resolveEnvVars(value: string): string {
    return value.replace(/\$\{(\w+)\}/g, (_, envVar) => {
      return process.env[envVar] || '';
    });
  }
}

import { Ollama } from 'ollama';
import { type ProviderConfig } from '../config/schema';
import { type ProviderAdapter, type CompletionResult } from './index';

export class OllamaProvider implements ProviderAdapter {
  id: string;
  private client: Ollama;
  private model: string;
  private config: ProviderConfig;

  constructor(config: ProviderConfig, model: string) {
    this.id = config.id;
    this.model = model;
    this.config = config;
    const host = config.config?.base_url || process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.client = new Ollama({
      host,
      ...(config.config?.api_key ? { headers: { Authorization: `Bearer ${config.config.api_key}` } } : {}),
    } as ConstructorParameters<typeof Ollama>[0]);
  }

  async complete(prompt: string, systemPrompt?: string): Promise<CompletionResult> {
    const messages: { role: 'system' | 'user'; content: string }[] = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const response = await this.client.chat({
      model: this.model,
      messages,
      options: {
        temperature: this.config.config?.temperature,
        top_p: this.config.config?.top_p,
      },
    });

    return {
      content: response.message.content,
      tokenUsage: {
        prompt: response.prompt_eval_count || 0,
        completion: response.eval_count || 0,
        total: (response.prompt_eval_count || 0) + (response.eval_count || 0),
      },
    };
  }
}

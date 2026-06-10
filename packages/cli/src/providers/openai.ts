import OpenAI from 'openai';
import { type ProviderConfig } from '../config/schema';
import { type ProviderAdapter, type CompletionResult } from './index';
import { withRetry } from '../utils/retry';

export class OpenAIProvider implements ProviderAdapter {
  id: string;
  private client: OpenAI;
  private model: string;
  private config: ProviderConfig;

  constructor(config: ProviderConfig, model: string) {
    this.id = config.id;
    this.model = model;
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.config?.api_key || process.env.OPENAI_API_KEY,
      ...(config.config?.base_url ? { baseURL: config.config.base_url } : {}),
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
}

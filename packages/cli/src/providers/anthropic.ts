import Anthropic from '@anthropic-ai/sdk';
import { type ProviderConfig } from '../config/schema';
import { type ProviderAdapter, type CompletionResult } from './index';
import { withRetry } from '../utils/retry';

export class AnthropicProvider implements ProviderAdapter {
  id: string;
  private client: Anthropic;
  private model: string;
  private config: ProviderConfig;

  constructor(config: ProviderConfig, model: string) {
    this.id = config.id;
    this.model = model;
    this.config = config;
    this.client = new Anthropic({
      apiKey: config.config?.api_key || process.env.ANTHROPIC_API_KEY,
    });
  }

  async complete(prompt: string, systemPrompt?: string): Promise<CompletionResult> {
    return withRetry(async () => {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.config.config?.max_tokens || 1024,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages: [{ role: 'user', content: prompt }],
        temperature: this.config.config?.temperature,
        top_p: this.config.config?.top_p,
      });

      const textBlock = response.content.find((block) => block.type === 'text');
      return {
        content: textBlock && 'text' in textBlock ? textBlock.text : '',
        tokenUsage: {
          prompt: response.usage.input_tokens,
          completion: response.usage.output_tokens,
          total: response.usage.input_tokens + response.usage.output_tokens,
        },
      };
    });
  }
}

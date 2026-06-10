import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { type ProviderConfig } from '../config/schema';
import { type ProviderAdapter, type CompletionResult } from './index';
import { withRetry } from '../utils/retry';

export class BedrockProvider implements ProviderAdapter {
  id: string;
  private client: BedrockRuntimeClient;
  private model: string;
  private config: ProviderConfig;

  constructor(config: ProviderConfig, model: string) {
    this.id = config.id;
    this.model = model;
    this.config = config;
    this.client = new BedrockRuntimeClient({
      region: config.config?.aws_region || process.env.AWS_REGION || 'us-east-1',
      ...(config.config?.aws_access_key_id && config.config?.aws_secret_access_key
        ? {
            credentials: {
              accessKeyId: config.config.aws_access_key_id,
              secretAccessKey: config.config.aws_secret_access_key,
            },
          }
        : {}),
    });
  }

  async complete(prompt: string, systemPrompt?: string): Promise<CompletionResult> {
    return withRetry(async () => {
      const body = JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: this.config.config?.max_tokens || 1024,
        ...(systemPrompt ? { system: [{ type: 'text', text: systemPrompt }] } : {}),
        messages: [{ role: 'user', content: prompt }],
        temperature: this.config.config?.temperature,
        top_p: this.config.config?.top_p,
      });

      const command = new InvokeModelCommand({
        modelId: this.model,
        body: new TextEncoder().encode(body),
        contentType: 'application/json',
        accept: 'application/json',
      });

      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      const content = responseBody.content?.[0]?.text || responseBody.completion || '';

      return {
        content,
        tokenUsage: {
          prompt: responseBody.usage?.input_tokens || 0,
          completion: responseBody.usage?.output_tokens || 0,
          total: (responseBody.usage?.input_tokens || 0) + (responseBody.usage?.output_tokens || 0),
        },
      };
    });
  }
}

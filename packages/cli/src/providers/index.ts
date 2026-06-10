import { type ProviderConfig } from '../config/schema';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { BedrockProvider } from './bedrock';
import { OllamaProvider } from './ollama';
import { OpenAPIProvider } from './openapi';

export interface CompletionResult {
  content: string;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface ProviderAdapter {
  id: string;
  complete(prompt: string, systemPrompt?: string): Promise<CompletionResult>;
}

export function createProvider(config: ProviderConfig): ProviderAdapter {
  const colonIdx = config.id.indexOf(':');
  const providerType = colonIdx >= 0 ? config.id.slice(0, colonIdx) : config.id;
  const modelName = colonIdx >= 0 ? config.id.slice(colonIdx + 1) : 'default';

  switch (providerType) {
    case 'openai':
      return new OpenAIProvider(config, modelName);
    case 'anthropic':
      return new AnthropicProvider(config, modelName);
    case 'bedrock':
      return new BedrockProvider(config, modelName);
    case 'ollama':
      return new OllamaProvider(config, modelName);
    case 'openapi':
      return new OpenAPIProvider(config, modelName);
    default:
      throw new Error(`Unknown provider type: ${providerType}. Supported: openai, anthropic, bedrock, ollama, openapi`);
  }
}

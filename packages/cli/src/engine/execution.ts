import { loadPromptFile, loadEnvFile } from '../config/loader';
import { type EvalConfig, type TestCase } from '../config/schema';
import { createProvider, type ProviderAdapter } from '../providers';
import { CacheManager } from '../cache/manager';
import { createHash } from 'crypto';

export interface ExecutionResult {
  testIndex: number;
  promptId: string;
  providerId: string;
  response: string;
  latencyMs: number;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
  error: string | null;
  cached: boolean;
}

export class ExecutionEngine {
  private cwd: string;
  private config: EvalConfig;
  private cache: CacheManager;
  private providers: Map<string, ProviderAdapter> = new Map();

  constructor(cwd: string, config: EvalConfig) {
    this.cwd = cwd;
    this.config = config;
    this.cache = new CacheManager(cwd);

    // Load environment variables
    loadEnvFile(cwd);

    // Initialize providers
    for (const providerConfig of config.providers) {
      const adapter = createProvider(providerConfig);
      this.providers.set(providerConfig.id, adapter);
    }
  }

  async executeAll(): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];
    const tasks: Promise<ExecutionResult>[] = [];

    // Use first prompt as system prompt
    const promptConfig = this.config.prompts[0];
    const systemPrompt = promptConfig
      ? (promptConfig.content || loadPromptFile(this.cwd, promptConfig.file!))
      : '';
    const promptId = promptConfig?.id || 'v1';

    for (let testIdx = 0; testIdx < this.config.tests.length; testIdx++) {
      const test = this.config.tests[testIdx];

      for (const [providerId, provider] of this.providers) {
        tasks.push(
          this.executeSingle(testIdx, promptId, providerId, provider, systemPrompt, test)
        );
      }
    }

    // Execute all tasks in parallel
    const settled = await Promise.allSettled(tasks);

    for (const result of settled) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.error('Execution error:', result.reason);
      }
    }

    return results;
  }

  async executeSingle(
    testIndex: number,
    promptId: string,
    providerId: string,
    provider: ProviderAdapter,
    systemPromptRaw: string,
    test: TestCase,
    bypassCache: boolean = false
  ): Promise<ExecutionResult> {
    // Interpolate variables into system prompt and user prompt
    let resolvedSystemPrompt = systemPromptRaw;
    let resolvedUserPrompt = test.user_prompt || '';

    if (this.config.use_variables && test.vars) {
      for (const [key, value] of Object.entries(test.vars)) {
        const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
        resolvedSystemPrompt = resolvedSystemPrompt.replace(pattern, value);
        resolvedUserPrompt = resolvedUserPrompt.replace(pattern, value);
      }
    }

    // Check cache
    const cacheKey = this.computeCacheKey(resolvedSystemPrompt, resolvedUserPrompt, providerId);
    if (!bypassCache) {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return {
          testIndex,
          promptId,
          providerId,
          response: cached.response,
          latencyMs: cached.latencyMs,
          tokenUsage: cached.tokenUsage,
          error: null,
          cached: true,
        };
      }
    }

    // Execute with provider
    const startTime = Date.now();
    try {
      const result = await provider.complete(resolvedUserPrompt, resolvedSystemPrompt || undefined);
      const latencyMs = Date.now() - startTime;

      const execResult: ExecutionResult = {
        testIndex,
        promptId,
        providerId,
        response: result.content,
        latencyMs,
        tokenUsage: result.tokenUsage,
        error: null,
        cached: false,
      };

      // Store in cache
      await this.cache.set(cacheKey, {
        response: result.content,
        latencyMs,
        tokenUsage: result.tokenUsage,
      });

      return execResult;
    } catch (err) {
      return {
        testIndex,
        promptId,
        providerId,
        response: '',
        latencyMs: Date.now() - startTime,
        tokenUsage: { prompt: 0, completion: 0, total: 0 },
        error: err instanceof Error ? err.message : String(err),
        cached: false,
      };
    }
  }

  private computeCacheKey(systemPrompt: string, userPrompt: string, providerId: string): string {
    const data = JSON.stringify({ systemPrompt, userPrompt, providerId });
    return createHash('sha256').update(data).digest('hex');
  }

  getCache(): CacheManager {
    return this.cache;
  }
}

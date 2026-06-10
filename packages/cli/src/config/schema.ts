import { z } from 'zod';

const providerConfigSchema = z.object({
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().positive().optional(),
  top_p: z.number().min(0).max(1).optional(),
  base_url: z.string().optional(),
  api_key: z.string().optional(),
  model: z.string().optional(),
  aws_region: z.string().optional(),
  aws_access_key_id: z.string().optional(),
  aws_secret_access_key: z.string().optional(),
  team_id: z.string().optional(),
  project_id: z.string().optional(),
});

const providerSchema = z.object({
  id: z.string(),
  config: providerConfigSchema.optional(),
});

const promptSchema = z.object({
  id: z.string(),
  file: z.string().optional(),
  content: z.string().optional(),
});

const assertionSchema = z.object({
  type: z.enum([
    'is-json',
    'equals-json',
    'matches-schema',
    'contains-substring',
    'latency',
    'llm-rubric',
    'semantic-similarity',
  ]),
  value: z.union([z.string(), z.number()]).optional(),
  provider: z.string().optional(),
});

const testCaseSchema = z.object({
  user_prompt: z.string().optional(),
  vars: z.record(z.string()).optional(),
  assert: z.array(assertionSchema).optional(),
});

export const configSchema = z.object({
  version: z.string().optional().default('1.0'),
  description: z.string().optional(),
  providers: z.array(providerSchema),
  prompts: z.array(promptSchema),
  tests: z.array(testCaseSchema),
  grader_mode: z.enum(['assertions', 'model-grader']).optional(),
  model_grader_prompt: z.string().optional(),
  use_variables: z.boolean().optional(),
});

export type EvalConfig = z.infer<typeof configSchema>;
export type ProviderConfig = z.infer<typeof providerSchema>;
export type PromptConfig = z.infer<typeof promptSchema>;
export type TestCase = z.infer<typeof testCaseSchema>;
export type Assertion = z.infer<typeof assertionSchema>;

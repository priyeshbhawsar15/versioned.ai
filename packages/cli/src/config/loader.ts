import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { configSchema, type EvalConfig } from './schema';

export function loadConfig(cwd: string, configPath?: string): EvalConfig | null {
  const filePath = path.resolve(cwd, configPath || 'prompt_eval.yaml');

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = yaml.load(raw) as Record<string, unknown>;

  // Validate with Zod
  const result = configSchema.safeParse(parsed);

  if (!result.success) {
    console.error('Invalid prompt_eval.yaml:', result.error.format());
    return null;
  }

  return result.data;
}

export function loadPromptFile(cwd: string, filePath: string): string {
  const fullPath = path.resolve(cwd, filePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Prompt file not found: ${fullPath}`);
  }
  return fs.readFileSync(fullPath, 'utf-8');
}

export function loadEnvFile(cwd: string): void {
  const envPath = path.resolve(cwd, '.env');
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
  }
}

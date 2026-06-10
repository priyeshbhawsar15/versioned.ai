import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { configSchema, type EvalConfig } from './schema';

export class ConfigStore {
  private config: EvalConfig | null = null;
  private cwd: string;
  private configPath: string;

  constructor(cwd: string, configPath?: string) {
    this.cwd = cwd;
    this.configPath = path.resolve(cwd, configPath || 'prompt_eval.yaml');
    this.load();
  }

  private load(): void {
    if (!fs.existsSync(this.configPath)) {
      this.config = null;
      return;
    }

    const raw = fs.readFileSync(this.configPath, 'utf-8');
    const parsed = yaml.load(raw) as Record<string, unknown>;
    const result = configSchema.safeParse(parsed);

    if (!result.success) {
      console.error('Invalid prompt_eval.yaml:', result.error.format());
      this.config = null;
      return;
    }

    this.config = result.data;
  }

  get(): EvalConfig | null {
    return this.config;
  }

  update(partial: Partial<EvalConfig>): EvalConfig {
    if (!this.config) {
      this.config = {
        version: '1.0',
        description: '',
        providers: [],
        prompts: [],
        tests: [],
        ...partial,
      };
    } else {
      this.config = { ...this.config, ...partial };
    }

    this.save();
    return this.config;
  }

  private save(): void {
    if (!this.config) return;

    const output = yaml.dump(this.config, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
      quotingType: '"',
      forceQuotes: false,
    });

    fs.writeFileSync(this.configPath, output, 'utf-8');
  }

  getCwd(): string {
    return this.cwd;
  }

  getConfigPath(): string {
    return this.configPath;
  }
}

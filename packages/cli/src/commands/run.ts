import chalk from 'chalk';
import { loadConfig } from '../config/loader';
import { ExecutionEngine } from '../engine/execution';
import { evaluateResults } from '../graders';

interface RunOptions {
  config: string;
  ci: boolean;
}

export async function runCommand(options: RunOptions) {
  const cwd = process.cwd();

  console.log(chalk.blue.bold('\n  Versioned.AI') + chalk.gray(' — headless execution mode\n'));

  // Load config
  const config = loadConfig(cwd, options.config);
  if (!config) {
    console.error(chalk.red('  ✗ No prompt_eval.yaml found at:'), options.config);
    process.exit(1);
  }

  console.log(chalk.green('  ✓ Config loaded:'), chalk.gray(config.description || 'prompt_eval.yaml'));
  console.log(chalk.gray(`  Providers: ${config.providers.length} | Tests: ${config.tests.length}\n`));

  // Execute matrix
  const engine = new ExecutionEngine(cwd, config);
  const results = await engine.executeAll();

  // Evaluate results
  const evaluation = await evaluateResults(results, config);

  // Print summary
  const totalTests = evaluation.results.length;
  const passed = evaluation.results.filter((r) => r.pass).length;
  const failed = totalTests - passed;

  console.log(chalk.bold('\n  Results Summary'));
  console.log(chalk.green(`    ✓ Passed: ${passed}`));
  if (failed > 0) {
    console.log(chalk.red(`    ✗ Failed: ${failed}`));
  }
  console.log(chalk.gray(`    Total:   ${totalTests}\n`));

  // CI mode exit code
  if (options.ci && failed > 0) {
    process.exit(1);
  }
}

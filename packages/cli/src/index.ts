#!/usr/bin/env node

import { Command } from 'commander';
import { devCommand } from './commands/dev';
import { runCommand } from './commands/run';

const program = new Command();

program
  .name('versioned-ai')
  .description('Versioned.AI — AI Prompt Playground & Regression Evaluation Platform')
  .version('0.1.0');

program
  .command('dev')
  .description('Start the local UI server and open the playground')
  .option('-p, --port <port>', 'Port to run the server on', '3000')
  .option('--no-open', 'Do not automatically open the browser')
  .action(devCommand);

program
  .command('run')
  .description('Run evaluation matrix in headless mode (CI/CD)')
  .option('-c, --config <path>', 'Path to prompt_eval.yaml', './prompt_eval.yaml')
  .option('--ci', 'Enable CI mode with exit codes')
  .action(runCommand);

program.parse();

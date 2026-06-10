import path from 'path';
import express from 'express';
import cors from 'cors';
import chalk from 'chalk';
import { ConfigStore } from '../config/store';
import { createApiRouter } from '../routes';

interface DevOptions {
  port: string;
  open: boolean;
}

export async function devCommand(options: DevOptions) {
  const port = parseInt(options.port, 10);
  const cwd = process.cwd();

  console.log(chalk.blue.bold('\n  Versioned.AI') + chalk.gray(' — starting dev server...\n'));

  // Load config (mutable store — UI changes write back to disk)
  const store = new ConfigStore(cwd);
  const config = store.get();
  if (!config) {
    console.log(chalk.yellow('  ⚠ No prompt_eval.yaml found in current directory.'));
    console.log(chalk.gray('    The UI will create one when you add providers or prompts.\n'));
  } else {
    console.log(chalk.green('  ✓ Config loaded:'), chalk.gray(config.description || 'prompt_eval.yaml'));
  }

  // Create Express app
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Mount API routes
  app.use('/api', createApiRouter(cwd, store));

  // Serve static UI assets
  const uiPath = path.join(__dirname, '..', 'ui');
  app.use(express.static(uiPath));

  // SPA fallback — serve index.html for all non-API routes
  app.get('*', (_req, res) => {
    res.sendFile(path.join(uiPath, 'index.html'));
  });

  // Start server
  app.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log(chalk.green(`  ✓ Server running at ${chalk.bold(url)}`));
    console.log(chalk.gray(`  Working directory: ${cwd}\n`));

    // Auto-open browser
    if (options.open !== false) {
      import('open').then((mod) => mod.default(url)).catch(() => {
        // Silently fail if browser can't open
      });
    }
  });
}

import { Router } from 'express';
import { ConfigStore } from '../config/store';
import { configRouter } from './config';
import { runRouter } from './run';
import { resultsRouter } from './results';
import { cacheRouter } from './cache';
import { providersRouter } from './providers';
import { datasetsRouter } from './datasets';

export function createApiRouter(cwd: string, store: ConfigStore): Router {
  const router = Router();

  router.use('/config', configRouter(store));
  router.use('/run', runRouter(cwd, store));
  router.use('/results', resultsRouter());
  router.use('/cache', cacheRouter(cwd));
  router.use('/providers', providersRouter(store));
  router.use('/datasets', datasetsRouter(store));

  return router;
}

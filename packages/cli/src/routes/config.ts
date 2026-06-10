import { Router } from 'express';
import { ConfigStore } from '../config/store';

export function configRouter(store: ConfigStore): Router {
  const router = Router();

  /**
   * GET /api/config
   * Returns the parsed prompt_eval.yaml configuration.
   */
  router.get('/', (_req, res) => {
    const config = store.get();
    if (!config) {
      return res.status(404).json({
        error: 'No configuration found',
        message: 'No prompt_eval.yaml file found in the current working directory.',
      });
    }

    return res.json({
      success: true,
      data: config,
    });
  });

  /**
   * PUT /api/config
   * Updates prompt_eval.yaml with the provided partial config.
   * Merges with existing config and writes back to disk.
   */
  router.put('/', (req, res) => {
    try {
      const updated = store.update(req.body);
      return res.json({
        success: true,
        data: updated,
        message: 'Configuration updated and saved to prompt_eval.yaml',
      });
    } catch (err) {
      return res.status(500).json({
        error: 'Failed to update config',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });

  return router;
}

import { Router } from 'express';
import { CacheManager } from '../cache/manager';

export function cacheRouter(cwd: string): Router {
  const router = Router();

  /**
   * POST /api/cache/bypass
   * Marks a specific cache entry for bypass on the next run.
   * Body: { key: string }
   */
  router.post('/bypass', async (req, res) => {
    const { key } = req.body;

    if (!key || typeof key !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'A valid cache key must be provided.',
      });
    }

    try {
      const cache = new CacheManager(cwd);
      await cache.delete(key);
      await cache.close();

      return res.json({
        success: true,
        message: `Cache entry "${key}" deleted. Next execution will re-fetch from provider.`,
      });
    } catch (err) {
      return res.status(500).json({
        error: 'Cache operation failed',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });

  /**
   * DELETE /api/cache
   * Clears the entire cache.
   */
  router.delete('/', async (_req, res) => {
    try {
      const cache = new CacheManager(cwd);
      await cache.clear();
      await cache.close();

      return res.json({
        success: true,
        message: 'Cache cleared successfully.',
      });
    } catch (err) {
      return res.status(500).json({
        error: 'Cache clear failed',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });

  return router;
}

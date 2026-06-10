import { Router } from 'express';
import { getLatestResults, getLatestEvaluation } from './run';

export function resultsRouter(): Router {
  const router = Router();

  /**
   * GET /api/results
   * Returns the latest execution results and evaluation.
   */
  router.get('/', (_req, res) => {
    const results = getLatestResults();
    const evaluation = getLatestEvaluation();

    if (results.length === 0) {
      return res.status(404).json({
        error: 'No results available',
        message: 'No test execution has been run yet. Use POST /api/run to trigger execution.',
      });
    }

    return res.json({
      success: true,
      data: {
        results,
        evaluation,
        summary: evaluation
          ? {
              totalTests: evaluation.results.length,
              passed: evaluation.totalPass,
              failed: evaluation.totalFail,
              passRate: evaluation.passRate,
              avgScore: evaluation.avgScore,
            }
          : null,
      },
    });
  });

  /**
   * GET /api/results/:testIndex
   * Returns results for a specific test case.
   */
  router.get('/:testIndex', (req, res) => {
    const testIndex = parseInt(req.params.testIndex, 10);
    const results = getLatestResults();

    const filtered = results.filter((r) => r.testIndex === testIndex);

    if (filtered.length === 0) {
      return res.status(404).json({
        error: 'No results for test index',
        message: `No results found for test index ${testIndex}.`,
      });
    }

    return res.json({
      success: true,
      data: filtered,
    });
  });

  return router;
}

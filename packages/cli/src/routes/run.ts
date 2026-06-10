import { Router } from 'express';
import { ConfigStore } from '../config/store';
import { ExecutionEngine, type ExecutionResult } from '../engine/execution';
import { evaluateResults } from '../graders';

// In-memory store for the latest execution results
let latestResults: ExecutionResult[] = [];
let latestEvaluation: Awaited<ReturnType<typeof evaluateResults>> | null = null;
let isRunning = false;

export function runRouter(cwd: string, store: ConfigStore): Router {
  const router = Router();

  /**
   * POST /api/run
   * Triggers matrix execution for all providers × prompts × tests.
   * Body: { bypassCache?: boolean, testIndices?: number[], promptIds?: string[], providerIds?: string[] }
   */
  router.post('/', async (req, res) => {
    const config = store.get();
    if (!config) {
      return res.status(400).json({
        error: 'No configuration loaded',
        message: 'Cannot run without a prompt_eval.yaml file. Create one or use the UI to add providers and prompts.',
      });
    }

    if (isRunning) {
      return res.status(409).json({
        error: 'Execution in progress',
        message: 'A test run is already in progress. Please wait for it to complete.',
      });
    }

    // Validate assertions before running
    const graderMode = config.grader_mode || 'assertions';

    if (graderMode === 'assertions') {
      const testsWithoutAssertions = config.tests.filter(
        (t, i) => !t.assert || t.assert.length === 0
      );
      if (testsWithoutAssertions.length > 0) {
        return res.status(400).json({
          error: 'Missing assertions',
          message: `${testsWithoutAssertions.length} test case(s) have no assertions defined. Add assertions on the Datasets page before running.`,
        });
      }
    }

    if (graderMode === 'model-grader') {
      if (!config.model_grader_prompt || config.model_grader_prompt.trim() === '') {
        return res.status(400).json({
          error: 'Missing model grader prompt',
          message: 'Set a model grader prompt on the Datasets page before running.',
        });
      }
    }

    const testsWithoutUserPrompt = config.tests.filter(
      (t) => !t.user_prompt || t.user_prompt.trim() === ''
    );
    if (testsWithoutUserPrompt.length > 0) {
      return res.status(400).json({
        error: 'Missing user prompts',
        message: `${testsWithoutUserPrompt.length} test case(s) have no user prompt. Add user prompts on the Datasets page before running.`,
      });
    }

    isRunning = true;

    try {
      // For model-grader mode, inject llm-rubric assertions in-memory
      let evalConfig = config;
      if (graderMode === 'model-grader' && config.model_grader_prompt) {
        const rubricValue = `${config.model_grader_prompt}\n\nIMPORTANT: You MUST assign a percentage score (0-100) evaluating how well the response meets the criteria above. Respond with ONLY a JSON object: {"score": <0-100>, "pass": <true if score >= 70>, "reason": "brief explanation"}`;
        evalConfig = {
          ...config,
          tests: config.tests.map((t) => ({
            ...t,
            assert: [
              { type: 'llm-rubric' as const, value: rubricValue },
            ],
          })),
        };
      }

      const engine = new ExecutionEngine(cwd, config);
      latestResults = await engine.executeAll();
      latestEvaluation = await evaluateResults(latestResults, evalConfig);

      return res.json({
        success: true,
        data: {
          results: latestResults,
          evaluation: latestEvaluation,
        },
      });
    } catch (err) {
      return res.status(500).json({
        error: 'Execution failed',
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      isRunning = false;
    }
  });

  /**
   * GET /api/run/status
   * Returns current execution status.
   */
  router.get('/status', (_req, res) => {
    return res.json({
      isRunning,
      hasResults: latestResults.length > 0,
      resultCount: latestResults.length,
    });
  });

  return router;
}

export function getLatestResults(): ExecutionResult[] {
  return latestResults;
}

export function getLatestEvaluation() {
  return latestEvaluation;
}

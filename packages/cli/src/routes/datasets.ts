import { Router } from 'express';
import { ConfigStore } from '../config/store';
import { createProvider } from '../providers/index';

export function datasetsRouter(store: ConfigStore): Router {
  const router = Router();

  /**
   * POST /api/datasets/generate
   * Uses a connected LLM provider to generate test cases based on prompts and scenario.
   */
  router.post('/generate', async (req, res) => {
    try {
      const { scenario, count, graderMode, useVariables } = req.body;
      const numCases = Math.min(Math.max(parseInt(count, 10) || 5, 1), 50);

      const config = store.get();
      if (!config) {
        return res.status(400).json({ success: false, error: 'No configuration found.' });
      }

      // Extract system prompt from config
      const systemPrompt = config.prompts?.find((p) => p.id === 'v1')?.content || '';

      if (!systemPrompt) {
        return res.status(400).json({
          success: false,
          error: 'Add a system prompt in the Playground first.',
        });
      }

      // Pick the first connected provider
      if (!config.providers || config.providers.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No providers configured. Add a provider first.',
        });
      }

      const providerConfig = config.providers[0];
      const adapter = createProvider(providerConfig);

      const assertionTypes = [
        'is-json — checks the response is valid JSON',
        'contains-substring — checks the response contains a specific substring (value = the substring)',
        'matches-schema — checks the response matches a JSON schema (value = schema as JSON string)',
        'latency — checks response time is under a threshold (value = max milliseconds as number)',
      ];

      // Build vars instruction if variables are enabled
      const varsInstruction = useVariables
        ? `\n- "vars": an object of template variable key-value pairs for {{variable}} interpolation in prompts`
        : '';
      const varsExample = useVariables ? `\n  "vars": { "key": "value" },` : '';

      let generationPrompt: string;

      if (graderMode === 'model-grader') {
        generationPrompt = `You are a test-case generator for an LLM evaluation platform.

The system prompt being tested:
${systemPrompt}

${scenario ? `Scenario: ${scenario}` : ''}

Generate exactly ${numCases} diverse test cases. Each test case must include a "user_prompt" — the message a user would send to the system.${useVariables ? ' Also include "vars" with template variables.' : ''}

Return ONLY a valid JSON array. Each element must have this structure:
{
  "user_prompt": "the user message",${varsExample}
}

Rules:
- Make user_prompt values diverse and realistic — they should test different aspects of the system prompt.${useVariables ? '\n- Include vars with relevant template variable values.' : ''}
- Return ONLY the JSON array, no markdown fences, no explanation.`;
      } else {
        generationPrompt = `You are a test-case generator for an LLM evaluation platform.

The system prompt being tested:
${systemPrompt}

${scenario ? `Scenario: ${scenario}` : ''}

Generate exactly ${numCases} diverse test cases with appropriate assertions. Each test case must include:
- "user_prompt": the message a user would send to the system${varsInstruction}
- "assert": an array of assertions to verify the response

Available assertion types:
${assertionTypes.map((t) => `- ${t}`).join('\n')}

Return ONLY a valid JSON array. Each element must have this structure:
{
  "user_prompt": "the user message",${varsExample}
  "assert": [{ "type": "assertion-type", "value": "expected-value" }]
}

Rules:
- Make user_prompt values diverse and realistic.
- Pick the most appropriate assertion types for each test case.
- For "is-json", no value is needed.
- For "contains-substring", value is the expected substring.
- For "latency", value is max milliseconds as a number.

Return ONLY the JSON array, no markdown fences, no explanation.`;
      }

      // Call the provider
      const result = await Promise.race([
        adapter.complete(generationPrompt),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Generation timed out after 60 seconds')), 60000)
        ),
      ]);

      // Parse the JSON response
      let tests: unknown[];
      try {
        // Strip markdown code fences if present
        let content = result.content.trim();
        if (content.startsWith('```')) {
          content = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }
        tests = JSON.parse(content);
        if (!Array.isArray(tests)) {
          throw new Error('Response is not an array');
        }
      } catch {
        return res.status(500).json({
          success: false,
          error: 'Failed to parse generated test cases. The model did not return valid JSON.',
          raw: result.content,
        });
      }

      // Normalize and validate each test case
      const validTests = tests
        .map((t: any) => {
          const tc: { user_prompt?: string; vars?: Record<string, string>; assert?: { type: string; value?: string | number }[] } = {};
          // user_prompt
          tc.user_prompt = typeof t.user_prompt === 'string' ? t.user_prompt : '';
          // vars (only if enabled)
          if (useVariables && t.vars && typeof t.vars === 'object') {
            tc.vars = Object.fromEntries(
              Object.entries(t.vars).map(([k, v]) => [k, String(v)])
            );
          }
          // assertions
          if (graderMode !== 'model-grader' && Array.isArray(t.assert)) {
            tc.assert = t.assert
              .filter(
                (a: any) =>
                  a &&
                  typeof a.type === 'string' &&
                  ['is-json', 'equals-json', 'matches-schema', 'contains-substring', 'latency', 'llm-rubric', 'semantic-similarity'].includes(a.type)
              )
              .map((a: any) => {
                const assertion: { type: string; value?: string | number } = { type: a.type };
                if (a.value !== undefined) assertion.value = a.value;
                return assertion;
              });
          }
          return tc;
        })
        .filter((t) => t.user_prompt);

      if (validTests.length === 0) {
        return res.status(500).json({
          success: false,
          error: 'No valid test cases could be extracted from the model response.',
          raw: result.content,
        });
      }

      return res.json({
        success: true,
        data: validTests,
        count: validTests.length,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  return router;
}

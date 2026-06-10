import { type Assertion, type EvalConfig } from '../config/schema';
import { type ExecutionResult } from '../engine/execution';
import { createProvider, type ProviderAdapter } from '../providers';
import { type AssertionResult } from './index';

function getGradingProvider(config: EvalConfig): ProviderAdapter {
  if (!config.providers || config.providers.length === 0) {
    throw new Error('No providers configured. Add a provider to use model grading.');
  }
  return createProvider(config.providers[0]);
}

export async function modelGrade(
  assertion: Assertion,
  execResult: ExecutionResult,
  config: EvalConfig
): Promise<AssertionResult> {
  switch (assertion.type) {
    case 'llm-rubric':
      return gradeLlmRubric(assertion, execResult, config);

    case 'semantic-similarity':
      return gradeSemanticSimilarity(assertion, execResult, config);

    default:
      return { type: assertion.type, pass: false, message: `Unknown model grader: ${assertion.type}` };
  }
}

async function gradeLlmRubric(
  assertion: Assertion,
  execResult: ExecutionResult,
  config: EvalConfig
): Promise<AssertionResult> {
  const rubric = assertion.value as string;

  try {
    const provider = getGradingProvider(config);

    const systemPrompt = `You are an evaluation judge. Given an LLM response and a rubric, determine if the response meets the criteria. You MUST assign a percentage score from 0 to 100. Respond with ONLY a valid JSON object: {"score": <0-100>, "pass": <true if score >= 70, false otherwise>, "reason": "brief explanation"}`;

    const userPrompt = `Rubric: ${rubric}\n\nLLM Response to evaluate:\n${execResult.response}`;

    const result = await provider.complete(userPrompt, systemPrompt);

    let content = result.content.trim();
    if (content.startsWith('```')) {
      content = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    const parsed = JSON.parse(content);
    const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));

    return {
      type: 'llm-rubric',
      pass: score >= 70,
      score,
      message: parsed.reason || 'LLM judge evaluation',
      expected: rubric,
      actual: execResult.response.slice(0, 200),
    };
  } catch (err) {
    return {
      type: 'llm-rubric',
      pass: false,
      message: `LLM rubric grading failed: ${err instanceof Error ? err.message : String(err)}`,
      expected: rubric,
    };
  }
}

async function gradeSemanticSimilarity(
  assertion: Assertion,
  execResult: ExecutionResult,
  config: EvalConfig
): Promise<AssertionResult> {
  const expectedText = assertion.value as string;

  try {
    const provider = getGradingProvider(config);

    const systemPrompt = `You compare two texts for semantic similarity. Respond with ONLY a valid JSON object: {"score": 0.0-1.0, "reason": "brief explanation"}. A score >= 0.7 is considered a pass.`;

    const userPrompt = `Text A (expected):\n${expectedText}\n\nText B (actual):\n${execResult.response}`;

    const result = await provider.complete(userPrompt, systemPrompt);

    let content = result.content.trim();
    if (content.startsWith('```')) {
      content = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    const parsed = JSON.parse(content);
    const rawScore = parseFloat(parsed.score) || 0;
    const pctScore = Math.round(rawScore * 100);

    return {
      type: 'semantic-similarity',
      pass: rawScore >= 0.7,
      score: pctScore,
      message: `Similarity: ${pctScore}% — ${parsed.reason || ''}`,
      expected: expectedText.slice(0, 100),
      actual: execResult.response.slice(0, 100),
    };
  } catch (err) {
    return {
      type: 'semantic-similarity',
      pass: false,
      message: `Semantic similarity grading failed: ${err instanceof Error ? err.message : String(err)}`,
      expected: expectedText?.slice(0, 100),
    };
  }
}

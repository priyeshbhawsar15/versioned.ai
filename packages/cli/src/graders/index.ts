import { type EvalConfig, type Assertion } from '../config/schema';
import { type ExecutionResult } from '../engine/execution';
import { systematicGrade } from './systematic';
import { modelGrade } from './model';

export interface GradeResult {
  testIndex: number;
  promptId: string;
  providerId: string;
  pass: boolean;
  score?: number;
  assertions: AssertionResult[];
}

export interface AssertionResult {
  type: string;
  pass: boolean;
  message: string;
  score?: number;
  expected?: string;
  actual?: string;
}

export interface EvaluationSummary {
  results: GradeResult[];
  totalPass: number;
  totalFail: number;
  passRate: number;
  avgScore?: number;
}

export async function evaluateResults(
  execResults: ExecutionResult[],
  config: EvalConfig
): Promise<EvaluationSummary> {
  const gradeResults: GradeResult[] = [];

  for (const execResult of execResults) {
    const test = config.tests[execResult.testIndex];
    const assertions = test.assert || [];

    const assertionResults: AssertionResult[] = [];

    for (const assertion of assertions) {
      const result = await gradeAssertion(assertion, execResult, config);
      assertionResults.push(result);
    }

    const allPassed = assertionResults.length === 0 || assertionResults.every((a) => a.pass);
    const scores = assertionResults.filter((a) => a.score !== undefined).map((a) => a.score!);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : undefined;

    gradeResults.push({
      testIndex: execResult.testIndex,
      promptId: execResult.promptId,
      providerId: execResult.providerId,
      pass: allPassed,
      score: avgScore,
      assertions: assertionResults,
    });
  }

  const totalPass = gradeResults.filter((r) => r.pass).length;
  const totalFail = gradeResults.length - totalPass;
  const allScores = gradeResults.filter((r) => r.score !== undefined).map((r) => r.score!);
  const avgScore = allScores.length > 0 ? Math.round(allScores.reduce((s, v) => s + v, 0) / allScores.length) : undefined;

  return {
    results: gradeResults,
    totalPass,
    totalFail,
    passRate: gradeResults.length > 0 ? totalPass / gradeResults.length : 0,
    avgScore,
  };
}

async function gradeAssertion(
  assertion: Assertion,
  execResult: ExecutionResult,
  config: EvalConfig
): Promise<AssertionResult> {
  switch (assertion.type) {
    case 'is-json':
    case 'equals-json':
    case 'matches-schema':
    case 'contains-substring':
    case 'latency':
      return systematicGrade(assertion, execResult);

    case 'llm-rubric':
    case 'semantic-similarity':
      return modelGrade(assertion, execResult, config);

    default:
      return {
        type: assertion.type,
        pass: false,
        message: `Unknown assertion type: ${assertion.type}`,
      };
  }
}

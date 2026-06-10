'use client';

import { useApi } from '@/hooks/useApi';
import { useRun } from '@/context/RunContext';
import EmptyState from '@/components/EmptyState';
import SkeletonPulse from '@/components/SkeletonPulse';

interface AssertionResult {
  type: string;
  pass: boolean;
  message: string;
  score?: number;
}

interface ResultsData {
  results: {
    testIndex: number;
    promptId: string;
    providerId: string;
    response: string;
    latencyMs: number;
    tokenUsage: { prompt: number; completion: number; total: number };
    error: string | null;
    cached: boolean;
  }[];
  evaluation?: {
    results: {
      testIndex: number;
      promptId: string;
      providerId: string;
      pass: boolean;
      score?: number;
      assertions: AssertionResult[];
    }[];
    avgScore?: number;
  };
}

interface ConfigData {
  tests?: {
    user_prompt?: string;
    vars?: Record<string, string>;
    assert?: { type: string; value?: string | number }[];
  }[];
  grader_mode?: string;
}

export default function EvaluationMatrix() {
  const { runVersion, configVersion, runState } = useRun();
  const { data, loading } = useApi<ResultsData>('/results', runVersion);
  const { data: config } = useApi<ConfigData>('/config', configVersion);

  const tests = config?.tests || [];
  const graderMode = config?.grader_mode || 'assertions';
  const hasAssertionIssues =
    graderMode === 'assertions' && tests.some((t) => !t.assert || t.assert.length === 0);

  const hasResults = data?.results && data.results.length > 0;

  return (
    <>
      {/* Matrix Header */}
      <div className="px-4 py-1 bg-[#222a3d] border-b border-[#424754] flex items-center justify-between shrink-0 h-10">
        <h2 className="text-[11px] font-medium tracking-[0.05em] leading-4 font-mono text-[#dae2fd] font-semibold flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">grid_on</span>
          Evaluation Matrix
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 mr-2 border-r border-[#424754] pr-2">
            <span className="text-[11px] font-medium tracking-[0.05em] leading-4 font-mono text-[#c2c6d6]">
              Diff Mode
            </span>
            <button className="w-8 h-4 bg-[#2d3449] rounded-full relative flex items-center px-[2px] transition-colors hover:bg-[#adc6ff]/20">
              <div className="w-3 h-3 bg-[#8c909f] rounded-full transition-all" />
            </button>
          </div>
          <span className="text-[11px] font-medium tracking-[0.05em] leading-4 font-mono text-[#8c909f]">
            {hasResults ? data!.results.length : 0} Results
          </span>
        </div>
      </div>
      {/* Missing assertions warning */}
      {hasAssertionIssues && (
        <div className="px-4 py-2 bg-[#93000a]/15 border-b border-[#ffb4ab]/20 flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-[#ffb4ab]">warning</span>
          <span className="text-[13px] text-[#ffb4ab]">
            Some test cases have no assertions defined. Add assertions on the{' '}
            <a href="/datasets" className="underline hover:text-[#ff897e]">Datasets page</a>{' '}
            before running.
          </span>
        </div>
      )}
      {/* Run error banner */}
      {runState.error && (
        <div className="px-4 py-2 bg-[#93000a]/15 border-b border-[#ffb4ab]/20 flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-[#ffb4ab]">error</span>
          <span className="text-[13px] text-[#ffb4ab]">{runState.error}</span>
        </div>
      )}
      {/* Content */}
      <div className="flex-1 overflow-auto relative">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-2">
                <SkeletonPulse className="h-16 w-1/4" />
                <SkeletonPulse className="h-16 flex-1" />
                <SkeletonPulse className="h-16 flex-1" />
              </div>
            ))}
          </div>
        ) : hasResults ? (
          <div className="p-4">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-[#222a3d] border-b border-[#424754] text-[11px] font-medium tracking-[0.05em] leading-4 font-mono text-[#8c909f]">
                  <th className="p-2 font-medium sticky top-0 bg-[#222a3d] z-10">Test</th>
                  <th className="p-2 font-medium sticky top-0 bg-[#222a3d] z-10">Provider</th>
                  <th className="p-2 font-medium sticky top-0 bg-[#222a3d] z-10">Response</th>
                  <th className="p-2 font-medium sticky top-0 bg-[#222a3d] z-10 w-20">Status</th>
                  <th className="p-2 font-medium sticky top-0 bg-[#222a3d] z-10">Reason</th>
                </tr>
              </thead>
              <tbody className="font-mono text-[13px] leading-5 align-top">
                {data!.results.map((result, idx) => {
                  const evalResult = data!.evaluation?.results.find(
                    (e) => e.testIndex === result.testIndex && e.providerId === result.providerId
                  );
                  const pass = evalResult?.pass ?? !result.error;
                  const assertions = evalResult?.assertions || [];
                  const score = evalResult?.score;
                  const testCase = tests[result.testIndex];
                  return (
                    <tr key={idx} className="border-b border-[#424754] hover:bg-[#2d3449] transition-colors">
                      <td className="p-2 text-[#c2c6d6] border-r border-[#424754] max-w-[200px]">
                        <div className="font-medium">#{result.testIndex}</div>
                        {testCase?.user_prompt && (
                          <div className="mt-1 text-[10px] text-[#8c909f] truncate" title={testCase.user_prompt}>
                            {testCase.user_prompt.slice(0, 80)}
                          </div>
                        )}
                      </td>
                      <td className="p-2 text-[#adc6ff] border-r border-[#424754]">{result.providerId}</td>
                      <td className={`p-2 border-r border-[#424754] max-w-[300px] ${result.error ? 'text-[#ffb4ab]' : 'text-[#c2c6d6]'}`}>
                        <div className="whitespace-pre-wrap break-words line-clamp-3">
                          {result.error || result.response || '(empty)'}
                        </div>
                        <div className="mt-1 text-[10px] text-[#8c909f]">
                          {result.latencyMs}ms | {result.tokenUsage.total}t {result.cached ? '(cached)' : ''}
                        </div>
                      </td>
                      <td className="p-2 border-r border-[#424754]">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`px-1 py-[2px] rounded text-[10px] font-medium tracking-[0.05em] font-mono flex items-center gap-[2px] uppercase w-fit ${
                            pass
                              ? 'bg-[#4ae176]/20 text-[#4ae176] border border-[#4ae176]/30'
                              : 'bg-[#ffb4ab]/20 text-[#ffb4ab] border border-[#ffb4ab]/30'
                          }`}>
                            <span className="material-symbols-outlined text-[10px]">
                              {pass ? 'check_circle' : 'cancel'}
                            </span>
                            {pass ? 'Pass' : 'Fail'}
                          </span>
                          {score !== undefined && (
                            <span className={`text-[11px] font-bold ${
                              score >= 70 ? 'text-[#4ae176]' : score >= 50 ? 'text-[#ffd54f]' : 'text-[#ffb4ab]'
                            }`}>
                              {score}%
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-2 max-w-[280px]">
                        {assertions.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {assertions.map((a, j) => (
                              <div key={j} className="flex items-start gap-1">
                                <span className={`material-symbols-outlined text-[12px] mt-0.5 shrink-0 ${a.pass ? 'text-[#4ae176]' : 'text-[#ffb4ab]'}`}>
                                  {a.pass ? 'check_circle' : 'cancel'}
                                </span>
                                <div className="min-w-0">
                                  <span className={`text-[10px] font-bold ${a.pass ? 'text-[#4ae176]' : 'text-[#ffb4ab]'}`}>
                                    {a.type}{a.score !== undefined ? ` ${a.score}%` : ''}
                                  </span>
                                  <div className={`text-[10px] truncate ${a.pass ? 'text-[#c2c6d6]' : 'text-[#ffb4ab]/80'}`} title={a.message}>
                                    {a.message}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : result.error ? (
                          <span className="text-[10px] text-[#ffb4ab]">Execution error</span>
                        ) : (
                          <span className="text-[10px] text-[#8c909f] italic">No assertions</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon="grid_on"
            title="No evaluation results yet"
            description="Configure your prompts, providers, and test cases in prompt_eval.yaml, then click &quot;Run All Tests&quot; to populate the evaluation matrix."
          />
        )}
      </div>
    </>
  );
}

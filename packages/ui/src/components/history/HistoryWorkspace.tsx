'use client';

import { useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { useRun } from '@/context/RunContext';
import EmptyState from '@/components/EmptyState';
import { SkeletonMetricCard, SkeletonRow } from '@/components/SkeletonPulse';

interface ResultsResponse {
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
      assertions: { type: string; pass: boolean; message: string; score?: number }[];
    }[];
    totalPass: number;
    totalFail: number;
    passRate: number;
    avgScore?: number;
  };
  summary?: {
    totalTests: number;
    passed: number;
    failed: number;
    passRate: number;
  };
}

const inspectorTabs = ['Diff View', 'Raw Output', 'Trace'];

export default function HistoryWorkspace() {
  const [selectedRow, setSelectedRow] = useState(0);
  const [activeInspectorTab, setActiveInspectorTab] = useState(0);
  const { runState, triggerRun, runVersion } = useRun();
  const { data, loading } = useApi<ResultsResponse>('/results', runVersion);

  const hasResults = data?.results && data.results.length > 0;
  const evalResults = data?.evaluation?.results || [];
  const summary = data?.summary;

  // Compute metrics from actual data
  const passRate = summary ? `${Math.round(summary.passRate * 100)}%` : '--';
  const avgLatency = hasResults
    ? `${Math.round(data!.results.reduce((sum, r) => sum + r.latencyMs, 0) / data!.results.length)}ms`
    : '--';
  const totalAssertions = evalResults.reduce((sum, r) => sum + (r.assertions?.length || 0), 0);
  const passedAssertions = evalResults.reduce(
    (sum, r) => sum + (r.assertions?.filter((a) => a.pass).length || 0), 0
  );

  const avgScoreValue = data?.evaluation?.avgScore;

  const metrics = [
    { label: 'Total Pass Rate', value: passRate, color: hasResults ? 'text-[#4ae176]' : 'text-[#8c909f]' },
    { label: 'Total Results', value: hasResults ? `${data!.results.length}` : '--', color: 'text-[#dae2fd]' },
    { label: 'Avg Latency', value: avgLatency, color: 'text-[#dae2fd]' },
    { label: 'Assertion Success', value: totalAssertions > 0 ? `${passedAssertions}/${totalAssertions}` : '--', color: hasResults ? 'text-[#4ae176]' : 'text-[#8c909f]' },
    ...(avgScoreValue !== undefined ? [{
      label: 'Avg Score',
      value: `${avgScoreValue}%`,
      color: avgScoreValue >= 70 ? 'text-[#4ae176]' : avgScoreValue >= 50 ? 'text-[#ffd54f]' : 'text-[#ffb4ab]',
    }] : []),
  ];

  // Build row data from eval results
  const rows = evalResults.map((er) => {
    const execResult = data!.results.find(
      (r) => r.testIndex === er.testIndex && r.providerId === er.providerId
    );
    return {
      id: `test_${er.testIndex}_${er.providerId}`,
      pass: er.pass,
      input: execResult?.response?.slice(0, 120) || '(no response)',
      providerId: er.providerId,
      testIndex: er.testIndex,
      latencyMs: execResult?.latencyMs || 0,
      tokenUsage: execResult?.tokenUsage || { prompt: 0, completion: 0, total: 0 },
      response: execResult?.response || '',
      assertions: er.assertions || [],
    };
  });

  const selectedResult = rows[selectedRow] || null;

  return (
    <>
      {/* Metrics Overview */}
      <div className="p-4 border-b border-[#424754] bg-[#0b1326] shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[20px] font-semibold tracking-[-0.01em] leading-7 text-[#dae2fd]">
            Regression Results
          </h1>
          <div className="flex gap-2">
            <button className="px-4 py-1.5 rounded border border-[#424754] text-[#dae2fd] text-[11px] font-medium tracking-[0.05em] leading-4 font-mono hover:bg-[#2d3449] transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">download</span> Export
            </button>
            <button
              onClick={triggerRun}
              disabled={runState.isRunning}
              className={`px-4 py-1.5 rounded text-[11px] font-medium tracking-[0.05em] leading-4 font-mono transition-colors flex items-center gap-1 font-bold ${
                runState.isRunning
                  ? 'bg-[#2d3449] text-[#8c909f] cursor-wait'
                  : 'bg-[#4d8eff] text-[#00285d] hover:bg-[#adc6ff]'
              }`}
            >
              <span className={`material-symbols-outlined text-[16px] ${runState.isRunning ? 'animate-spin' : ''}`}>
                {runState.isRunning ? 'progress_activity' : 'play_arrow'}
              </span>
              {runState.isRunning ? 'Running...' : 'Run Suite'}
            </button>
          </div>
        </div>
        {loading ? (
          <div className={`grid gap-4 ${avgScoreValue !== undefined ? 'grid-cols-5' : 'grid-cols-4'}`}>
            {[1, 2, 3, 4].map((i) => <SkeletonMetricCard key={i} />)}
          </div>
        ) : (
          <div className={`grid gap-4 ${metrics.length > 4 ? 'grid-cols-5' : 'grid-cols-4'}`}>
            {metrics.map((m) => (
              <div key={m.label} className="bg-[#0b1326] border border-[#424754] p-2 rounded flex flex-col">
                <span className="text-[11px] font-medium tracking-[0.05em] leading-4 font-mono text-[#c2c6d6] uppercase tracking-wider mb-1">
                  {m.label}
                </span>
                <span className={`text-[30px] font-semibold tracking-[-0.02em] leading-[38px] ${m.color}`}>
                  {m.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Workspace: Table & Inspector Split */}
      <div className="flex-1 flex overflow-hidden">
        {loading ? (
          <div className="flex-1 p-4 space-y-0">
            {[1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)}
          </div>
        ) : hasResults && rows.length > 0 ? (
          <>
            {/* Results Table */}
            <div className="flex-1 overflow-auto border-r border-[#424754] bg-[#131b2e] flex flex-col relative">
              <div className="sticky top-0 bg-[#171f33] z-10 border-b border-[#424754] flex text-[11px] font-medium tracking-[0.05em] leading-4 font-mono text-[#c2c6d6] uppercase">
                <div className="w-12 py-2 px-2 text-center border-r border-[#424754]">Status</div>
                <div className="flex-1 py-2 px-2 border-r border-[#424754]">Provider / Test</div>
                <div className="flex-[1.5] py-2 px-2">Assertion Breakdown</div>
              </div>
              {rows.map((row, i) => (
                <div
                  key={row.id}
                  onClick={() => setSelectedRow(i)}
                  className={`flex border-b border-[#424754] hover:bg-[#2d3449] cursor-pointer transition-colors group ${
                    selectedRow === i ? 'bg-[#2d3449] border-l-2 border-l-[#adc6ff]' : ''
                  }`}
                >
                  <div className="w-12 py-2 px-2 flex justify-center items-start border-r border-[#424754]">
                    <span className={`material-symbols-outlined text-[18px] ${row.pass ? 'text-[#4ae176]' : 'text-[#ffb4ab]'}`}>
                      {row.pass ? 'check_circle' : 'cancel'}
                    </span>
                  </div>
                  <div className="flex-1 py-2 px-2 border-r border-[#424754]">
                    <div className="font-mono text-[13px] leading-5 text-[#adc6ff]">
                      {row.providerId}
                    </div>
                    <div className="text-[11px] font-medium tracking-[0.05em] leading-4 font-mono text-[#c2c6d6] mt-1">
                      Test #{row.testIndex} &middot; {row.latencyMs}ms
                    </div>
                  </div>
                  <div className="flex-[1.5] py-2 px-2 flex flex-wrap gap-1 items-start">
                    {row.assertions.length > 0 ? (
                      row.assertions.map((a, j) => (
                        <span
                          key={j}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-mono text-[11px] ${
                            a.pass
                              ? 'border-[#424754] bg-[#0b1326] text-[#dae2fd]'
                              : 'border-[#ffb4ab] bg-[#93000a]/20 text-[#ffb4ab]'
                          }`}
                        >
                          {a.type}{a.score !== undefined ? ` ${a.score}%` : ''}
                          <span className={`material-symbols-outlined text-[12px] ${a.pass ? 'text-[#4ae176]' : 'text-[#ffb4ab]'}`}>
                            {a.pass ? 'check_circle' : 'cancel'}
                          </span>
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-[#8c909f] italic">No assertions</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Side Panel (Inspector) */}
            <div className="w-[450px] bg-[#0b1326] flex flex-col shrink-0">
              <div className="p-2 border-b border-[#424754] bg-[#171f33] flex items-center justify-between">
                <div className="text-[11px] font-medium tracking-[0.05em] leading-4 font-mono text-[#dae2fd] font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">data_object</span>
                  Inspector: {selectedResult?.id || '--'}
                </div>
                <button className="p-1 hover:bg-[#2d3449] rounded text-[#c2c6d6]">
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
              <div className="flex border-b border-[#424754] bg-[#131b2e] text-[11px] font-medium tracking-[0.05em] leading-4 font-mono">
                {inspectorTabs.map((tab, i) => (
                  <button
                    key={tab}
                    onClick={() => setActiveInspectorTab(i)}
                    className={`px-4 py-2 ${
                      activeInspectorTab === i
                        ? 'text-[#adc6ff] border-b-2 border-[#adc6ff] font-bold'
                        : 'text-[#c2c6d6] hover:text-[#dae2fd] transition-colors'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-auto p-3 bg-[#0b1326] font-mono text-[13px] leading-5">
                {selectedResult ? (
                  activeInspectorTab === 1 ? (
                    <pre className="text-[#c2c6d6] whitespace-pre-wrap break-words">{selectedResult.response || '(empty response)'}</pre>
                  ) : activeInspectorTab === 2 ? (
                    <div className="text-[#8c909f]">
                      <div>Provider: <span className="text-[#adc6ff]">{selectedResult.providerId}</span></div>
                      <div>Test Index: <span className="text-[#dae2fd]">{selectedResult.testIndex}</span></div>
                      <div>Latency: <span className="text-[#dae2fd]">{selectedResult.latencyMs}ms</span></div>
                      <div>Tokens: <span className="text-[#dae2fd]">{selectedResult.tokenUsage.prompt} prompt / {selectedResult.tokenUsage.completion} comp</span></div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {selectedResult.assertions.length > 0 ? (
                        selectedResult.assertions.map((a, i) => (
                          <div
                            key={i}
                            className={`p-2 rounded border-l-2 ${
                              a.pass
                                ? 'bg-[#00b954]/5 border-[#4ae176]'
                                : 'bg-[#93000a]/10 border-[#ffb4ab]'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`material-symbols-outlined text-[14px] ${a.pass ? 'text-[#4ae176]' : 'text-[#ffb4ab]'}`}>
                                {a.pass ? 'check_circle' : 'cancel'}
                              </span>
                              <span className="text-[#dae2fd] font-semibold">{a.type}</span>
                            </div>
                            <div className="text-[#c2c6d6] text-[12px]">{a.message}</div>
                          </div>
                        ))
                      ) : (
                        <div className="text-[#8c909f] italic">No assertions to display</div>
                      )}
                    </div>
                  )
                ) : (
                  <div className="text-[#8c909f] italic">Select a result to inspect</div>
                )}
              </div>
              {selectedResult && (
                <div className="p-2 border-t border-[#424754] bg-[#171f33]">
                  <div className="text-[11px] font-medium tracking-[0.05em] leading-4 font-mono text-[#c2c6d6] mb-1">
                    Model Metadata
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 font-mono text-[11px] text-[#dae2fd]">
                    <div className="text-[#c2c6d6]">Tokens:</div>
                    <div className="text-right">{selectedResult.tokenUsage.prompt} prompt / {selectedResult.tokenUsage.completion} comp</div>
                    <div className="text-[#c2c6d6]">Latency:</div>
                    <div className="text-right">{selectedResult.latencyMs}ms</div>
                    <div className="text-[#c2c6d6]">Provider:</div>
                    <div className="text-right text-[#adc6ff]">{selectedResult.providerId}</div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <EmptyState
            icon="history"
            title="No regression results"
            description="Run your evaluation suite to see regression results here. Configure test cases in prompt_eval.yaml and click &quot;Run Suite&quot;."
          />
        )}
      </div>
    </>
  );
}

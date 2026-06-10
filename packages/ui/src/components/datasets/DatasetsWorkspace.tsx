'use client';

import { useState, useCallback, useRef } from 'react';
import { useApi } from '@/hooks/useApi';
import { useRun } from '@/context/RunContext';
import EmptyState from '@/components/EmptyState';
import { SkeletonRow } from '@/components/SkeletonPulse';

const ASSERTION_TYPES = [
  { value: 'contains-substring', label: 'Contains Substring' },
  { value: 'is-json', label: 'Is JSON' },
  { value: 'equals-json', label: 'Equals JSON' },
  { value: 'matches-schema', label: 'Matches Schema' },
  { value: 'latency', label: 'Latency' },
  { value: 'llm-rubric', label: 'LLM Rubric' },
  { value: 'semantic-similarity', label: 'Semantic Similarity' },
];

const NEEDS_VALUE = ['contains-substring', 'equals-json', 'matches-schema', 'latency', 'llm-rubric', 'semantic-similarity'];

const VALID_ASSERTION_TYPES = ASSERTION_TYPES.map((a) => a.value);

const UPLOAD_SCHEMA_EXAMPLE = `[
  {
    "user_prompt": "What is 2+2?",
    "vars": { "language": "en" },
    "assert": [
      { "type": "contains-substring", "value": "4" }
    ]
  }
]

Fields:
  user_prompt (string, required) — the user message
  vars (object, optional) — template variables
  assert (array, optional) — assertions
    type: ${VALID_ASSERTION_TYPES.join(' | ')}
    value: string | number (depends on type)`;

interface AssertionData {
  type: string;
  value?: string | number;
}

interface TestCaseData {
  user_prompt?: string;
  vars?: Record<string, string>;
  assert?: AssertionData[];
}

interface ConfigData {
  tests?: TestCaseData[];
  prompts?: { id: string; content?: string }[];
  grader_mode?: 'assertions' | 'model-grader';
  model_grader_prompt?: string;
  use_variables?: boolean;
}

export default function DatasetsWorkspace() {
  const [activeTab, setActiveTab] = useState(0);
  const { configVersion, updateConfig } = useRun();
  const { data: config, loading } = useApi<ConfigData>('/config', configVersion);

  const [scenario, setScenario] = useState('');
  const [numCases, setNumCases] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [editingVar, setEditingVar] = useState<{ row: number; key: string } | null>(null);
  const [newVarKey, setNewVarKey] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Upload state
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadPreview, setUploadPreview] = useState<TestCaseData[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tests: TestCaseData[] = config?.tests || [];
  const hasTests = tests.length > 0;
  const graderMode = config?.grader_mode || 'assertions';
  const modelGraderPrompt = config?.model_grader_prompt || '';
  const useVariables = config?.use_variables ?? false;

  // ------ helpers to persist changes ------
  const updateTests = useCallback(
    async (newTests: TestCaseData[]) => {
      await updateConfig({ tests: newTests });
    },
    [updateConfig]
  );

  const setGraderMode = useCallback(
    async (mode: 'assertions' | 'model-grader') => {
      await updateConfig({ grader_mode: mode });
    },
    [updateConfig]
  );

  const setModelGraderPrompt = useCallback(
    async (prompt: string) => {
      await updateConfig({ model_grader_prompt: prompt });
    },
    [updateConfig]
  );

  const toggleUseVariables = useCallback(
    async () => {
      await updateConfig({ use_variables: !useVariables });
    },
    [updateConfig, useVariables]
  );

  // ------ test case CRUD ------
  const addTestCase = async () => {
    const newTest: TestCaseData = { user_prompt: '' };
    if (useVariables) newTest.vars = {};
    if (graderMode === 'assertions') newTest.assert = [];
    const newTests = [...tests, newTest];
    await updateTests(newTests);
  };

  const deleteTestCase = async (index: number) => {
    const newTests = tests.filter((_, i) => i !== index);
    await updateTests(newTests);
  };

  const updateUserPrompt = async (testIdx: number, value: string) => {
    const newTests = [...tests];
    newTests[testIdx] = { ...newTests[testIdx], user_prompt: value };
    await updateTests(newTests);
  };

  const updateVar = async (testIdx: number, key: string, value: string) => {
    const newTests = [...tests];
    const t = { ...newTests[testIdx], vars: { ...(newTests[testIdx].vars || {}) } };
    t.vars[key] = value;
    newTests[testIdx] = t;
    await updateTests(newTests);
  };

  const addVar = async (testIdx: number, key: string) => {
    if (!key.trim()) return;
    const newTests = [...tests];
    const t = { ...newTests[testIdx], vars: { ...(newTests[testIdx].vars || {}) } };
    if (!(key in t.vars)) {
      t.vars[key] = '';
      newTests[testIdx] = t;
      await updateTests(newTests);
    }
    setNewVarKey('');
  };

  const deleteVar = async (testIdx: number, key: string) => {
    const newTests = [...tests];
    const t = { ...newTests[testIdx], vars: { ...(newTests[testIdx].vars || {}) } };
    delete t.vars[key];
    newTests[testIdx] = t;
    await updateTests(newTests);
  };

  // ------ assertion CRUD ------
  const addAssertion = async (testIdx: number) => {
    const newTests = [...tests];
    const t = { ...newTests[testIdx], assert: [...(newTests[testIdx].assert || [])] };
    t.assert.push({ type: 'contains-substring', value: '' });
    newTests[testIdx] = t;
    await updateTests(newTests);
  };

  const updateAssertion = async (
    testIdx: number,
    assertIdx: number,
    field: 'type' | 'value',
    value: string
  ) => {
    const newTests = [...tests];
    const t = { ...newTests[testIdx], assert: [...(newTests[testIdx].assert || [])] };
    const a = { ...t.assert[assertIdx] };
    if (field === 'type') {
      a.type = value;
      if (!NEEDS_VALUE.includes(value)) {
        delete a.value;
      } else if (a.value === undefined) {
        a.value = '';
      }
    } else {
      a.value = a.type === 'latency' ? Number(value) || 0 : value;
    }
    t.assert[assertIdx] = a;
    newTests[testIdx] = t;
    await updateTests(newTests);
  };

  const deleteAssertion = async (testIdx: number, assertIdx: number) => {
    const newTests = [...tests];
    const t = { ...newTests[testIdx], assert: [...(newTests[testIdx].assert || [])] };
    t.assert.splice(assertIdx, 1);
    newTests[testIdx] = t;
    await updateTests(newTests);
  };

  // ------ generate dataset ------
  const handleGenerate = async () => {
    setGenError(null);

    const systemPrompt = config?.prompts?.find((p) => p.id === 'v1')?.content || '';

    if (!systemPrompt) {
      setGenError('Add a system prompt in the Playground first.');
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch('/api/datasets/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario,
          count: numCases,
          graderMode: graderMode,
          useVariables: useVariables,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setGenError(json.error || 'Generation failed');
        return;
      }
      await updateConfig({ tests: json.data });
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setGenerating(false);
    }
  };

  // ------ upload handling ------
  const validateUploadedTests = (data: unknown): { valid: TestCaseData[]; errors: string[] } => {
    const errors: string[] = [];
    if (!Array.isArray(data)) {
      return { valid: [], errors: ['Root must be a JSON array.'] };
    }
    const valid: TestCaseData[] = [];
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      if (!item || typeof item !== 'object') {
        errors.push(`Item ${i}: must be an object.`);
        continue;
      }
      const tc: TestCaseData = {};
      // user_prompt
      if ('user_prompt' in item) {
        if (typeof item.user_prompt !== 'string') {
          errors.push(`Item ${i}: user_prompt must be a string.`);
          continue;
        }
        tc.user_prompt = item.user_prompt;
      }
      // vars
      if ('vars' in item) {
        if (!item.vars || typeof item.vars !== 'object' || Array.isArray(item.vars)) {
          errors.push(`Item ${i}: vars must be an object.`);
          continue;
        }
        const varsOk = Object.entries(item.vars as Record<string, unknown>).every(
          ([, v]) => typeof v === 'string'
        );
        if (!varsOk) {
          errors.push(`Item ${i}: all var values must be strings.`);
          continue;
        }
        tc.vars = item.vars as Record<string, string>;
      }
      // assert
      if ('assert' in item) {
        if (!Array.isArray(item.assert)) {
          errors.push(`Item ${i}: assert must be an array.`);
          continue;
        }
        const assertions: AssertionData[] = [];
        let assertOk = true;
        for (let j = 0; j < item.assert.length; j++) {
          const a = item.assert[j];
          if (!a || typeof a.type !== 'string' || !VALID_ASSERTION_TYPES.includes(a.type)) {
            errors.push(`Item ${i}, assert ${j}: invalid type "${a?.type}".`);
            assertOk = false;
            break;
          }
          const ad: AssertionData = { type: a.type };
          if (a.value !== undefined) ad.value = a.value;
          assertions.push(ad);
        }
        if (!assertOk) continue;
        tc.assert = assertions;
      }
      valid.push(tc);
    }
    return { valid, errors };
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setUploadPreview(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      setUploadError('Only .json files are accepted.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        const { valid, errors } = validateUploadedTests(data);
        if (errors.length > 0) {
          setUploadError(`Validation errors:\n${errors.join('\n')}`);
          if (valid.length > 0) setUploadPreview(valid);
          return;
        }
        if (valid.length === 0) {
          setUploadError('No valid test cases found in the file.');
          return;
        }
        setUploadPreview(valid);
      } catch {
        setUploadError('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
    // Reset so the same file can be re-selected
    e.target.value = '';
  };

  const handleUploadConfirm = async () => {
    if (!uploadPreview) return;
    await updateConfig({ tests: uploadPreview });
    setUploadPreview(null);
    setUploadError(null);
  };

  // ------ debounced model grader prompt ------
  const graderPromptTimer = useRef<ReturnType<typeof setTimeout>>();
  const handleGraderPromptChange = (value: string) => {
    if (graderPromptTimer.current) clearTimeout(graderPromptTimer.current);
    graderPromptTimer.current = setTimeout(() => {
      setModelGraderPrompt(value);
    }, 600);
  };

  const configTabs = ['AI Generate', 'Upload'];

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Panel: Configuration */}
      <div className="w-[400px] border-r border-[#424754] bg-[#131b2e] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#424754]">
          <h2 className="text-[20px] font-semibold tracking-[-0.01em] leading-7 text-[#dae2fd]">
            Dataset Configuration
          </h2>
        </div>
        {/* Tabs */}
        <div className="flex border-b border-[#424754] px-4 pt-2">
          {configTabs.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`pb-2 px-2 border-b-2 text-[11px] font-medium tracking-[0.05em] leading-4 font-mono uppercase mr-4 transition-colors ${
                activeTab === i
                  ? 'border-[#adc6ff] text-[#adc6ff]'
                  : 'border-transparent text-[#c2c6d6] hover:text-[#dae2fd]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Config Form */}
        <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-5">
          {activeTab === 0 ? (
            <>
              {/* Grading Method */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-medium tracking-[0.05em] leading-4 font-mono text-[#c2c6d6] uppercase">
                  Grading Method
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setGraderMode('assertions')}
                    className={`flex-1 py-2 px-3 rounded text-[13px] leading-5 font-medium transition-all border ${
                      graderMode === 'assertions'
                        ? 'bg-[#adc6ff] text-[#002e6a] border-[#adc6ff]'
                        : 'bg-[#0b1326] text-[#c2c6d6] border-[#424754] hover:border-[#8c909f]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px] align-middle mr-1">rule</span>
                    Assertions
                  </button>
                  <button
                    onClick={() => setGraderMode('model-grader')}
                    className={`flex-1 py-2 px-3 rounded text-[13px] leading-5 font-medium transition-all border ${
                      graderMode === 'model-grader'
                        ? 'bg-[#adc6ff] text-[#002e6a] border-[#adc6ff]'
                        : 'bg-[#0b1326] text-[#c2c6d6] border-[#424754] hover:border-[#8c909f]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px] align-middle mr-1">psychology</span>
                    Model Grader
                  </button>
                </div>
              </div>

              {/* Model Grader Prompt */}
              {graderMode === 'model-grader' && (
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium tracking-[0.05em] leading-4 font-mono text-[#c2c6d6] uppercase">
                    Grading Prompt (LLM Judge)
                  </label>
                  <textarea
                    defaultValue={modelGraderPrompt}
                    onChange={(e) => handleGraderPromptChange(e.target.value)}
                    className="bg-[#0b1326] border border-[#424754] rounded p-2 font-mono text-[13px] leading-5 text-[#dae2fd] focus:border-[#adc6ff] focus:ring-1 focus:ring-[#adc6ff] outline-none resize-none h-28"
                    placeholder="Describe how the model should judge responses..."
                  />
                  <span className="text-[11px] text-[#8c909f]">
                    This prompt will be used to evaluate all test cases via LLM-as-a-judge.
                  </span>
                </div>
              )}

              {/* Variables Toggle */}
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium tracking-[0.05em] leading-4 font-mono text-[#c2c6d6] uppercase">
                  Template Variables
                </label>
                <button
                  onClick={toggleUseVariables}
                  className={`w-9 h-5 rounded-full relative flex items-center px-[2px] transition-colors ${
                    useVariables ? 'bg-[#adc6ff]' : 'bg-[#2d3449]'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full transition-all ${
                    useVariables ? 'bg-[#002e6a] translate-x-[16px]' : 'bg-[#8c909f] translate-x-0'
                  }`} />
                </button>
              </div>
              {useVariables && (
                <span className="text-[11px] text-[#8c909f] -mt-3">
                  Use {'{{variable}}'} placeholders in prompts. Values filled per test case.
                </span>
              )}

              <div className="border-t border-[#424754] my-1" />

              {/* AI Generation Form */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium tracking-[0.05em] leading-4 font-mono text-[#c2c6d6] uppercase">
                  Scenario Description
                </label>
                <textarea
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                  className="bg-[#0b1326] border border-[#424754] rounded p-2 font-mono text-[13px] leading-5 text-[#dae2fd] focus:border-[#adc6ff] focus:ring-1 focus:ring-[#adc6ff] outline-none resize-none h-24"
                  placeholder="Describe the scenarios you want to test..."
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium tracking-[0.05em] leading-4 font-mono text-[#c2c6d6] uppercase">
                  Number of Test Cases
                </label>
                <input
                  type="number"
                  value={numCases}
                  min={1}
                  max={50}
                  onChange={(e) => setNumCases(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                  className="bg-[#0b1326] border border-[#424754] rounded p-2 font-mono text-[13px] leading-5 text-[#dae2fd] focus:border-[#adc6ff] focus:ring-1 focus:ring-[#adc6ff] outline-none"
                />
              </div>

              {genError && (
                <div className="bg-[#93000a]/20 border border-[#ffb4ab]/30 rounded p-3 text-[13px] text-[#ffb4ab]">
                  {genError}
                </div>
              )}

              <div className="mt-auto pt-4">
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full bg-[#adc6ff] text-[#002e6a] py-2 rounded text-[14px] leading-5 font-bold flex items-center justify-center gap-2 hover:bg-[#4d8eff] focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#131b2e] focus:ring-[#adc6ff] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      Generating...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                      Generate Dataset
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            /* Upload Tab */
            <>
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-medium tracking-[0.05em] leading-4 font-mono text-[#c2c6d6] uppercase">
                  Expected JSON Schema
                </label>
                <pre className="bg-[#0b1326] border border-[#424754] rounded p-3 font-mono text-[11px] leading-4 text-[#8c909f] overflow-auto max-h-[220px] whitespace-pre-wrap">
                  {UPLOAD_SCHEMA_EXAMPLE}
                </pre>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-medium tracking-[0.05em] leading-4 font-mono text-[#c2c6d6] uppercase">
                  Upload JSON File
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-6 border-2 border-dashed border-[#424754] rounded-lg text-[#c2c6d6] hover:border-[#adc6ff] hover:text-[#adc6ff] transition-colors flex flex-col items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[28px]">upload_file</span>
                  <span className="text-[13px]">Click to select a .json file</span>
                </button>
              </div>

              {uploadError && (
                <div className="bg-[#93000a]/20 border border-[#ffb4ab]/30 rounded p-3 text-[12px] text-[#ffb4ab] whitespace-pre-wrap font-mono">
                  {uploadError}
                </div>
              )}

              {uploadPreview && (
                <div className="flex flex-col gap-2">
                  <div className="bg-[#4ae176]/10 border border-[#4ae176]/30 rounded p-3 text-[13px] text-[#4ae176] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    {uploadPreview.length} valid test case{uploadPreview.length !== 1 ? 's' : ''} found
                  </div>
                  <button
                    onClick={handleUploadConfirm}
                    className="w-full bg-[#adc6ff] text-[#002e6a] py-2 rounded text-[14px] leading-5 font-bold flex items-center justify-center gap-2 hover:bg-[#4d8eff] transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                    Load {uploadPreview.length} Test Cases
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right Panel: Preview */}
      <div className="flex-1 flex flex-col bg-[#0b1326] overflow-hidden">
        <div className="p-4 border-b border-[#424754] bg-[#171f33] flex justify-between items-center">
          <div>
            <div className="text-[11px] font-medium tracking-[0.05em] leading-4 font-mono text-[#c2c6d6] uppercase mb-1">
              Active Dataset
            </div>
            <h1 className="text-[20px] font-semibold tracking-[-0.01em] leading-7 text-[#dae2fd]">
              {hasTests ? `Test Cases (${tests.length})` : 'No Dataset Loaded'}
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addTestCase}
              className="bg-[#00b954] text-[#004119] px-4 py-2 rounded text-[14px] leading-5 font-bold hover:opacity-90 transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Add Test Case
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-auto bg-[#0b1326]">
          {loading ? (
            <div className="p-4 space-y-0">
              {[1, 2, 3, 4, 5].map((i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : hasTests ? (
            <div className="p-4">
              <div className="border border-[#424754] rounded bg-[#131b2e] overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#2d3449] border-b border-[#424754]">
                      <th className="p-2 text-[11px] font-medium tracking-[0.05em] leading-4 font-mono text-[#c2c6d6] w-12">
                        #
                      </th>
                      <th className="p-2 text-[11px] font-medium tracking-[0.05em] leading-4 font-mono text-[#c2c6d6]">
                        User Prompt
                      </th>
                      {useVariables && (
                        <th className="p-2 text-[11px] font-medium tracking-[0.05em] leading-4 font-mono text-[#c2c6d6]">
                          Variables
                        </th>
                      )}
                      <th className="p-2 text-[11px] font-medium tracking-[0.05em] leading-4 font-mono text-[#c2c6d6]">
                        {graderMode === 'model-grader' ? 'Grading' : 'Assertions'}
                      </th>
                      <th className="p-2 text-[11px] font-medium tracking-[0.05em] leading-4 font-mono text-[#c2c6d6] w-12" />
                    </tr>
                  </thead>
                  <tbody className="font-mono text-[13px] leading-5 text-[#dae2fd]">
                    {tests.map((test, i) => (
                      <tr
                        key={i}
                        className={`${i < tests.length - 1 ? 'border-b border-[#424754]' : ''} hover:bg-[#171f33] transition-colors group`}
                      >
                        {/* Index */}
                        <td className="p-2 text-[#c2c6d6] align-top">{i + 1}</td>

                        {/* User Prompt */}
                        <td className="p-2 align-top border-r border-[#424754] min-w-[200px]">
                          <textarea
                            key={`up-${i}`}
                            defaultValue={test.user_prompt ?? ''}
                            onBlur={(e) => updateUserPrompt(i, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                (e.target as HTMLTextAreaElement).blur();
                              }
                            }}
                            placeholder="Enter user message..."
                            rows={2}
                            className="w-full bg-[#0b1326] border border-[#424754] rounded px-2 py-1.5 text-[12px] text-[#dae2fd] outline-none focus:border-[#adc6ff] resize-none"
                          />
                        </td>

                        {/* Variables — editable (only if toggle is on) */}
                        {useVariables && (
                          <td className="p-2 align-top border-r border-[#424754] min-w-[180px]">
                            {test.vars && Object.keys(test.vars).length > 0 ? (
                              Object.entries(test.vars).map(([k, v]) => (
                                <div key={k} className="flex items-start gap-1 mb-1.5 group/var">
                                  <span className="text-[#adc6ff] shrink-0 pt-0.5">{k}:</span>
                                  {editingVar?.row === i && editingVar?.key === k ? (
                                    <input
                                      ref={editInputRef}
                                      autoFocus
                                      defaultValue={v}
                                      onBlur={(e) => {
                                        updateVar(i, k, e.target.value);
                                        setEditingVar(null);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          updateVar(i, k, (e.target as HTMLInputElement).value);
                                          setEditingVar(null);
                                        }
                                        if (e.key === 'Escape') setEditingVar(null);
                                      }}
                                      className="flex-1 bg-[#0b1326] border border-[#adc6ff] rounded px-1.5 py-0.5 text-[13px] text-[#dae2fd] outline-none"
                                    />
                                  ) : (
                                    <span
                                      onClick={() => setEditingVar({ row: i, key: k })}
                                      className="text-[#dae2fd] cursor-pointer hover:bg-[#222a3d] px-1 rounded flex-1"
                                      title="Click to edit"
                                    >
                                      {v || <span className="text-[#8c909f] italic">empty</span>}
                                    </span>
                                  )}
                                  <button
                                    onClick={() => deleteVar(i, k)}
                                    className="opacity-0 group-hover/var:opacity-100 text-[#8c909f] hover:text-[#ffb4ab] transition-all shrink-0"
                                    title="Remove variable"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                  </button>
                                </div>
                              ))
                            ) : (
                              <span className="text-[#8c909f] italic text-[12px]">No variables</span>
                            )}
                            <div className="mt-1">
                              <div className="flex items-center gap-1">
                                <input
                                  placeholder="new key"
                                  value={editingVar?.row === i && editingVar?.key === '__new__' ? newVarKey : ''}
                                  onFocus={() => setEditingVar({ row: i, key: '__new__' })}
                                  onChange={(e) => setNewVarKey(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newVarKey.trim()) {
                                      addVar(i, newVarKey.trim());
                                      setEditingVar(null);
                                    }
                                  }}
                                  className="w-20 bg-transparent border-b border-dashed border-[#424754] text-[11px] text-[#8c909f] placeholder-[#424754] outline-none focus:border-[#adc6ff] px-0.5"
                                />
                                <button
                                  onClick={() => {
                                    if (newVarKey.trim()) {
                                      addVar(i, newVarKey.trim());
                                      setEditingVar(null);
                                    }
                                  }}
                                  className="text-[#8c909f] hover:text-[#adc6ff]"
                                  title="Add variable"
                                >
                                  <span className="material-symbols-outlined text-[14px]">add</span>
                                </button>
                              </div>
                            </div>
                          </td>
                        )}

                        {/* Assertions */}
                        <td className="p-2 align-top min-w-[240px]">
                          {graderMode === 'model-grader' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#4d8eff]/15 border border-[#4d8eff]/30 text-[12px] text-[#adc6ff]">
                              <span className="material-symbols-outlined text-[14px]">psychology</span>
                              Model Grader
                            </span>
                          ) : (
                            <div className="flex flex-col gap-1.5">
                              {(test.assert || []).map((a, j) => (
                                <div key={j} className="flex items-center gap-1 group/assert">
                                  <select
                                    value={a.type}
                                    onChange={(e) => updateAssertion(i, j, 'type', e.target.value)}
                                    className="bg-[#0b1326] border border-[#424754] rounded px-1.5 py-1 text-[12px] text-[#dae2fd] outline-none focus:border-[#adc6ff] appearance-none cursor-pointer"
                                  >
                                    {ASSERTION_TYPES.map((at) => (
                                      <option key={at.value} value={at.value}>
                                        {at.label}
                                      </option>
                                    ))}
                                  </select>
                                  {NEEDS_VALUE.includes(a.type) && (
                                    <input
                                      key={`${i}-${j}-${a.type}`}
                                      defaultValue={a.value ?? ''}
                                      onBlur={(e) => updateAssertion(i, j, 'value', e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                      }}
                                      placeholder={a.type === 'latency' ? 'ms' : 'value'}
                                      className="flex-1 bg-[#0b1326] border border-[#424754] rounded px-1.5 py-1 text-[12px] text-[#dae2fd] outline-none focus:border-[#adc6ff] min-w-[80px]"
                                    />
                                  )}
                                  <button
                                    onClick={() => deleteAssertion(i, j)}
                                    className="opacity-0 group-hover/assert:opacity-100 text-[#8c909f] hover:text-[#ffb4ab] transition-all"
                                    title="Remove assertion"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                  </button>
                                </div>
                              ))}
                              <button
                                onClick={() => addAssertion(i)}
                                className="flex items-center gap-0.5 text-[11px] text-[#8c909f] hover:text-[#adc6ff] transition-colors w-fit"
                              >
                                <span className="material-symbols-outlined text-[14px]">add</span>
                                Add assertion
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Delete row */}
                        <td className="p-2 align-top">
                          <button
                            onClick={() => deleteTestCase(i)}
                            className="opacity-0 group-hover:opacity-100 text-[#8c909f] hover:text-[#ffb4ab] transition-all"
                            title="Delete test case"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="mt-4 flex items-center">
                <span className="text-[11px] font-medium tracking-[0.05em] leading-4 font-mono text-[#c2c6d6]">
                  {tests.length} test case{tests.length !== 1 ? 's' : ''} from prompt_eval.yaml
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <EmptyState
                icon="database"
                title="No test cases loaded"
                description="Add test cases manually, generate them with AI, or upload an existing dataset."
              />
              <button
                onClick={addTestCase}
                className="bg-[#00b954] text-[#004119] px-4 py-2 rounded text-[14px] leading-5 font-bold hover:opacity-90 transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Add First Test Case
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

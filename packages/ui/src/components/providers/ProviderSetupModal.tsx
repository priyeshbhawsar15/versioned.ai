'use client';

import { useState, useEffect, useRef } from 'react';

interface ProviderSetupModalProps {
  providerType: string;
  providerName: string;
  defaultModel: string;
  onClose: () => void;
  onSave: (config: ProviderFormData) => Promise<void>;
  editMode?: boolean;
  initialData?: Partial<ProviderFormData>;
}

export interface ProviderFormData {
  type: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  temperature: number;
  awsRegion: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

const fallbackHints: Record<string, string> = {
  openai: 'e.g. gpt-4o, gpt-4o-mini, gpt-3.5-turbo',
  anthropic: 'e.g. claude-3-5-sonnet-20240620, claude-3-opus-20240229',
  ollama: 'e.g. llama3, mistral, codellama',
  bedrock: 'e.g. anthropic.claude-3-sonnet-20240229-v1:0',
  openapi: 'e.g. llama-3.1-70b-versatile',
};

const awsRegions = [
  'us-east-1', 'us-east-2', 'us-west-2', 'eu-west-1', 'eu-west-2',
  'eu-central-1', 'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1',
];

export default function ProviderSetupModal({
  providerType,
  providerName,
  defaultModel,
  onClose,
  onSave,
  editMode = false,
  initialData,
}: ProviderSetupModalProps) {
  const [form, setForm] = useState<ProviderFormData>({
    type: providerType,
    model: initialData?.model || defaultModel,
    apiKey: initialData?.apiKey || '',
    baseUrl: initialData?.baseUrl || (providerType === 'ollama' ? 'http://localhost:11434' : ''),
    temperature: initialData?.temperature ?? 0.7,
    awsRegion: initialData?.awsRegion || 'us-east-1',
    awsAccessKeyId: initialData?.awsAccessKeyId || '',
    awsSecretAccessKey: initialData?.awsSecretAccessKey || '',
  });

  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [testLatency, setTestLatency] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const modelInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch models when credentials change (debounced)
  useEffect(() => {
    const canFetch =
      (providerType === 'openai' && form.apiKey) ||
      (providerType === 'ollama' && form.baseUrl) ||
      (providerType === 'openapi' && form.baseUrl && form.apiKey);

    if (!canFetch) {
      setFetchedModels([]);
      return;
    }

    const timer = setTimeout(async () => {
      setModelsLoading(true);
      try {
        const configPayload: Record<string, unknown> = {};
        if (form.apiKey) configPayload.api_key = form.apiKey;
        if (form.baseUrl) configPayload.base_url = form.baseUrl;

        const res = await fetch('/api/providers/models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: providerType, config: configPayload }),
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setFetchedModels(json.data);
        }
      } catch {
        // silently fail — user can still type manually
      } finally {
        setModelsLoading(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [providerType, form.apiKey, form.baseUrl]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
          modelInputRef.current && !modelInputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredModels = fetchedModels.filter((m) =>
    m.toLowerCase().includes(form.model.toLowerCase())
  );

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage('');
    setTestLatency(null);

    try {
      const configPayload: Record<string, unknown> = {};

      if (providerType === 'bedrock') {
        configPayload.aws_region = form.awsRegion;
        if (form.awsAccessKeyId) configPayload.aws_access_key_id = form.awsAccessKeyId;
        if (form.awsSecretAccessKey) configPayload.aws_secret_access_key = form.awsSecretAccessKey;
      } else {
        if (form.apiKey) configPayload.api_key = form.apiKey;
        if (form.baseUrl) configPayload.base_url = form.baseUrl;
      }

      configPayload.temperature = form.temperature;

      const res = await fetch('/api/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: providerType,
          model: form.model,
          config: configPayload,
        }),
      });

      const json = await res.json();

      if (json.success) {
        setTestStatus('success');
        setTestLatency(json.data.latencyMs);
        setTestMessage(`Connected! Response: "${json.data.response}"`);
      } else {
        setTestStatus('error');
        setTestMessage(json.error || 'Connection failed');
      }
    } catch (err) {
      setTestStatus('error');
      setTestMessage(err instanceof Error ? err.message : 'Network error');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const canSave = () => {
    if (!form.model) return false;
    if (providerType === 'bedrock') return true;
    if (providerType === 'ollama') return !!form.baseUrl;
    if (providerType === 'openapi') return !!form.baseUrl && !!form.model;
    return !!form.apiKey;
  };

  const updateField = (field: keyof ProviderFormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (testStatus !== 'idle') setTestStatus('idle');
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[#131b2e] border border-[#424754] rounded-lg w-[520px] max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#424754] flex items-center justify-between">
          <div>
            <h3 className="text-[18px] font-semibold text-[#dae2fd]">
              {editMode ? 'Edit' : 'Connect'} {providerName}
            </h3>
            <p className="text-[12px] text-[#8c909f] mt-0.5">
              {editMode ? 'Update your provider configuration.' : 'Enter your credentials to connect this provider.'}
            </p>
          </div>
          <button onClick={onClose} className="text-[#c2c6d6] hover:text-[#dae2fd] p-1 rounded hover:bg-white/5">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          {/* API Key — for openai, anthropic, openapi */}
          {providerType !== 'bedrock' && providerType !== 'ollama' && (
            <div>
              <label className="text-[11px] font-medium tracking-[0.05em] leading-4 font-mono text-[#c2c6d6] uppercase block mb-1.5">
                API Key <span className="text-[#ffb4ab]">*</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={form.apiKey}
                  onChange={(e) => updateField('apiKey', e.target.value)}
                  placeholder={providerType === 'openai' ? 'sk-...' : providerType === 'anthropic' ? 'sk-ant-...' : 'Your API key'}
                  className="w-full bg-[#0b1326] border border-[#424754] rounded p-2.5 font-mono text-[13px] leading-5 text-[#dae2fd] focus:border-[#adc6ff] focus:ring-1 focus:ring-[#adc6ff] outline-none placeholder:text-[#8c909f] pr-10"
                />
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[16px] text-[#8c909f]">
                  key
                </span>
              </div>
              <p className="text-[11px] text-[#8c909f] mt-1">
                {providerType === 'openai' && 'Get your key at platform.openai.com/api-keys'}
                {providerType === 'anthropic' && 'Get your key at console.anthropic.com/settings/keys'}
                {providerType === 'openapi' && 'Enter the API key for your OpenAI-compatible endpoint'}
              </p>
            </div>
          )}

          {/* Ollama — endpoint + optional API key */}
          {providerType === 'ollama' && (
            <>
              <div>
                <label className="text-[11px] font-medium tracking-[0.05em] leading-4 font-mono text-[#c2c6d6] uppercase block mb-1.5">
                  Endpoint URL <span className="text-[#ffb4ab]">*</span>
                </label>
                <input
                  type="text"
                  value={form.baseUrl}
                  onChange={(e) => updateField('baseUrl', e.target.value)}
                  placeholder="http://localhost:11434"
                  className="w-full bg-[#0b1326] border border-[#424754] rounded p-2.5 font-mono text-[13px] leading-5 text-[#dae2fd] focus:border-[#adc6ff] focus:ring-1 focus:ring-[#adc6ff] outline-none placeholder:text-[#8c909f]"
                />
                <p className="text-[11px] text-[#8c909f] mt-1">
                  Default: http://localhost:11434 — or use https://ollama.com for cloud
                </p>
              </div>
              <div>
                <label className="text-[11px] font-medium tracking-[0.05em] leading-4 font-mono text-[#c2c6d6] uppercase block mb-1.5">
                  API Key <span className="text-[#8c909f]">(optional)</span>
                </label>
                <input
                  type="password"
                  value={form.apiKey}
                  onChange={(e) => updateField('apiKey', e.target.value)}
                  placeholder="Required for cloud/authenticated instances"
                  className="w-full bg-[#0b1326] border border-[#424754] rounded p-2.5 font-mono text-[13px] leading-5 text-[#dae2fd] focus:border-[#adc6ff] focus:ring-1 focus:ring-[#adc6ff] outline-none placeholder:text-[#8c909f]"
                />
              </div>
            </>
          )}

          {/* Bedrock — AWS credentials */}
          {providerType === 'bedrock' && (
            <>
              <div>
                <label className="text-[11px] font-medium tracking-[0.05em] leading-4 font-mono text-[#c2c6d6] uppercase block mb-1.5">
                  AWS Region
                </label>
                <select
                  value={form.awsRegion}
                  onChange={(e) => updateField('awsRegion', e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#424754] rounded p-2.5 font-mono text-[13px] leading-5 text-[#dae2fd] focus:border-[#adc6ff] focus:ring-1 focus:ring-[#adc6ff] outline-none"
                >
                  {awsRegions.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium tracking-[0.05em] leading-4 font-mono text-[#c2c6d6] uppercase block mb-1.5">
                  Access Key ID
                </label>
                <input
                  type="password"
                  value={form.awsAccessKeyId}
                  onChange={(e) => updateField('awsAccessKeyId', e.target.value)}
                  placeholder="AKIA..."
                  className="w-full bg-[#0b1326] border border-[#424754] rounded p-2.5 font-mono text-[13px] leading-5 text-[#dae2fd] focus:border-[#adc6ff] focus:ring-1 focus:ring-[#adc6ff] outline-none placeholder:text-[#8c909f]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium tracking-[0.05em] leading-4 font-mono text-[#c2c6d6] uppercase block mb-1.5">
                  Secret Access Key
                </label>
                <input
                  type="password"
                  value={form.awsSecretAccessKey}
                  onChange={(e) => updateField('awsSecretAccessKey', e.target.value)}
                  placeholder="Your secret key"
                  className="w-full bg-[#0b1326] border border-[#424754] rounded p-2.5 font-mono text-[13px] leading-5 text-[#dae2fd] focus:border-[#adc6ff] focus:ring-1 focus:ring-[#adc6ff] outline-none placeholder:text-[#8c909f]"
                />
                <p className="text-[11px] text-[#8c909f] mt-1">
                  Leave blank to use your default AWS credential chain (env vars / ~/.aws/credentials)
                </p>
              </div>
            </>
          )}

          {/* Base URL — for openapi/custom */}
          {providerType === 'openapi' && (
            <div>
              <label className="text-[11px] font-medium tracking-[0.05em] leading-4 font-mono text-[#c2c6d6] uppercase block mb-1.5">
                Base URL <span className="text-[#ffb4ab]">*</span>
              </label>
              <input
                type="text"
                value={form.baseUrl}
                onChange={(e) => updateField('baseUrl', e.target.value)}
                placeholder="https://api.groq.com/openai/v1"
                className="w-full bg-[#0b1326] border border-[#424754] rounded p-2.5 font-mono text-[13px] leading-5 text-[#dae2fd] focus:border-[#adc6ff] focus:ring-1 focus:ring-[#adc6ff] outline-none placeholder:text-[#8c909f]"
              />
              <p className="text-[11px] text-[#8c909f] mt-1">
                Must implement the OpenAI-compatible /v1/chat/completions endpoint
              </p>
            </div>
          )}

          {/* Model selection */}
          <div>
            <label className="text-[11px] font-medium tracking-[0.05em] leading-4 font-mono text-[#c2c6d6] uppercase block mb-1.5">
              Model <span className="text-[#ffb4ab]">*</span>
              {modelsLoading && (
                <span className="ml-2 text-[#8c909f] normal-case font-normal">
                  <span className="material-symbols-outlined text-[12px] animate-spin inline-block align-middle">progress_activity</span>
                  {' '}fetching models...
                </span>
              )}
            </label>
            <div className="relative">
              <input
                ref={modelInputRef}
                type="text"
                value={form.model}
                onChange={(e) => updateField('model', e.target.value)}
                onFocus={() => { if (fetchedModels.length > 0) setShowSuggestions(true); }}
                placeholder={fallbackHints[providerType] || 'Enter model name'}
                className="w-full bg-[#0b1326] border border-[#424754] rounded p-2.5 font-mono text-[13px] leading-5 text-[#dae2fd] focus:border-[#adc6ff] focus:ring-1 focus:ring-[#adc6ff] outline-none placeholder:text-[#8c909f] pr-8"
              />
              {fetchedModels.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8c909f] hover:text-[#adc6ff]"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showSuggestions ? 'expand_less' : 'expand_more'}
                  </span>
                </button>
              )}
              {showSuggestions && filteredModels.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-50 top-full mt-1 left-0 right-0 bg-[#222a3d] border border-[#424754] rounded shadow-xl max-h-[200px] overflow-y-auto"
                >
                  {filteredModels.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => { updateField('model', m); setShowSuggestions(false); }}
                      className={`w-full text-left px-3 py-2 font-mono text-[13px] leading-5 hover:bg-[#2d3449] transition-colors ${
                        m === form.model ? 'text-[#adc6ff] bg-[#2d3449]' : 'text-[#dae2fd]'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {fetchedModels.length > 0 && (
              <p className="text-[11px] text-[#4ae176] mt-1">
                {fetchedModels.length} model{fetchedModels.length !== 1 ? 's' : ''} available from API
              </p>
            )}
            {fetchedModels.length === 0 && !modelsLoading && (
              <p className="text-[11px] text-[#8c909f] mt-1">
                {providerType === 'anthropic' || providerType === 'bedrock'
                  ? 'Type the model name — Anthropic/Bedrock don\'t expose a list-models API'
                  : 'Enter credentials above to auto-fetch available models'}
              </p>
            )}
          </div>

          {/* Temperature */}
          <div>
            <label className="text-[11px] font-medium tracking-[0.05em] leading-4 font-mono text-[#c2c6d6] uppercase block mb-1.5">
              Temperature <span className="text-[#8c909f]">({form.temperature.toFixed(1)})</span>
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={form.temperature}
              onChange={(e) => updateField('temperature', parseFloat(e.target.value))}
              className="w-full accent-[#adc6ff] h-1.5"
            />
            <div className="flex justify-between text-[10px] text-[#8c909f] mt-0.5">
              <span>Precise (0)</span>
              <span>Creative (2)</span>
            </div>
          </div>

          {/* Test Connection */}
          <div className="pt-2">
            <button
              onClick={handleTestConnection}
              disabled={testStatus === 'testing' || !canSave()}
              className={`w-full py-2.5 rounded text-[13px] font-medium transition-colors flex items-center justify-center gap-2 ${
                testStatus === 'testing'
                  ? 'bg-[#2d3449] text-[#8c909f] cursor-wait border border-[#424754]'
                  : testStatus === 'success'
                  ? 'bg-[#4ae176]/10 text-[#4ae176] border border-[#4ae176]/30 hover:bg-[#4ae176]/20'
                  : testStatus === 'error'
                  ? 'bg-[#ffb4ab]/10 text-[#ffb4ab] border border-[#ffb4ab]/30 hover:bg-[#ffb4ab]/20'
                  : 'bg-[#222a3d] text-[#dae2fd] border border-[#424754] hover:bg-[#2d3449] hover:border-[#adc6ff]'
              }`}
            >
              <span className={`material-symbols-outlined text-[18px] ${testStatus === 'testing' ? 'animate-spin' : ''}`}>
                {testStatus === 'testing' ? 'progress_activity' :
                 testStatus === 'success' ? 'check_circle' :
                 testStatus === 'error' ? 'error' : 'cable'}
              </span>
              {testStatus === 'testing' ? 'Testing connection...' :
               testStatus === 'success' ? 'Connection successful!' :
               testStatus === 'error' ? 'Test failed — try again' :
               'Test Connection'}
            </button>
            {testMessage && (
              <p className={`text-[11px] mt-2 font-mono leading-relaxed ${
                testStatus === 'success' ? 'text-[#4ae176]' : 'text-[#ffb4ab]'
              }`}>
                {testMessage}
                {testLatency !== null && (
                  <span className="text-[#8c909f] ml-2">({testLatency}ms)</span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[#424754] flex justify-between items-center">
          <p className="text-[11px] text-[#8c909f] max-w-[250px]">
            Credentials are saved locally in prompt_eval.yaml. Never committed to git.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded border border-[#424754] text-[#c2c6d6] text-sm hover:bg-[#2d3449] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave() || saving}
              className={`px-5 py-2 rounded text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                canSave() && !saving
                  ? 'bg-[#4d8eff] text-[#00285d] hover:bg-[#adc6ff]'
                  : 'bg-[#2d3449] text-[#8c909f] cursor-not-allowed'
              }`}
            >
              {saving && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
              {editMode ? 'Update' : 'Save & Connect'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

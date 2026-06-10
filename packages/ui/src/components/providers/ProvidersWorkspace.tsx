'use client';

import { useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { useRun } from '@/context/RunContext';
import { SkeletonCard } from '@/components/SkeletonPulse';
import ProviderSetupModal, { type ProviderFormData } from './ProviderSetupModal';

interface ProviderData {
  id: string;
  type: string;
  model: string;
  hasConfig: boolean;
  temperature?: number;
  isCustom: boolean;
  baseUrl?: string;
  apiKeyHint?: string;
  hasApiKey: boolean;
  awsRegion?: string;
}

const providerIcons: Record<string, string> = {
  openai: 'psychology',
  anthropic: 'account_tree',
  bedrock: 'cloud',
  ollama: 'local_fire_department',
  openapi: 'hub',
};

const availableProviders = [
  { name: 'OpenAI', type: 'openai', defaultModel: 'gpt-4o', icon: 'psychology', description: 'GPT-4o, GPT-4 Turbo, and GPT-3.5 models.' },
  { name: 'Anthropic', type: 'anthropic', defaultModel: 'claude-3-5-sonnet-20240620', icon: 'account_tree', description: 'Claude 3.5 Sonnet, Opus, and Haiku models.' },
  { name: 'Ollama', type: 'ollama', defaultModel: 'llama3', icon: 'local_fire_department', description: 'Local inference server. Connect via localhost endpoint.' },
  { name: 'AWS Bedrock', type: 'bedrock', defaultModel: 'anthropic.claude-3-sonnet', icon: 'cloud', description: 'Access models via AWS Bedrock runtime.' },
  { name: 'Groq', type: 'openapi', defaultModel: 'llama-3.1-70b-versatile', icon: 'bolt', description: 'Ultra-fast LPU inference. Uses OpenAI-compatible API.' },
  { name: 'Mistral AI', type: 'openapi', defaultModel: 'mistral-large-latest', icon: 'air', description: 'Mistral Large and Codestral via OpenAI-compatible API.' },
];

function buildProviderConfig(form: ProviderFormData): Record<string, unknown> {
  const config: Record<string, unknown> = {};

  if (form.apiKey) config.api_key = form.apiKey;
  if (form.baseUrl) config.base_url = form.baseUrl;
  if (form.temperature !== undefined) config.temperature = form.temperature;

  if (form.type === 'bedrock') {
    if (form.awsRegion) config.aws_region = form.awsRegion;
    if (form.awsAccessKeyId) config.aws_access_key_id = form.awsAccessKeyId;
    if (form.awsSecretAccessKey) config.aws_secret_access_key = form.awsSecretAccessKey;
  }

  if (form.type === 'openapi') {
    config.model = form.model;
  }

  return config;
}

export default function ProvidersWorkspace() {
  const { updateConfig, configVersion } = useRun();
  const { data: providers, loading, refetch } = useApi<ProviderData[]>('/providers', configVersion);

  const [setupModal, setSetupModal] = useState<{
    type: string;
    name: string;
    defaultModel: string;
    editMode: boolean;
    editId?: string;
    initialData?: Partial<ProviderFormData>;
  } | null>(null);

  const hasConnected = providers && providers.length > 0;

  const handleOpenSetup = (type: string, name: string, defaultModel: string) => {
    setSetupModal({ type, name, defaultModel, editMode: false });
  };

  const handleOpenEdit = (provider: ProviderData) => {
    const [type] = provider.id.split(':');
    const nameEntry = availableProviders.find((p) => p.type === type);
    setSetupModal({
      type,
      name: nameEntry?.name || type,
      defaultModel: provider.model,
      editMode: true,
      editId: provider.id,
      initialData: {
        model: provider.model,
        baseUrl: provider.baseUrl || '',
        temperature: provider.temperature ?? 0.7,
        awsRegion: provider.awsRegion || 'us-east-1',
      },
    });
  };

  const handleSaveProvider = async (form: ProviderFormData) => {
    const currentProviders = providers || [];
    const newId = `${form.type}:${form.model}`;
    const config = buildProviderConfig(form);
    const newProvider = { id: newId, config };

    let updatedProviders: Record<string, unknown>[];

    if (setupModal?.editMode && setupModal.editId) {
      updatedProviders = currentProviders.map((p) => {
        if (p.id === setupModal.editId) {
          return newProvider;
        }
        return { id: p.id };
      });
    } else {
      const rawExisting = currentProviders.map((p) => ({ id: p.id }));
      updatedProviders = [...rawExisting, newProvider];
    }

    await updateConfig({ providers: updatedProviders });
    refetch();
    setSetupModal(null);
  };

  const handleRemove = async (removeId: string) => {
    const currentProviders = providers || [];
    const remaining = currentProviders
      .filter((p) => p.id !== removeId)
      .map((p) => ({ id: p.id }));
    await updateConfig({ providers: remaining });
    refetch();
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 scroll-smooth">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-[30px] font-semibold tracking-[-0.02em] leading-[38px] text-[#dae2fd] mb-1">
              Providers
            </h2>
            <p className="text-[#c2c6d6] text-[14px] leading-5">
              Manage API connections for LLM inference.
            </p>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#c2c6d6] text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search providers..."
                className="w-full bg-[#1e293b] border border-[#334155] rounded text-[#dae2fd] text-sm pl-9 pr-3 py-2 focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] font-mono text-[13px] leading-5 transition-all placeholder:text-[#c2c6d6]/50"
              />
            </div>
            <button
              onClick={() => handleOpenSetup('openapi', 'Custom OpenAPI', 'custom-model')}
              className="shrink-0 bg-[#1e293b] hover:bg-[#2d3449] border border-[#475569] text-[#dae2fd] py-2 px-4 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0f172a] focus:ring-[#3b82f6] h-9 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[18px]">add_link</span>
              Custom
            </button>
          </div>
        </div>

        {/* Connected Providers */}
        <section>
          <h3 className="text-[20px] font-semibold tracking-[-0.01em] leading-7 text-[#dae2fd] mb-4 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${hasConnected ? 'bg-[#4ae176]' : 'bg-[#8c909f]'}`} />
            Connected Providers
          </h3>

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[1, 2].map((i) => <SkeletonCard key={i} />)}
            </div>
          ) : hasConnected ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {providers!.map((provider) => {
                const [type] = provider.id.split(':');
                return (
                  <div
                    key={provider.id}
                    className="bg-[#1e293b] border border-[#334155] rounded-lg p-4 flex items-start gap-4 hover:border-[#475569] transition-colors group relative overflow-hidden"
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-[2px] ${provider.hasApiKey || type === 'bedrock' || type === 'ollama' ? 'bg-[#4ae176]' : 'bg-[#ffb4ab]'}`} />
                    <div className="w-12 h-12 rounded bg-white/5 border border-[#334155] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-2xl text-[#dae2fd]">
                        {providerIcons[type] || 'hub'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-base text-[#dae2fd] truncate capitalize">{type}</h4>
                        <div className="flex items-center gap-1.5">
                          {provider.hasApiKey ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#4ae176]/10 text-[#4ae176] border border-[#4ae176]/20">
                              Active
                            </span>
                          ) : type === 'ollama' || type === 'bedrock' ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#4ae176]/10 text-[#4ae176] border border-[#4ae176]/20">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#ffb4ab]/10 text-[#ffb4ab] border border-[#ffb4ab]/20">
                              No Key
                            </span>
                          )}
                          <button
                            onClick={() => handleOpenEdit(provider)}
                            className="text-[#c2c6d6] hover:text-[#adc6ff] transition-colors opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/5"
                            title="Edit provider"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button
                            onClick={() => handleRemove(provider.id)}
                            className="text-[#c2c6d6] hover:text-[#ffb4ab] transition-colors opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/5"
                            title="Remove provider"
                          >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2 text-sm">
                        <div>
                          <span className="text-[#c2c6d6] text-[11px] uppercase tracking-wider block mb-0.5">Model</span>
                          <span className="font-mono text-[13px] leading-5 text-[#c2c6d6]">{provider.model}</span>
                        </div>
                        {provider.apiKeyHint && (
                          <div>
                            <span className="text-[#c2c6d6] text-[11px] uppercase tracking-wider block mb-0.5">API Key</span>
                            <span className="font-mono text-[13px] leading-5 text-[#c2c6d6]">{provider.apiKeyHint}</span>
                          </div>
                        )}
                        {!provider.apiKeyHint && (
                          <div>
                            <span className="text-[#c2c6d6] text-[11px] uppercase tracking-wider block mb-0.5">Temperature</span>
                            <span className="font-mono text-[13px] leading-5 text-[#c2c6d6]">{provider.temperature ?? 'default'}</span>
                          </div>
                        )}
                        {provider.baseUrl && (
                          <div className="col-span-2 mt-1">
                            <span className="text-[#c2c6d6] text-[11px] uppercase tracking-wider block mb-0.5">Endpoint</span>
                            <span className="font-mono text-[13px] leading-5 text-[#c2c6d6] truncate block">{provider.baseUrl}</span>
                          </div>
                        )}
                        {provider.awsRegion && type === 'bedrock' && (
                          <div className="col-span-2 mt-1">
                            <span className="text-[#c2c6d6] text-[11px] uppercase tracking-wider block mb-0.5">AWS Region</span>
                            <span className="font-mono text-[13px] leading-5 text-[#c2c6d6]">{provider.awsRegion}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border border-dashed border-[#424754] rounded-lg p-8 text-center">
              <span className="material-symbols-outlined text-[32px] text-[#8c909f] mb-2 block">hub</span>
              <p className="text-[14px] text-[#c2c6d6] mb-1">No providers configured</p>
              <p className="text-[13px] text-[#8c909f]">
                Click "Connect" on a provider below to get started.
              </p>
            </div>
          )}
        </section>

        <div className="h-px bg-[#334155] w-full my-6" />

        {/* Available Integrations */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[20px] font-semibold tracking-[-0.01em] leading-7 text-[#dae2fd]">
              Available Integrations
            </h3>
            <span className="text-xs text-[#c2c6d6] font-mono">{availableProviders.length} native plugins</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {availableProviders.map((provider) => {
              const alreadyConnected = providers?.some((p) => p.type === provider.type);
              return (
                <div
                  key={provider.name}
                  className="bg-[#1e293b] border border-[#334155] rounded-lg p-4 hover:border-[#475569] transition-all flex flex-col items-center text-center group h-full"
                >
                  <div className="w-14 h-14 rounded-full bg-[#0f172a] border border-[#334155] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform duration-200">
                    <span className="material-symbols-outlined text-[28px] text-[#adc6ff]">{provider.icon}</span>
                  </div>
                  <h4 className="font-semibold text-[#dae2fd] mb-1">{provider.name}</h4>
                  <p className="text-xs text-[#c2c6d6] mb-4 flex-1 px-2">{provider.description}</p>
                  {alreadyConnected ? (
                    <span className="w-full text-center py-1.5 px-3 rounded text-sm font-medium text-[#4ae176] border border-[#4ae176]/30 bg-[#4ae176]/10">
                      Connected
                    </span>
                  ) : (
                    <button
                      onClick={() => handleOpenSetup(provider.type, provider.name, provider.defaultModel)}
                      className="w-full py-1.5 px-3 rounded text-sm font-medium transition-colors outline-none focus:ring-2 focus:ring-[#3b82f6] bg-transparent hover:bg-white/5 border border-[#475569] text-[#dae2fd]"
                    >
                      Connect
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Provider Setup Modal */}
      {setupModal && (
        <ProviderSetupModal
          providerType={setupModal.type}
          providerName={setupModal.name}
          defaultModel={setupModal.defaultModel}
          onClose={() => setSetupModal(null)}
          onSave={handleSaveProvider}
          editMode={setupModal.editMode}
          initialData={setupModal.initialData}
        />
      )}
    </div>
  );
}

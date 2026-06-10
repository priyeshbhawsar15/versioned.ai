'use client';

import { useState, useEffect, useRef } from 'react';
import { useApi } from '@/hooks/useApi';
import { useRun } from '@/context/RunContext';
import Link from 'next/link';

interface ConfigData {
  providers?: { id: string }[];
  prompts?: { id: string; file?: string; content?: string }[];
}

export default function PromptEditor() {
  const { runState, triggerRun, updateConfig, configVersion } = useRun();
  const { data: config, loading } = useApi<ConfigData>('/config', configVersion);

  const hasProviders = config?.providers && config.providers.length > 0;
  const hasPrompts = config?.prompts && config.prompts.length > 0;

  // Editable prompt content
  const [systemPrompt, setSystemPrompt] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Seed editor from config
  useEffect(() => {
    if (config?.prompts && config.prompts.length > 0) {
      const first = config.prompts[0];
      setSystemPrompt(first.content || `# Prompt: ${first.id}\n# File: ${first.file || '(inline)'}\n\n# Edit your prompt here`);
      setDirty(false);
    }
  }, [config]);

  const lineCount = Math.max(systemPrompt.split('\n').length, 1);

  const handleSave = async () => {
    setSaving(true);
    const promptId = config?.prompts?.[0]?.id || 'v1';
    const prompts = [{ id: promptId, content: systemPrompt }];
    await updateConfig({ prompts });
    setDirty(false);
    setSaving(false);
  };

  return (
    <>
      {/* Editor Header */}
      <div className="flex items-center bg-[#131b2e] border-b border-[#424754] px-2 pt-2 h-10 shrink-0">
        <div className="px-4 py-2 text-[11px] font-medium tracking-[0.05em] leading-4 font-mono h-full flex items-center -mb-[1px] text-[#adc6ff] border-b-2 border-[#adc6ff]">
          System Prompt
          {dirty && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-[#adc6ff] inline-block" />}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1 px-2 h-full">
          {/* Model Selector */}
          <div className="relative group/models">
            <button className="text-[#c2c6d6] hover:text-[#adc6ff] text-[11px] font-medium tracking-[0.05em] leading-4 font-mono border border-[#424754] hover:border-[#adc6ff] rounded px-2 py-1 flex items-center gap-1 transition-colors bg-[#0b1326]">
              <span className="material-symbols-outlined text-[16px]">smart_toy</span>
              Models ({hasProviders ? config!.providers!.length : 0})
              <span className="material-symbols-outlined text-[14px]">expand_more</span>
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 bg-[#222a3d] border border-[#424754] rounded shadow-xl z-30 hidden group-hover/models:block">
              <div className="p-1 flex flex-col gap-1">
                {hasProviders ? (
                  config!.providers!.map((p) => {
                    const [, model] = p.id.split(':');
                    return (
                      <label
                        key={p.id}
                        className="flex items-center gap-2 p-2 hover:bg-[#2d3449] rounded cursor-pointer transition-colors"
                      >
                        <input type="checkbox" defaultChecked className="rounded-sm bg-[#0b1326] border-[#424754] text-[#adc6ff] focus:ring-0 focus:ring-offset-0 w-3 h-3" />
                        <span className="text-[11px] font-medium tracking-[0.05em] leading-4 font-mono text-[#dae2fd]">{model || p.id}</span>
                      </label>
                    );
                  })
                ) : (
                  <div className="p-3 text-[11px] text-[#8c909f] text-center">No providers configured</div>
                )}
                <div className="border-t border-[#424754] mt-1 pt-1">
                  <Link href="/providers" className="w-full text-center py-1 text-[10px] uppercase tracking-widest text-[#adc6ff] hover:text-[#dae2fd] transition-colors font-bold block">
                    Manage Models
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={triggerRun}
            disabled={runState.isRunning}
            className={`text-[11px] font-medium tracking-[0.05em] leading-4 font-mono border rounded px-1 py-1 flex items-center gap-1 transition-colors bg-[#0b1326] ${
              runState.isRunning
                ? 'text-[#8c909f] border-[#424754] cursor-wait opacity-50'
                : 'text-[#c2c6d6] hover:text-[#adc6ff] border-[#424754] hover:border-[#adc6ff]'
            }`}
          >
            <span className={`material-symbols-outlined text-[14px] ${runState.isRunning ? 'animate-spin' : ''}`}>
              {runState.isRunning ? 'progress_activity' : 'play_arrow'}
            </span>
            {runState.isRunning ? 'Running...' : 'Run Selected'}
          </button>
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className={`border border-[#424754] rounded p-1 transition-colors bg-[#0b1326] ${
              dirty ? 'text-[#adc6ff] hover:border-[#adc6ff]' : 'text-[#8c909f] opacity-50'
            }`}
            title={dirty ? 'Save to prompt_eval.yaml' : 'No changes to save'}
          >
            <span className="material-symbols-outlined text-[14px]">{saving ? 'progress_activity' : 'save'}</span>
          </button>
        </div>
      </div>
      {/* Code Editor Area */}
      <div className="flex-1 bg-[#060e20] flex overflow-hidden font-mono text-[13px] leading-5 relative group">
        {/* Line Numbers */}
        <div className="w-12 bg-[#131b2e] text-[#8c909f] text-right pr-2 py-2 select-none border-r border-[#424754] shrink-0 overflow-hidden flex flex-col opacity-70">
          {Array.from({ length: lineCount }, (_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </div>
        {/* Editor Content */}
        <div className="flex-1 overflow-auto relative">
          {loading ? (
            <div className="p-2 text-[#8c909f] italic">Loading configuration...</div>
          ) : (
            <textarea
              ref={textareaRef}
              value={systemPrompt}
              onChange={(e) => { setSystemPrompt(e.target.value); setDirty(true); }}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                  e.preventDefault();
                  if (dirty) handleSave();
                }
              }}
              className="absolute inset-0 w-full h-full bg-transparent text-[#dae2fd] p-2 resize-none outline-none font-mono text-[13px] leading-5"
              spellCheck={false}
              placeholder={hasPrompts ? 'Edit your prompt here...' : '# No prompts loaded.\n# Add providers and prompts in the Providers page,\n# or create a prompt_eval.yaml in your project root.\n#\n# You can type a prompt here and save it with Ctrl+S.'}
            />
          )}
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-[#131b2e] border-l border-[#424754] opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-full h-8 bg-[#424754] opacity-20 absolute top-2 rounded-sm mx-[1px]" />
        </div>
      </div>
    </>
  );
}

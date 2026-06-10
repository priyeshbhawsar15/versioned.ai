'use client';

import PromptEditor from './PromptEditor';
import EvaluationMatrix from './EvaluationMatrix';

export default function PlaygroundWorkspace() {
  return (
    <>
      {/* Prompt Workspace (Top Half) */}
      <section className="h-1/2 flex flex-col border-b border-[#424754]">
        <PromptEditor />
      </section>
      {/* The Matrix Viewer (Bottom Half) */}
      <section className="h-1/2 flex flex-col bg-[#171f33]">
        <EvaluationMatrix />
      </section>
    </>
  );
}

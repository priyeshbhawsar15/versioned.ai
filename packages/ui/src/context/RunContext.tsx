'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

const API_BASE = '/api';

interface RunState {
  isRunning: boolean;
  lastRunAt: number | null;
  error: string | null;
}

interface RunContextValue {
  runState: RunState;
  triggerRun: () => Promise<void>;
  runVersion: number;
  updateConfig: (partial: Record<string, unknown>) => Promise<boolean>;
  configVersion: number;
}

const RunContext = createContext<RunContextValue | null>(null);

export function RunProvider({ children }: { children: ReactNode }) {
  const [runState, setRunState] = useState<RunState>({
    isRunning: false,
    lastRunAt: null,
    error: null,
  });
  const [runVersion, setRunVersion] = useState(0);
  const [configVersion, setConfigVersion] = useState(0);

  const triggerRun = useCallback(async () => {
    setRunState({ isRunning: true, lastRunAt: null, error: null });

    try {
      const res = await fetch(`${API_BASE}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setRunState({
          isRunning: false,
          lastRunAt: null,
          error: json.error || json.message || 'Run failed',
        });
        return;
      }

      setRunState({
        isRunning: false,
        lastRunAt: Date.now(),
        error: null,
      });
      setRunVersion((v) => v + 1);
    } catch (err) {
      setRunState({
        isRunning: false,
        lastRunAt: null,
        error: err instanceof Error ? err.message : 'Network error',
      });
    }
  }, []);

  const updateConfig = useCallback(async (partial: Record<string, unknown>): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partial),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setConfigVersion((v) => v + 1);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  return (
    <RunContext.Provider value={{ runState, triggerRun, runVersion, updateConfig, configVersion }}>
      {children}
    </RunContext.Provider>
  );
}

export function useRun() {
  const ctx = useContext(RunContext);
  if (!ctx) throw new Error('useRun must be used within RunProvider');
  return ctx;
}

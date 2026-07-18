import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, Platform } from 'react-native';
import { createInitialAgents, agentDefinitions } from '../agents/definitions';
import type {
  AgentId,
  AgentRuntime,
  PipelinePhase,
  ProjectArtifact,
  WorkspaceState,
} from '../agents/types';

type WorkspaceContextValue = WorkspaceState & {
  selectAgent: (id: AgentId | null) => void;
  setAgentPosition: (id: AgentId, x: number, y: number) => void;
  setPreviewPosition: (id: AgentId, x: number, y: number) => void;
  setCanvasOffset: (x: number, y: number) => void;
  setCanvasScale: (scale: number) => void;
  generate: () => void;
  reset: () => void;
  exportProject: () => void;
  setDarkModePreview: (v: boolean) => void;
  completedScreens: Array<'home' | 'profile' | 'settings'>;
  isGenerating: boolean;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function sleep(ms: number, signal?: { cancelled: boolean }) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => {
      if (signal?.cancelled) reject(new Error('cancelled'));
      else resolve();
    }, ms);
    if (signal?.cancelled) {
      clearTimeout(t);
      reject(new Error('cancelled'));
    }
  });
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [projectName] = useState('Aurora Mobile');
  const [phase, setPhase] = useState<PipelinePhase>('idle');
  const [agents, setAgents] = useState(() => createInitialAgents());
  const [selectedAgentId, setSelectedAgentId] = useState<AgentId | null>(null);
  const [artifacts, setArtifacts] = useState<ProjectArtifact[]>([]);
  const [canvasOffset, setCanvasOffsetState] = useState({ x: 40, y: 20 });
  const [canvasScale, setCanvasScale] = useState(1);
  const [darkModePreview, setDarkModePreview] = useState(true);
  const runIdRef = useRef(0);
  const cancelRef = useRef({ cancelled: false });

  const updateAgent = useCallback(
    (id: AgentId, patch: Partial<AgentRuntime>) => {
      setAgents((prev) => ({
        ...prev,
        [id]: { ...prev[id], ...patch },
      }));
    },
    []
  );

  const runAgent = useCallback(
    async (id: AgentId, runId: number) => {
      const def = agentDefinitions[id];
      updateAgent(id, {
        status: 'running',
        progress: 0,
        currentStepIndex: 0,
        currentTask: def.steps[0]?.label ?? 'Working…',
        startedAt: Date.now(),
        completedAt: undefined,
      });
      setSelectedAgentId(id);

      const total = def.steps.reduce((s, step) => s + step.durationMs, 0);
      let elapsed = 0;

      for (let i = 0; i < def.steps.length; i++) {
        if (cancelRef.current.cancelled || runIdRef.current !== runId) return;
        const step = def.steps[i];
        updateAgent(id, {
          currentStepIndex: i,
          currentTask: step.label,
          progress: Math.round((elapsed / total) * 100),
        });

        // Smooth progress ticks within step
        const ticks = Math.max(3, Math.floor(step.durationMs / 120));
        const tickMs = step.durationMs / ticks;
        for (let t = 0; t < ticks; t++) {
          if (cancelRef.current.cancelled || runIdRef.current !== runId) return;
          await sleep(tickMs, cancelRef.current);
          const stepProgress = (t + 1) / ticks;
          const overall = ((elapsed + step.durationMs * stepProgress) / total) * 100;
          updateAgent(id, { progress: Math.min(99, Math.round(overall)) });
        }
        elapsed += step.durationMs;
      }

      if (cancelRef.current.cancelled || runIdRef.current !== runId) return;

      const newArtifacts: ProjectArtifact[] = [
        ...def.files.map((path) => ({
          type: (path.includes('Screen') || path.includes('(tabs)')
            ? 'screen'
            : 'file') as ProjectArtifact['type'],
          name: path.split('/').pop() ?? path,
          path,
          agentId: id,
        })),
        ...def.components.map((name) => ({
          type: 'component' as const,
          name,
          path: `src/components/${name}.tsx`,
          agentId: id,
        })),
      ];

      setArtifacts((prev) => {
        const keys = new Set(prev.map((a) => a.path + a.name));
        const merged = [...prev];
        for (const a of newArtifacts) {
          const k = a.path + a.name;
          if (!keys.has(k)) {
            keys.add(k);
            merged.push(a);
          }
        }
        return merged;
      });

      updateAgent(id, {
        status: 'complete',
        progress: 100,
        currentTask: 'Done',
        currentStepIndex: def.steps.length - 1,
        completedAt: Date.now(),
      });
    },
    [updateAgent]
  );

  const generate = useCallback(async () => {
    cancelRef.current = { cancelled: false };
    const runId = ++runIdRef.current;
    setPhase('running');
    setArtifacts([]);
    setAgents(createInitialAgents());

    // Queue markers
    for (const id of ['architecture', 'designSystem', 'home', 'profile', 'settings'] as AgentId[]) {
      updateAgent(id, {
        status: 'queued',
        currentTask: 'Queued',
        progress: 0,
      });
    }

    try {
      await runAgent('architecture', runId);
      if (runIdRef.current !== runId) return;
      await runAgent('designSystem', runId);
      if (runIdRef.current !== runId) return;
      // Home first
      await runAgent('home', runId);
      if (runIdRef.current !== runId) return;
      // Profile + Settings in parallel
      await Promise.all([
        runAgent('profile', runId),
        runAgent('settings', runId),
      ]);
      if (runIdRef.current !== runId) return;
      setPhase('complete');
      setSelectedAgentId('home');
    } catch {
      if (!cancelRef.current.cancelled) setPhase('idle');
    }
  }, [runAgent, updateAgent]);

  const reset = useCallback(() => {
    cancelRef.current.cancelled = true;
    runIdRef.current += 1;
    setPhase('idle');
    setAgents(createInitialAgents());
    setArtifacts([]);
    setSelectedAgentId(null);
  }, []);

  const exportProject = useCallback(() => {
    setPhase((p) => (p === 'complete' ? 'exporting' : p));
    const message =
      'Expo project is ready under this repo:\n\n' +
      '• Shared tokens: src/theme/tokens.ts\n' +
      '• Screens: src/generated/screens/\n' +
      '• Tabs: app/(preview)/\n\n' +
      'Run: npx expo start\n' +
      'Open Live Preview for the generated app.';
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // eslint-disable-next-line no-alert
      window.alert('Export to Expo\n\n' + message);
    } else {
      Alert.alert('Export to Expo', message);
    }
    setTimeout(() => {
      setPhase((p) => (p === 'exporting' ? 'complete' : p));
    }, 800);
  }, []);

  const completedScreens = useMemo(() => {
    const keys: Array<'home' | 'profile' | 'settings'> = [];
    if (agents.home.status === 'complete') keys.push('home');
    if (agents.profile.status === 'complete') keys.push('profile');
    if (agents.settings.status === 'complete') keys.push('settings');
    return keys;
  }, [agents]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      projectName,
      phase,
      agents,
      selectedAgentId,
      artifacts,
      canvasOffset,
      canvasScale,
      darkModePreview,
      selectAgent: setSelectedAgentId,
      setAgentPosition: (id, x, y) =>
        updateAgent(id, { position: { x, y } }),
      setPreviewPosition: (id, x, y) =>
        updateAgent(id, { previewPosition: { x, y } }),
      setCanvasOffset: (x, y) => setCanvasOffsetState({ x, y }),
      setCanvasScale,
      generate,
      reset,
      exportProject,
      setDarkModePreview,
      completedScreens,
      isGenerating: phase === 'running',
    }),
    [
      projectName,
      phase,
      agents,
      selectedAgentId,
      artifacts,
      canvasOffset,
      canvasScale,
      darkModePreview,
      updateAgent,
      generate,
      reset,
      exportProject,
      completedScreens,
    ]
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return ctx;
}

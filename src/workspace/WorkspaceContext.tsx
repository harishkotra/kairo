import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, Platform } from 'react-native';
import {
  agentName,
  createInitialAgents,
  isScreenAgent,
  screenAgentId,
} from '../agents/definitions';
import type {
  AgentId,
  AgentRuntime,
  AppPlan,
  ArtifactGraph,
  DecisionRecord,
  PipelinePhase,
  ProjectArtifact,
  TraceEvent,
  WorkspaceState,
  WorkspaceView,
} from '../agents/types';
import {
  emptyArtifactGraph,
  mergeAgentArtifacts,
} from '../artifacts/graph';
import { planAppFromPrompt } from '../ai/appPlanner';
import { inferAgentInsights } from '../ai/agentInference';
import { generateScreenContent } from '../ai/screenContent';
import { canUseLiveAi, getDefaultAiMode } from '../ai/config';
import { MemoryService } from '../memory/MemoryService';
import { canUseMem0 } from '../memory/mem0Client';
import type { MemoryEntry } from '../memory/types';
import { laminar, laminarStatus } from '../telemetry/laminar';
import {
  bootAgentVm,
  exportProjectToServer,
  sharePreviewState,
  stopAgentVm,
  writeAgentWorkspace,
} from '../agentos/client';

export type TimelineFilter = { label: string; types: string[] };

type WorkspaceContextValue = WorkspaceState & {
  setUserPrompt: (p: string) => void;
  selectAgent: (id: AgentId | null) => void;
  setAgentPosition: (id: AgentId, x: number, y: number) => void;
  setPreviewPosition: (id: AgentId, x: number, y: number) => void;
  setCanvasOffset: (x: number, y: number) => void;
  setCanvasScale: (scale: number) => void;
  setView: (view: WorkspaceView) => void;
  setUseMockAi: (v: boolean) => void;
  generate: (promptOverride?: string) => void;
  reset: () => void;
  exportProject: () => void;
  setDarkModePreview: (v: boolean) => void;
  completedScreenIds: string[];
  isGenerating: boolean;
  liveAiAvailable: boolean;
  selectedArtifactId: string | null;
  selectArtifact: (id: string | null) => void;
  selectedDecisionId: string | null;
  selectDecision: (id: string | null) => void;
  /** Filter applied to the timeline view (event-type prefixes). */
  timelineFilter: TimelineFilter | null;
  setTimelineFilter: (f: TimelineFilter | null) => void;
  setReplayActive: (v: boolean) => void;
  setReplayCursorMs: (ms: number) => void;
  setReplayPlaying: (v: boolean) => void;
  runDurationMs: number;
  memories: MemoryEntry[];
  memoryBackend: 'mock' | 'mem0';
  mem0Available: boolean;
  laminarTelemetry: { enabled: boolean; baseUrl: string; hasKey: boolean };
  totals: {
    tokens: number;
    costUsd: number;
    files: number;
    components: number;
    events: number;
    decisions: number;
    memories: number;
  };
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

let eventSeq = 0;
function makeEventId() {
  eventSeq += 1;
  return `ev-${Date.now()}-${eventSeq}`;
}
let decisionSeq = 0;
function makeDecisionId() {
  decisionSeq += 1;
  return `dec-${Date.now()}-${decisionSeq}`;
}

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
  const [userPrompt, setUserPrompt] = useState('');
  const [appPlan, setAppPlan] = useState<AppPlan | null>(null);
  const [projectName, setProjectName] = useState('Untitled');
  const [phase, setPhase] = useState<PipelinePhase>('idle');
  const [agents, setAgents] = useState<Record<AgentId, AgentRuntime>>({});
  const [agentOrder, setAgentOrder] = useState<AgentId[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<AgentId | null>(null);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(
    null
  );
  const [selectedDecisionId, setSelectedDecisionId] = useState<string | null>(
    null
  );
  const [artifacts, setArtifacts] = useState<ProjectArtifact[]>([]);
  const [artifactGraph, setArtifactGraph] = useState<ArtifactGraph>(
    emptyArtifactGraph
  );
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [canvasOffset, setCanvasOffsetState] = useState({ x: 40, y: 20 });
  const [canvasScale, setCanvasScale] = useState(1);
  const [darkModePreview, setDarkModePreview] = useState(true);
  const [view, setView] = useState<WorkspaceView>('canvas');
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter | null>(
    null
  );
  const [useMockAi, setUseMockAiState] = useState(
    () => getDefaultAiMode() === 'mock' || !canUseLiveAi()
  );
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const [runEndedAt, setRunEndedAt] = useState<number | null>(null);
  const [replayActive, setReplayActive] = useState(false);
  const [replayCursorMs, setReplayCursorMs] = useState(0);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [exportSucceeded, setExportSucceeded] = useState(false);

  const runIdRef = useRef(0);
  const cancelRef = useRef({ cancelled: false });
  const artifactGraphRef = useRef(artifactGraph);
  const agentsRef = useRef(agents);
  const planRef = useRef<AppPlan | null>(null);
  const memoryRef = useRef(new MemoryService(canUseMem0()));

  useEffect(() => {
    artifactGraphRef.current = artifactGraph;
  }, [artifactGraph]);
  useEffect(() => {
    agentsRef.current = agents;
  }, [agents]);
  useEffect(() => {
    planRef.current = appPlan;
  }, [appPlan]);

  const syncMemories = useCallback(() => {
    setMemories(memoryRef.current.getAll());
  }, []);

  const pushEvent = useCallback(
    (ev: Omit<TraceEvent, 'id' | 'ts'> & { ts?: number }) => {
      const full: TraceEvent = {
        id: makeEventId(),
        ts: ev.ts ?? Date.now(),
        type: ev.type,
        agentId: ev.agentId,
        title: ev.title,
        detail: ev.detail,
        meta: ev.meta,
      };
      setEvents((prev) => [...prev, full]);
      laminar.recordEvent(
        full.type,
        {
          'kairo.event_id': full.id,
          'kairo.title': full.title,
          'kairo.detail': full.detail ?? '',
          ...(full.meta ?? {}),
        },
        full.agentId
      );
      return full;
    },
    []
  );

  const updateAgent = useCallback(
    (id: AgentId, patch: Partial<AgentRuntime>) => {
      setAgents((prev) => {
        if (!prev[id]) return prev;
        return { ...prev, [id]: { ...prev[id], ...patch } };
      });
    },
    []
  );

  const setUseMockAi = useCallback((v: boolean) => {
    if (!v && !canUseLiveAi()) {
      const msg =
        'Live AI needs EXPO_PUBLIC_AI_API_KEY in .env. Staying on mock.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(msg);
      } else {
        Alert.alert('Live AI unavailable', msg);
      }
      return;
    }
    setUseMockAiState(v);
  }, []);

  const runAgent = useCallback(
    async (
      id: AgentId,
      runId: number,
      mock: boolean,
      brief: string
    ) => {
      const def = agentsRef.current[id];
      if (!def) return;
      const memory = memoryRef.current;
      const recalled = await memory.search(def.goal, {
        agentId: id as never,
        includeShared: true,
        limit: 5,
      });
      if (recalled.length > 0) {
        pushEvent({
          type: 'memory.searched',
          agentId: id,
          title: `${def.name} recalled memory`,
          detail: recalled.map((r) => r.title).join(' · '),
          meta: { hits: recalled.length },
        });
      }

      const unmet = def.dependsOn.filter(
        (d) => agentsRef.current[d]?.status !== 'complete'
      );
      if (unmet.length > 0) {
        updateAgent(id, {
          status: 'blocked',
          currentTask: `Blocked on ${unmet.map((d) => agentName(d, agentsRef.current)).join(', ')}`,
        });
        pushEvent({
          type: 'agent.blocked',
          agentId: id,
          title: `${def.name} blocked`,
          detail: unmet.join(', '),
        });
        await sleep(200, cancelRef.current);
      } else if (def.dependsOn.length > 0) {
        updateAgent(id, {
          status: 'waiting',
          currentTask: 'Dependencies ready — starting',
        });
        pushEvent({
          type: 'agent.waiting',
          agentId: id,
          title: `${def.name} waiting`,
        });
        await sleep(160, cancelRef.current);
      }

      if (cancelRef.current.cancelled || runIdRef.current !== runId) return;

      const startedAt = Date.now();
      laminar.startAgent(id, {
        'kairo.agent_name': def.name,
        'kairo.goal': def.goal,
      });

      updateAgent(id, {
        status: 'running',
        progress: 0,
        currentStepIndex: 0,
        currentTask: 'Booting agent VM…',
        startedAt,
        completedAt: undefined,
        durationMs: 0,
        reasoningSummary: '',
        warnings: [],
        vm: {
          key: `kairo-${id}`,
          status: 'booting',
          mode: 'simulated',
          filesWritten: [],
        },
      });
      setSelectedAgentId(id);

      // agentOS: isolated VM per agent (real bridge or simulated)
      const plan = planRef.current;
      const vm = await bootAgentVm({
        agentId: id,
        agentName: def.name,
        goal: def.goal,
        projectName: plan?.projectName ?? 'app',
        brief,
      });
      if (cancelRef.current.cancelled || runIdRef.current !== runId) return;

      updateAgent(id, {
        vm: {
          key: vm.key,
          status: 'running',
          mode: vm.mode,
          sessionId: vm.sessionId,
          filesWritten: vm.filesWritten,
          lastLog: vm.lastLog,
          endpoint: vm.endpoint,
        },
        currentTask: def.steps[0]?.label ?? 'Working…',
      });
      pushEvent({
        type: 'agent.started',
        agentId: id,
        title: `${def.name} · VM ${vm.mode === 'agentos' ? 'agentOS' : 'sim'}`,
        detail: `${vm.key} · ${vm.filesWritten[0] ?? '/workspace'}`,
        meta: {
          vmKey: vm.key,
          vmMode: vm.mode,
          sessionId: vm.sessionId ?? '',
        },
      });

      await writeAgentWorkspace({
        key: vm.key,
        path: '/workspace/out/progress.md',
        content: `# ${def.name}\n\n${def.goal}\n`,
        mode: vm.mode,
      });

      const total = def.steps.reduce((s, step) => s + step.durationMs, 0);
      let elapsed = 0;
      for (let i = 0; i < def.steps.length; i++) {
        if (cancelRef.current.cancelled || runIdRef.current !== runId) return;
        const step = def.steps[i];
        const progressBase = Math.round((elapsed / total) * 100);
        updateAgent(id, {
          currentStepIndex: i,
          currentTask: step.label,
          progress: progressBase,
          durationMs: Date.now() - startedAt,
        });
        pushEvent({
          type: 'agent.step',
          agentId: id,
          title: step.label,
          detail: `${def.name} · step ${i + 1}/${def.steps.length}`,
          meta: { stepId: step.id, progress: progressBase },
        });
        const ticks = Math.max(3, Math.floor(step.durationMs / 120));
        const tickMs = step.durationMs / ticks;
        for (let t = 0; t < ticks; t++) {
          if (cancelRef.current.cancelled || runIdRef.current !== runId) return;
          await sleep(tickMs, cancelRef.current);
          const stepProgress = (t + 1) / ticks;
          const overall =
            ((elapsed + step.durationMs * stepProgress) / total) * 100;
          updateAgent(id, {
            progress: Math.min(99, Math.round(overall)),
            durationMs: Date.now() - startedAt,
          });
        }
        elapsed += step.durationMs;
      }

      if (cancelRef.current.cancelled || runIdRef.current !== runId) return;

      updateAgent(id, {
        currentTask: mock ? 'Writing summary…' : 'Calling model…',
        progress: 99,
      });

      const inferenceSpan = laminar.startChild(
        `inference.${id}`,
        'inference',
        id,
        { 'kairo.mock': mock }
      );
      const insights = await inferAgentInsights(def, mock, brief);
      laminar.endChild(inferenceSpan, true, {
        'kairo.tokens': insights.tokenUsage.total,
        'kairo.confidence': insights.confidence,
      });
      if (cancelRef.current.cancelled || runIdRef.current !== runId) return;

      pushEvent({
        type: 'agent.reasoning',
        agentId: id,
        title: `${def.name} reasoning`,
        detail: insights.reasoningSummary,
        meta: {
          confidence: insights.confidence,
          tokens: insights.tokenUsage.total,
          live: insights.usedLive,
        },
      });

      await memory.rememberReasoning(id as never, insights.reasoningSummary);

      const decisionRecords: DecisionRecord[] = insights.decisions.map((d) => ({
        id: makeDecisionId(),
        agentId: id,
        ts: Date.now(),
        title: d.title,
        decision: d.decision,
        reason: d.reason,
        alternatives: d.alternatives,
        confidence: d.confidence,
        category: d.category,
      }));
      if (decisionRecords.length) {
        setDecisions((prev) => [...prev, ...decisionRecords]);
        for (const d of decisionRecords) {
          pushEvent({
            type: 'agent.decision',
            agentId: id,
            title: `Decision: ${d.decision}`,
            detail: d.reason,
            meta: {
              decisionId: d.id,
              confidence: d.confidence,
              category: d.category,
            },
          });
          await memory.rememberDecision(d as never);
        }
      }

      // AI-enrich screen content for screen agents
      if (def.screenSpec && !mock) {
        const rich = await generateScreenContent(
          def.screenSpec,
          brief,
          plan?.projectName ?? 'App',
          mock
        );
        if (rich !== def.screenSpec && rich.sections.length > 0) {
          updateAgent(id, { screenSpec: rich });
          // Also update the appPlan so DynamicScreen renders enriched content
          const currentPlan = planRef.current;
          if (currentPlan) {
            const idx = currentPlan.screens.findIndex(
              (s) => s.id === def.screenSpec?.id
            );
            if (idx >= 0) {
              const updated = [...currentPlan.screens];
              updated[idx] = rich;
              const newPlan = { ...currentPlan, screens: updated };
              planRef.current = newPlan;
              setAppPlan(newPlan);
            }
          }
        }
      }

      const completedAt = Date.now();
      const { graph, created } = mergeAgentArtifacts(
        artifactGraphRef.current,
        id,
        completedAt,
        plan
      );
      artifactGraphRef.current = graph;
      setArtifactGraph(graph);
      setArtifacts(graph.nodes);

      for (const art of created) {
        pushEvent({
          type: 'artifact.created',
          agentId: id,
          title: `Generated ${art.name}`,
          detail: art.path,
          meta: { artifactId: art.id, type: art.type, version: art.version },
        });
        laminar.recordArtifact({
          agentId: id,
          artifactId: art.id,
          name: art.name,
          path: art.path,
          type: art.type,
          version: art.version,
        });
      }

      if (def.childIds.length > 0) {
        pushEvent({
          type: 'handoff',
          agentId: id,
          title: `Handoff → ${def.childIds.map((c) => agentName(c, agentsRef.current)).join(', ')}`,
          detail: insights.nextHandoff,
        });
        await memory.rememberHandoff(
          id as never,
          def.childIds as never,
          insights.nextHandoff
        );
      }

      updateAgent(id, {
        status: 'complete',
        progress: 100,
        currentTask: 'Done',
        currentStepIndex: def.steps.length - 1,
        completedAt,
        durationMs: completedAt - startedAt,
        reasoningSummary: insights.reasoningSummary,
        warnings: insights.warnings,
        nextHandoff: insights.nextHandoff,
        confidence: insights.confidence,
        tokenUsage: insights.tokenUsage,
        estimatedCostUsd: insights.estimatedCostUsd,
      });

      pushEvent({
        type: 'agent.complete',
        agentId: id,
        title: `${def.name} complete`,
        detail: `${created.length} artifacts · ${(insights.confidence * 100).toFixed(0)}% conf`,
        meta: {
          durationMs: completedAt - startedAt,
          tokens: insights.tokenUsage.total,
        },
      });

      laminar.endAgent(id, true, {
        'kairo.duration_ms': completedAt - startedAt,
        'kairo.tokens': insights.tokenUsage.total,
      });

      // Complete VM write + stop session (keep record)
      const vmState = agentsRef.current[id]?.vm;
      if (vmState) {
        await writeAgentWorkspace({
          key: vmState.key,
          path: '/workspace/out/RESULT.md',
          content: `# ${def.name} complete\n\n${insights.reasoningSummary}\n`,
          mode: vmState.mode,
        });
        await stopAgentVm({ key: vmState.key, mode: vmState.mode });
        updateAgent(id, {
          vm: {
            ...vmState,
            status: 'ready',
            filesWritten: [
              ...vmState.filesWritten,
              '/workspace/out/RESULT.md',
            ],
            lastLog: 'Session closed · workspace retained',
          },
        });
      }

      // First product screen unlocks live preview
      if (
        isScreenAgent(id) &&
        plan &&
        (id === screenAgentId(plan.primaryScreenId) ||
          (plan.screens[0] && id === screenAgentId(plan.screens[0].id)))
      ) {
        setPreviewReady(true);
        pushEvent({
          type: 'preview.ready',
          agentId: id,
          title: 'Live preview ready',
          detail: `${def.screenSpec?.title ?? 'Primary'} shipped — remaining screens may still be building.`,
        });
      }

      syncMemories();
    },
    [pushEvent, updateAgent, syncMemories]
  );

  const generate = useCallback(
    async (promptOverride?: string) => {
      const brief = (promptOverride ?? userPrompt).trim();
      if (!brief) {
        const msg = 'Add a product brief before building.';
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(msg);
        } else {
          Alert.alert('Brief required', msg);
        }
        return;
      }

      cancelRef.current = { cancelled: false };
      const runId = ++runIdRef.current;
      const mock = useMockAi;
      const origin = Date.now();

      memoryRef.current = new MemoryService(canUseMem0());
      memoryRef.current.clear();

      setUserPrompt(brief);
      setPhase('planning');
      setArtifacts([]);
      setArtifactGraph(emptyArtifactGraph());
      artifactGraphRef.current = emptyArtifactGraph();
      setEvents([]);
      setDecisions([]);
      setMemories([]);
      setAgents({});
      setAgentOrder([]);
      setAppPlan(null);
      planRef.current = null;
      setSelectedArtifactId(null);
      setSelectedDecisionId(null);
      setRunStartedAt(origin);
      setRunEndedAt(null);
      setReplayActive(false);
      setReplayPlaying(false);
      setReplayCursorMs(0);
      setPreviewReady(false);
      setExportSucceeded(false);
      setView('canvas');

      laminar.startPipeline({
        'kairo.prompt': brief.slice(0, 200),
        'kairo.mock_ai': mock,
      });

      pushEvent({
        type: 'pipeline.start',
        title: 'Run started',
        detail: mock ? 'Mock planning' : 'Live planning',
        meta: { mock },
        ts: origin,
      });

      try {
        const planned = await planAppFromPrompt(brief, mock);
        if (runIdRef.current !== runId) return;

        const plan = planned.plan;
        setAppPlan(plan);
        planRef.current = plan;
        setProjectName(plan.projectName);

        const { agents: initial, order } = createInitialAgents(plan);
        setAgents(initial);
        agentsRef.current = initial;
        setAgentOrder(order);

        pushEvent({
          type: 'plan.ready',
          title: `Plan: ${plan.projectName}`,
          detail: `${plan.screens.map((s) => s.title).join(' · ')} · ${plan.navigation}`,
          meta: {
            screens: plan.screens.length,
            live: planned.usedLive,
            tokens: planned.tokenUsage.total,
            reasoning: planned.reasoningSummary.slice(0, 300),
          },
        });

        if (!planned.usedLive && !mock && planned.tokenUsage.total === 0) {
          pushEvent({
            type: 'agent.reasoning',
            agentId: 'planner',
            title: 'AI planning failed',
            detail: planned.reasoningSummary,
            meta: { live: false, fallback: 'dynamic_mock' },
          });
        }

        await memoryRef.current.seedRun(plan.projectName);
        await memoryRef.current.add({
          scope: 'shared',
          kind: 'context',
          title: 'Product brief',
          content: brief,
          sharedWith: order as never,
        });
        syncMemories();

        setPhase('running');

        for (const id of order) {
          updateAgent(id, {
            status: 'queued',
            currentTask: 'Queued',
            progress: 0,
          });
          pushEvent({
            type: 'agent.queued',
            agentId: id,
            title: `${agentName(id, initial)} queued`,
          });
        }

        await runAgent('architecture', runId, mock, brief);
        if (runIdRef.current !== runId) return;
        await runAgent('designSystem', runId, mock, brief);
        if (runIdRef.current !== runId) return;

        const primaryId = screenAgentId(plan.primaryScreenId);
        const primary =
          order.find((id) => id === primaryId) ??
          order.find((id) => isScreenAgent(id));
        const rest = order.filter(
          (id) => isScreenAgent(id) && id !== primary
        );

        if (primary) {
          await runAgent(primary, runId, mock, brief);
          if (runIdRef.current !== runId) return;
        }

        if (rest.length) {
          pushEvent({
            type: 'handoff',
            title: 'Parallel screen agents',
            detail: rest.map((id) => agentName(id, agentsRef.current)).join(' ∥ '),
          });
          await Promise.all(
            rest.map((id) => runAgent(id, runId, mock, brief))
          );
        }

        if (runIdRef.current !== runId) return;
        const ended = Date.now();
        setRunEndedAt(ended);
        setPhase('complete');
        if (primary) setSelectedAgentId(primary);
        setReplayCursorMs(ended - origin);
        pushEvent({
          type: 'pipeline.complete',
          title: 'Run complete',
          detail: `${plan.projectName} · ${plan.screens.length} screens`,
          ts: ended,
        });
        laminar.endPipeline(true, { 'kairo.duration_ms': ended - origin });
        syncMemories();
        // Share the app plan with the agentOS server so the /preview route
        // can render it when opened fresh (e.g. via Expo Go QR scan).
        sharePreviewState(plan, plan.projectName).catch(() => {});
      } catch {
        if (!cancelRef.current.cancelled) {
          setPhase('idle');
          laminar.endPipeline(false);
        }
      }
    },
    [
      userPrompt,
      useMockAi,
      pushEvent,
      runAgent,
      updateAgent,
      syncMemories,
    ]
  );

  const reset = useCallback(() => {
    cancelRef.current.cancelled = true;
    runIdRef.current += 1;
    memoryRef.current.clear();
    setPhase('idle');
    setAgents({});
    setAgentOrder([]);
    setAppPlan(null);
    planRef.current = null;
    setProjectName('Untitled');
    setArtifacts([]);
    setArtifactGraph(emptyArtifactGraph());
    artifactGraphRef.current = emptyArtifactGraph();
    setEvents([]);
    setDecisions([]);
    setMemories([]);
    setSelectedAgentId(null);
    setSelectedArtifactId(null);
    setSelectedDecisionId(null);
    setRunStartedAt(null);
    setRunEndedAt(null);
    setReplayActive(false);
    setReplayPlaying(false);
    setReplayCursorMs(0);
    setPreviewReady(false);
    setExportSucceeded(false);
    pushEvent({ type: 'pipeline.reset', title: 'Workspace reset' });
    laminar.endPipeline(false, { 'kairo.reset': true });
  }, [pushEvent]);

  const exportProject = useCallback(async () => {
    setPhase((p) => (p === 'complete' ? 'exporting' : p));
    const exportSpan = laminar.startChild('export.expo', 'export');
    pushEvent({
      type: 'export',
      title: 'Export package',
      detail: 'Generating standalone Expo project…',
    });

    const plan = planRef.current;
    if (plan) {
      const result = await exportProjectToServer(plan, plan.projectName);
      if (result.ok && result.path) {
        const msg = `Project exported to:\n${result.path}\n\n${result.message}`;
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert('Export complete\n\n' + msg);
        } else {
          Alert.alert('Export complete', msg);
        }
        setExportSucceeded(true);
        laminar.endChild(exportSpan, true);
        setTimeout(() => {
          setPhase((p) => (p === 'exporting' ? 'complete' : p));
        }, 800);
        return;
      }
    }

    // Fallback: show old alert
    const message =
      'Project sources in this repo:\n\n' +
      '• Theme: src/theme/\n' +
      '• Screens: driven by the product plan (DynamicScreen)\n' +
      '• Preview: app/preview/\n\n' +
      'npx expo start';
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert('Export\n\n' + message);
    } else {
      Alert.alert('Export', message);
    }
    setExportSucceeded(true);
    laminar.endChild(exportSpan, true);
    setTimeout(() => {
      setPhase((p) => (p === 'exporting' ? 'complete' : p));
    }, 800);
  }, [pushEvent]);

  const runDurationMs = useMemo(() => {
    if (runStartedAt == null) return 0;
    return Math.max(0, (runEndedAt ?? Date.now()) - runStartedAt);
  }, [runStartedAt, runEndedAt, phase, events.length]);

  useEffect(() => {
    if (!replayPlaying || !replayActive) return;
    const duration = runDurationMs || 1;
    const id = setInterval(() => {
      setReplayCursorMs((prev) => {
        const next = prev + 120;
        if (next >= duration) {
          setReplayPlaying(false);
          return duration;
        }
        return next;
      });
    }, 120);
    return () => clearInterval(id);
  }, [replayPlaying, replayActive, runDurationMs]);

  const completedScreenIds = useMemo(() => {
    return agentOrder
      .filter((id) => isScreenAgent(id) && agents[id]?.status === 'complete')
      .map((id) => id.replace('screen:', ''));
  }, [agents, agentOrder]);

  const totals = useMemo(() => {
    let tokens = 0;
    let costUsd = 0;
    for (const id of agentOrder) {
      tokens += agents[id]?.tokenUsage.total ?? 0;
      costUsd += agents[id]?.estimatedCostUsd ?? 0;
    }
    return {
      tokens,
      costUsd,
      files: artifacts.filter(
        (a) => a.type === 'file' || a.type === 'layout' || a.type === 'screen'
      ).length,
      components: artifacts.filter((a) => a.type === 'component').length,
      events: events.length,
      decisions: decisions.length,
      memories: memories.length,
    };
  }, [agents, agentOrder, artifacts, events.length, decisions.length, memories.length]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      projectName,
      userPrompt,
      appPlan,
      phase,
      agents,
      agentOrder,
      selectedAgentId,
      artifacts,
      artifactGraph,
      events,
      decisions,
      canvasOffset,
      canvasScale,
      darkModePreview,
      view,
      useMockAi,
      runStartedAt,
      runEndedAt,
      replayActive,
      replayCursorMs,
      replayPlaying,
      previewReady,
      exportSucceeded,
      setUserPrompt,
      selectAgent: setSelectedAgentId,
      setAgentPosition: (id, x, y) =>
        updateAgent(id, { position: { x, y } }),
      setPreviewPosition: (id, x, y) =>
        updateAgent(id, { previewPosition: { x, y } }),
      setCanvasOffset: (x, y) => setCanvasOffsetState({ x, y }),
      setCanvasScale,
      setView,
      setUseMockAi,
      generate,
      reset,
      exportProject,
      setDarkModePreview,
      completedScreenIds,
      isGenerating: phase === 'running' || phase === 'planning',
      liveAiAvailable: canUseLiveAi(),
      selectedArtifactId,
      selectArtifact: setSelectedArtifactId,
      selectedDecisionId,
      selectDecision: setSelectedDecisionId,
      timelineFilter,
      setTimelineFilter,
      setReplayActive,
      setReplayCursorMs,
      setReplayPlaying,
      runDurationMs,
      memories,
      memoryBackend: memoryRef.current.isLive() ? 'mem0' : 'mock',
      mem0Available: canUseMem0(),
      laminarTelemetry: laminarStatus(),
      totals,
    }),
    [
      projectName,
      userPrompt,
      appPlan,
      phase,
      agents,
      agentOrder,
      selectedAgentId,
      artifacts,
      artifactGraph,
      events,
      decisions,
      canvasOffset,
      canvasScale,
      darkModePreview,
      view,
      useMockAi,
      runStartedAt,
      runEndedAt,
      replayActive,
      replayCursorMs,
      replayPlaying,
      previewReady,
      exportSucceeded,
      updateAgent,
      setUseMockAi,
      generate,
      reset,
      exportProject,
      completedScreenIds,
      selectedArtifactId,
      selectedDecisionId,
      timelineFilter,
      runDurationMs,
      memories,
      totals,
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

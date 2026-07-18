/** Dynamic agent ids: architecture | designSystem | screen:<slug> */
export type AgentId = string;

/** Runtime + DAG colors */
export type AgentStatus =
  | 'idle'
  | 'queued'
  | 'waiting'
  | 'blocked'
  | 'running'
  | 'retrying'
  | 'complete'
  | 'error';

export type AgentStep = {
  id: string;
  label: string;
  durationMs: number;
};

export type ScreenSection = {
  type: 'hero' | 'stats' | 'cards' | 'list' | 'actions' | 'form' | 'chart';
  title?: string;
  items?: Array<{ title: string; subtitle?: string; badge?: string }>;
};

export type ScreenSpec = {
  id: string;
  title: string;
  role: string;
  icon: string;
  layout: 'feed' | 'dashboard' | 'list' | 'profile' | 'settings' | 'detail' | 'form';
  sections: ScreenSection[];
};

/** Product plan produced from the user prompt (LLM or heuristic). */
export type AppPlan = {
  projectName: string;
  summary: string;
  userPrompt: string;
  navigation: 'tabs' | 'stack' | 'drawer';
  screens: ScreenSpec[];
  designNotes: string;
  primaryScreenId: string;
};

export type AgentDefinition = {
  id: AgentId;
  name: string;
  role: string;
  description: string;
  goal: string;
  color: string;
  icon: string;
  steps: AgentStep[];
  files: string[];
  components: string[];
  screens: string[];
  dependsOn: AgentId[];
  parentId: AgentId | null;
  childIds: AgentId[];
  producesPreview?: boolean;
  /** When set, this agent owns a product screen */
  screenSpec?: ScreenSpec;
};

/** Per-agent agentOS VM status (local server or simulated) */
export type AgentVmState = {
  key: string;
  status: 'idle' | 'booting' | 'ready' | 'running' | 'stopped' | 'error';
  mode: 'agentos' | 'simulated';
  sessionId?: string;
  filesWritten: string[];
  lastLog?: string;
  endpoint?: string;
};

export type AgentRuntime = AgentDefinition & {
  status: AgentStatus;
  progress: number;
  currentStepIndex: number;
  currentTask: string;
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
  retryCount: number;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
  estimatedCostUsd: number;
  confidence: number;
  reasoningSummary: string;
  warnings: string[];
  nextHandoff: string;
  position: { x: number; y: number };
  previewPosition: { x: number; y: number };
  vm?: AgentVmState;
};

export type ProjectArtifact = {
  id: string;
  type: 'file' | 'component' | 'screen' | 'token' | 'layout';
  name: string;
  path: string;
  agentId: AgentId;
  createdAt: number;
  usedBy: string[];
  dependsOn: string[];
  version: number;
  lastModifiedBy: AgentId;
  lastModifiedAt: number;
};

export type ArtifactEdge = {
  id: string;
  from: string;
  to: string;
  kind: 'imports' | 'uses' | 'extends' | 'renders';
};

export type ArtifactGraph = {
  nodes: ProjectArtifact[];
  edges: ArtifactEdge[];
};

export type TraceEventType =
  | 'pipeline.start'
  | 'pipeline.complete'
  | 'pipeline.reset'
  | 'plan.ready'
  | 'agent.queued'
  | 'agent.waiting'
  | 'agent.blocked'
  | 'agent.started'
  | 'agent.step'
  | 'agent.reasoning'
  | 'agent.decision'
  | 'agent.retry'
  | 'agent.complete'
  | 'agent.error'
  | 'artifact.created'
  | 'artifact.updated'
  | 'memory.added'
  | 'memory.searched'
  | 'handoff'
  | 'export'
  | 'preview.ready';

export type TraceEvent = {
  id: string;
  ts: number;
  type: TraceEventType;
  agentId?: AgentId;
  title: string;
  detail?: string;
  meta?: Record<string, string | number | boolean | null>;
};

export type DecisionRecord = {
  id: string;
  agentId: AgentId;
  ts: number;
  title: string;
  decision: string;
  reason: string;
  alternatives: string[];
  confidence: number;
  category: string;
};

export type PipelinePhase =
  | 'idle'
  | 'planning'
  | 'running'
  | 'complete'
  | 'exporting';

export type WorkspaceView =
  | 'canvas'
  | 'timeline'
  | 'artifacts'
  | 'dag'
  | 'decisions'
  | 'memory'
  | 'metrics';

export type WorkspaceState = {
  projectName: string;
  /** User product brief */
  userPrompt: string;
  appPlan: AppPlan | null;
  phase: PipelinePhase;
  agents: Record<AgentId, AgentRuntime>;
  agentOrder: AgentId[];
  selectedAgentId: AgentId | null;
  artifacts: ProjectArtifact[];
  artifactGraph: ArtifactGraph;
  events: TraceEvent[];
  decisions: DecisionRecord[];
  canvasOffset: { x: number; y: number };
  canvasScale: number;
  darkModePreview: boolean;
  view: WorkspaceView;
  useMockAi: boolean;
  runStartedAt: number | null;
  runEndedAt: number | null;
  replayActive: boolean;
  replayCursorMs: number;
  replayPlaying: boolean;
  previewReady: boolean;
  exportSucceeded: boolean;
};

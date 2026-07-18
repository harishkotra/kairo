export type AgentId =
  | 'architecture'
  | 'designSystem'
  | 'home'
  | 'profile'
  | 'settings';

export type AgentStatus =
  | 'idle'
  | 'queued'
  | 'running'
  | 'complete'
  | 'error';

export type AgentStep = {
  id: string;
  label: string;
  durationMs: number;
};

export type AgentDefinition = {
  id: AgentId;
  name: string;
  role: string;
  description: string;
  color: string;
  icon: string;
  steps: AgentStep[];
  files: string[];
  components: string[];
  producesPreview?: boolean;
  screenKey?: 'home' | 'profile' | 'settings';
};

export type AgentRuntime = AgentDefinition & {
  status: AgentStatus;
  progress: number;
  currentStepIndex: number;
  currentTask: string;
  startedAt?: number;
  completedAt?: number;
  position: { x: number; y: number };
  previewPosition: { x: number; y: number };
};

export type ProjectArtifact = {
  type: 'file' | 'component' | 'screen' | 'asset';
  name: string;
  path: string;
  agentId: AgentId;
};

export type PipelinePhase =
  | 'idle'
  | 'running'
  | 'complete'
  | 'exporting';

export type WorkspaceState = {
  projectName: string;
  phase: PipelinePhase;
  agents: Record<AgentId, AgentRuntime>;
  selectedAgentId: AgentId | null;
  artifacts: ProjectArtifact[];
  canvasOffset: { x: number; y: number };
  canvasScale: number;
  darkModePreview: boolean;
};

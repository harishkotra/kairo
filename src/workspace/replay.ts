import type {
  AgentId,
  AgentRuntime,
  AgentStatus,
  DecisionRecord,
  ProjectArtifact,
  TraceEvent,
} from '../agents/types';
import {
  emptyArtifactGraph,
  mergeAgentArtifacts,
} from '../artifacts/graph';

export type DerivedRunState = {
  agents: Record<AgentId, AgentRuntime>;
  artifacts: ProjectArtifact[];
  events: TraceEvent[];
  decisions: DecisionRecord[];
  artifactIds: Set<string>;
};

/**
 * Reconstruct agent + artifact state as of `cursorMs` after run start.
 */
export function deriveStateAt(args: {
  runStartedAt: number;
  cursorMs: number;
  events: TraceEvent[];
  decisions: DecisionRecord[];
  baseAgents: Record<AgentId, AgentRuntime>;
  plan: import('../agents/types').AppPlan | null;
}): DerivedRunState {
  const { runStartedAt, cursorMs, events, decisions, baseAgents, plan } = args;
  const cutoff = runStartedAt + Math.max(0, cursorMs);

  const agents = {} as Record<AgentId, AgentRuntime>;
  for (const id of Object.keys(baseAgents)) {
    const base = baseAgents[id];
    agents[id] = {
      ...base,
      status: 'idle',
      progress: 0,
      currentStepIndex: -1,
      currentTask: 'Waiting',
      startedAt: undefined,
      completedAt: undefined,
      durationMs: undefined,
      retryCount: 0,
      tokenUsage: { prompt: 0, completion: 0, total: 0 },
      estimatedCostUsd: 0,
      confidence: 0,
      reasoningSummary: '',
      warnings: [],
      position: { ...base.position },
      previewPosition: { ...base.previewPosition },
    };
  }

  const visibleEvents = events.filter((e) => e.ts <= cutoff);
  let graph = emptyArtifactGraph();

  for (const ev of visibleEvents) {
    applyEvent(agents, ev);
  }

  const completedAgents = new Set(
    visibleEvents
      .filter((e) => e.type === 'agent.complete' && e.agentId)
      .map((e) => e.agentId as AgentId)
  );
  for (const id of Object.keys(agents)) {
    if (completedAgents.has(id)) {
      const { graph: next } = mergeAgentArtifacts(graph, id, cutoff, plan);
      graph = next;
    }
  }

  return {
    agents,
    artifacts: graph.nodes,
    events: visibleEvents,
    decisions: decisions.filter((d) => d.ts <= cutoff),
    artifactIds: new Set(graph.nodes.map((n) => n.id)),
  };
}

function applyEvent(
  agents: Record<AgentId, AgentRuntime>,
  ev: TraceEvent
) {
  const id = ev.agentId;
  if (!id || !agents[id]) return;

  switch (ev.type) {
    case 'agent.queued':
      patch(agents, id, {
        status: 'queued',
        currentTask: 'Queued',
        progress: 0,
      });
      break;
    case 'agent.waiting':
      patch(agents, id, { status: 'waiting', currentTask: ev.title });
      break;
    case 'agent.blocked':
      patch(agents, id, {
        status: 'blocked',
        currentTask: ev.detail ?? 'Blocked',
      });
      break;
    case 'agent.started':
      patch(agents, id, {
        status: 'running',
        startedAt: ev.ts,
        progress: 0,
        currentStepIndex: 0,
        currentTask: ev.detail ?? 'Started',
        completedAt: undefined,
      });
      break;
    case 'agent.step':
      patch(agents, id, {
        status: 'running',
        currentTask: ev.title,
        progress: Math.min(
          99,
          typeof ev.meta?.progress === 'number'
            ? Number(ev.meta.progress)
            : agents[id].progress + 8
        ),
      });
      break;
    case 'agent.retry':
      patch(agents, id, {
        status: 'retrying',
        retryCount: agents[id].retryCount + 1,
        currentTask: ev.title,
      });
      break;
    case 'agent.reasoning':
      patch(agents, id, {
        reasoningSummary: ev.detail ?? agents[id].reasoningSummary,
        confidence:
          typeof ev.meta?.confidence === 'number'
            ? Number(ev.meta.confidence)
            : agents[id].confidence,
      });
      break;
    case 'agent.complete':
      patch(agents, id, {
        status: 'complete',
        progress: 100,
        currentTask: 'Done',
        completedAt: ev.ts,
        durationMs:
          typeof ev.meta?.durationMs === 'number'
            ? Number(ev.meta.durationMs)
            : agents[id].startedAt
              ? ev.ts - agents[id].startedAt!
              : undefined,
      });
      break;
    case 'agent.error':
      patch(agents, id, {
        status: 'error',
        currentTask: ev.detail ?? 'Failed',
      });
      break;
    default:
      break;
  }
}

function patch(
  agents: Record<AgentId, AgentRuntime>,
  id: AgentId,
  p: Partial<AgentRuntime>
) {
  agents[id] = { ...agents[id], ...p };
}

export function dagStatusColor(status: AgentStatus): string {
  switch (status) {
    case 'running':
      return '#34D399';
    case 'waiting':
    case 'queued':
      return '#60A5FA';
    case 'blocked':
      return '#FBBF24';
    case 'error':
      return '#F87171';
    case 'retrying':
      return '#C084FC';
    case 'complete':
      return '#7BC4A0';
    default:
      return '#3D4A5C';
  }
}

export function dagStatusLabel(status: AgentStatus): string {
  switch (status) {
    case 'queued':
      return 'waiting';
    case 'error':
      return 'failed';
    default:
      return status;
  }
}

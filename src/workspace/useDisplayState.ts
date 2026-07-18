import { useMemo } from 'react';
import type {
  AgentId,
  AgentRuntime,
  DecisionRecord,
  ProjectArtifact,
  TraceEvent,
} from '../agents/types';
import { deriveStateAt } from './replay';
import { useWorkspace } from './WorkspaceContext';

export function useDisplayState(): {
  agents: Record<AgentId, AgentRuntime>;
  artifacts: ProjectArtifact[];
  events: TraceEvent[];
  decisions: DecisionRecord[];
  isReplayView: boolean;
  artifactGraphNodes: ProjectArtifact[];
} {
  const ctx = useWorkspace();

  return useMemo(() => {
    const canReplay =
      ctx.replayActive &&
      ctx.runStartedAt != null &&
      ctx.events.length > 0 &&
      (ctx.phase === 'complete' ||
        ctx.phase === 'exporting' ||
        ctx.phase === 'idle');

    if (!canReplay || ctx.runStartedAt == null) {
      return {
        agents: ctx.agents,
        artifacts: ctx.artifacts,
        events: ctx.events,
        decisions: ctx.decisions,
        isReplayView: false,
        artifactGraphNodes: ctx.artifactGraph.nodes,
      };
    }

    const derived = deriveStateAt({
      runStartedAt: ctx.runStartedAt,
      cursorMs: ctx.replayCursorMs,
      events: ctx.events,
      decisions: ctx.decisions,
      baseAgents: ctx.agents,
      plan: ctx.appPlan,
    });

    return {
      agents: derived.agents,
      artifacts: derived.artifacts,
      events: derived.events,
      decisions: derived.decisions,
      isReplayView: true,
      artifactGraphNodes: derived.artifacts,
    };
  }, [
    ctx.replayActive,
    ctx.runStartedAt,
    ctx.replayCursorMs,
    ctx.events,
    ctx.decisions,
    ctx.agents,
    ctx.artifacts,
    ctx.artifactGraph.nodes,
    ctx.phase,
    ctx.appPlan,
  ]);
}

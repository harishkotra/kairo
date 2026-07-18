import type {
  AgentId,
  AgentRuntime,
  DecisionRecord,
  ProjectArtifact,
  TraceEvent,
} from '../agents/types';

export type RunMetrics = {
  agentsSpawned: number;
  agentsComplete: number;
  filesCreated: number;
  componentsCreated: number;
  componentsReused: number;
  mostReusedComponent: { name: string; count: number } | null;
  averageParallelism: number;
  averageWaitMs: number;
  totalRetries: number;
  reasoningTimeMs: number;
  tokenUsage: { prompt: number; completion: number; total: number };
  costUsd: number;
  longestCriticalPathMs: number;
  criticalPath: AgentId[];
  averageConfidence: number;
  designConsistency: number;
  accessibilityScore: number;
  exportSuccess: boolean;
  decisionsCount: number;
  eventsCount: number;
  runDurationMs: number;
  memoriesCount: number;
};

function reuseCount(node: ProjectArtifact, nodes: ProjectArtifact[]): number {
  return nodes.filter((n) => n.dependsOn.includes(node.id)).length;
}

export function computeRunMetrics(args: {
  agents: Record<AgentId, AgentRuntime>;
  agentOrder: AgentId[];
  artifacts: ProjectArtifact[];
  events: TraceEvent[];
  decisions: DecisionRecord[];
  runStartedAt: number | null;
  runEndedAt: number | null;
  exportSucceeded: boolean;
  memoriesCount: number;
}): RunMetrics {
  const {
    agents,
    agentOrder,
    artifacts,
    events,
    decisions,
    runStartedAt,
    runEndedAt,
    exportSucceeded,
    memoriesCount,
  } = args;

  const order = agentOrder.length ? agentOrder : Object.keys(agents);

  const agentsSpawned = order.filter(
    (id) =>
      agents[id] &&
      (agents[id].status !== 'idle' ||
        events.some((e) => e.agentId === id && e.type === 'agent.started'))
  ).length;

  const agentsComplete = order.filter(
    (id) => agents[id]?.status === 'complete'
  ).length;

  const filesCreated = artifacts.filter(
    (a) =>
      a.type === 'file' ||
      a.type === 'layout' ||
      a.type === 'screen' ||
      a.type === 'token'
  ).length;

  const components = artifacts.filter((a) => a.type === 'component');
  const componentsCreated = components.length;

  let componentsReused = 0;
  let mostReused: { name: string; count: number } | null = null;
  for (const c of components) {
    const n = reuseCount(c, artifacts);
    if (n > 0) componentsReused += 1;
    if (!mostReused || n > mostReused.count) {
      mostReused = { name: c.name, count: n };
    }
  }

  const averageParallelism = estimateAverageParallelism(events, runStartedAt);

  const waitSamples: number[] = [];
  for (const id of order) {
    const blocked = events.find(
      (e) => e.agentId === id && e.type === 'agent.blocked'
    );
    const waiting = events.find(
      (e) => e.agentId === id && e.type === 'agent.waiting'
    );
    const started = events.find(
      (e) => e.agentId === id && e.type === 'agent.started'
    );
    const waitStart = blocked?.ts ?? waiting?.ts;
    if (waitStart && started) {
      waitSamples.push(Math.max(0, started.ts - waitStart));
    }
  }
  const averageWaitMs =
    waitSamples.length === 0
      ? 0
      : waitSamples.reduce((a, b) => a + b, 0) / waitSamples.length;

  const totalRetries = order.reduce(
    (s, id) => s + (agents[id]?.retryCount ?? 0),
    0
  );

  let reasoningTimeMs = 0;
  for (const id of order) {
    if (agents[id]?.durationMs) {
      reasoningTimeMs += Math.round(agents[id].durationMs! * 0.12);
    }
  }

  let prompt = 0;
  let completion = 0;
  let total = 0;
  let costUsd = 0;
  let confSum = 0;
  let confN = 0;
  for (const id of order) {
    const a = agents[id];
    if (!a) continue;
    prompt += a.tokenUsage.prompt;
    completion += a.tokenUsage.completion;
    total += a.tokenUsage.total;
    costUsd += a.estimatedCostUsd;
    if (a.confidence > 0) {
      confSum += a.confidence;
      confN += 1;
    }
  }

  const { pathMs, path } = criticalPath(agents, order);
  const averageConfidence = confN ? confSum / confN : 0;

  const reusedRatio =
    componentsCreated === 0 ? 1 : componentsReused / componentsCreated;
  const warnCount = order.reduce(
    (s, id) => s + (agents[id]?.warnings.length ?? 0),
    0
  );
  const designConsistency = Math.max(
    0,
    Math.min(1, reusedRatio * 0.7 + 0.3 - warnCount * 0.03)
  );

  const a11ySteps = events.filter(
    (e) =>
      e.type === 'agent.step' &&
      /a11y|contrast|accessib/i.test(e.title)
  ).length;
  const accessibilityScore = Math.max(
    0.55,
    Math.min(0.98, 0.72 + a11ySteps * 0.08 - warnCount * 0.02)
  );

  const runDurationMs =
    runStartedAt != null ? (runEndedAt ?? Date.now()) - runStartedAt : 0;

  return {
    agentsSpawned: Math.max(agentsSpawned, agentsComplete),
    agentsComplete,
    filesCreated,
    componentsCreated,
    componentsReused,
    mostReusedComponent: mostReused?.count ? mostReused : null,
    averageParallelism,
    averageWaitMs,
    totalRetries,
    reasoningTimeMs,
    tokenUsage: { prompt, completion, total },
    costUsd,
    longestCriticalPathMs: pathMs,
    criticalPath: path,
    averageConfidence,
    designConsistency,
    accessibilityScore,
    exportSuccess: exportSucceeded,
    decisionsCount: decisions.length,
    eventsCount: events.length,
    runDurationMs,
    memoriesCount,
  };
}

function estimateAverageParallelism(
  events: TraceEvent[],
  runStartedAt: number | null
): number {
  if (!runStartedAt || events.length === 0) return 0;
  const starts = events.filter((e) => e.type === 'agent.started');
  const ends = events.filter((e) => e.type === 'agent.complete');
  if (starts.length === 0) return 0;

  const points: Array<{ t: number; d: number }> = [];
  for (const s of starts) points.push({ t: s.ts, d: 1 });
  for (const e of ends) points.push({ t: e.ts, d: -1 });
  points.sort((a, b) => a.t - b.t);

  let cur = 0;
  let max = 0;
  let area = 0;
  let lastT = points[0]?.t ?? runStartedAt;
  for (const p of points) {
    area += cur * Math.max(0, p.t - lastT);
    cur += p.d;
    max = Math.max(max, cur);
    lastT = p.t;
  }
  const span = Math.max(1, lastT - (points[0]?.t ?? runStartedAt));
  const avg = area / span;
  return Math.round(Math.max(avg, max > 1 ? avg : 1) * 100) / 100;
}

function criticalPath(
  agents: Record<AgentId, AgentRuntime>,
  order: AgentId[]
): { pathMs: number; path: AgentId[] } {
  const memo = new Map<AgentId, { ms: number; path: AgentId[] }>();

  function dfs(id: AgentId): { ms: number; path: AgentId[] } {
    const hit = memo.get(id);
    if (hit) return hit;
    const a = agents[id];
    if (!a) {
      const r = { ms: 0, path: [id] };
      memo.set(id, r);
      return r;
    }
    const self = a.durationMs ?? 0;
    if (!a.dependsOn.length) {
      const r = { ms: self, path: [id] };
      memo.set(id, r);
      return r;
    }
    let best = { ms: 0, path: [] as AgentId[] };
    for (const d of a.dependsOn) {
      const up = dfs(d);
      if (up.ms >= best.ms) best = up;
    }
    const r = { ms: best.ms + self, path: [...best.path, id] };
    memo.set(id, r);
    return r;
  }

  let best = { ms: 0, path: [] as AgentId[] };
  for (const id of order) {
    const r = dfs(id);
    if (r.ms >= best.ms) best = r;
  }
  return { pathMs: best.ms, path: best.path };
}

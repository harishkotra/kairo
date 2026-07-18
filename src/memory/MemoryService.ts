import type { AgentId, DecisionRecord } from '../agents/types';
import { agentName } from '../agents/definitions';
import {
  canUseMem0,
  mem0AddMemory,
  mem0SearchMemories,
  mem0UserId,
} from './mem0Client';
import type { MemoryEntry, MemoryKind, MemorySearchHit } from './types';

let seq = 0;
function mid() {
  seq += 1;
  return `mem-${Date.now()}-${seq}`;
}

/** Seed knowledge every run starts with (shared context) */
export const SEED_SHARED: Array<Omit<MemoryEntry, 'id' | 'ts' | 'source'>> = [
  {
    scope: 'shared',
    kind: 'context',
    title: 'Project brief',
    content:
      'Aurora Mobile: Expo Router tab app with Home, Profile, Settings on a dual-theme design system.',
    sharedWith: [
      'architecture',
      'designSystem',
      'home',
      'profile',
      'settings',
    ],
    metadata: { seed: true },
  },
  {
    scope: 'shared',
    kind: 'knowledge',
    title: 'Constraint: token-only colors',
    content:
      'Screens must not hard-code hex values. All color/type/spacing comes from src/theme/tokens.ts.',
    sharedWith: ['designSystem', 'home', 'profile', 'settings'],
    metadata: { seed: true },
  },
];

const SEED_AGENT: Partial<
  Record<AgentId, Array<Omit<MemoryEntry, 'id' | 'ts' | 'source' | 'scope' | 'agentId'>>>
> = {
  architecture: [
    {
      kind: 'knowledge',
      title: 'Why navigation exists',
      content:
        'Three equal-weight destinations need a bottom-tab shell so users switch without stacking deep navigation debt.',
      sharedWith: ['designSystem', 'home', 'profile', 'settings'],
    },
  ],
  designSystem: [
    {
      kind: 'knowledge',
      title: 'Why Card exists',
      content:
        'Card is the shared surface for feed items and profile sections so elevation and radius stay consistent.',
      sharedWith: ['home', 'profile'],
    },
  ],
  home: [
    {
      kind: 'knowledge',
      title: 'Why Card on Home',
      content:
        'Home activity rows use Card so Profile can reuse the same density without inventing a second surface.',
      sharedWith: ['profile', 'designSystem'],
    },
  ],
  profile: [
    {
      kind: 'knowledge',
      title: 'Why Button may change',
      content:
        'Profile secondary actions defer to Button primitive; any variant change must flow from Design System, not a one-off style.',
      sharedWith: ['designSystem', 'settings'],
    },
  ],
  settings: [
    {
      kind: 'knowledge',
      title: 'Why theme toggle lives here',
      content:
        'Appearance control binds ThemeProvider so Design System tokens apply app-wide without per-screen forks.',
      sharedWith: ['designSystem', 'home'],
    },
  ],
};

export class MemoryService {
  private entries: MemoryEntry[] = [];
  private useLiveMem0: boolean;

  constructor(useLiveMem0?: boolean) {
    this.useLiveMem0 = useLiveMem0 ?? canUseMem0();
  }

  getAll(): MemoryEntry[] {
    return [...this.entries].sort((a, b) => b.ts - a.ts);
  }

  clear() {
    this.entries = [];
  }

  setLive(enabled: boolean) {
    this.useLiveMem0 = enabled && canUseMem0();
  }

  isLive() {
    return this.useLiveMem0;
  }

  async seedRun(projectName: string): Promise<MemoryEntry[]> {
    const created: MemoryEntry[] = [];
    const brief: Omit<MemoryEntry, 'id' | 'ts' | 'source'> = {
      scope: 'shared',
      kind: 'context',
      title: 'Run context',
      content: `Building ${projectName} with multi-agent Expo pipeline. Shared memory tracks why each surface exists.`,
      sharedWith: [
        'architecture',
        'designSystem',
        'home',
        'profile',
        'settings',
      ],
    };
    created.push(await this.add(brief));

    for (const s of SEED_SHARED) {
      created.push(await this.add({ ...s }));
    }

    for (const [agentId, list] of Object.entries(SEED_AGENT) as Array<
      [AgentId, NonNullable<(typeof SEED_AGENT)[AgentId]>]
    >) {
      for (const m of list ?? []) {
        created.push(
          await this.add({
            ...m,
            scope: 'agent',
            agentId,
          })
        );
      }
    }

    return created;
  }

  async add(
    partial: Omit<MemoryEntry, 'id' | 'ts' | 'source' | 'remoteId'> & {
      ts?: number;
    }
  ): Promise<MemoryEntry> {
    const entry: MemoryEntry = {
      ...partial,
      id: mid(),
      ts: partial.ts ?? Date.now(),
      source: this.useLiveMem0 ? 'mem0' : 'mock',
      sharedWith: partial.sharedWith ?? [],
    };

    if (this.useLiveMem0) {
      const userId = mem0UserId(
        entry.scope === 'shared' ? 'shared' : (entry.agentId as AgentId)
      );
      const result = await mem0AddMemory({
        userId,
        content: `[${entry.title}] ${entry.content}`,
        metadata: {
          kind: entry.kind,
          title: entry.title,
          agentId: entry.agentId ?? 'shared',
          scope: entry.scope,
          ...(entry.metadata ?? {}),
        },
      });
      if (result.ok && result.id) {
        entry.remoteId = result.id;
      } else if (!result.ok) {
        // stay local; mark as mock fallback
        entry.source = 'mock';
        entry.metadata = {
          ...(entry.metadata ?? {}),
          mem0Error: result.error ?? 'unknown',
        };
      }
    }

    this.entries.push(entry);
    return entry;
  }

  async rememberDecision(d: DecisionRecord): Promise<MemoryEntry> {
    return this.add({
      scope: 'agent',
      agentId: d.agentId,
      kind: 'decision',
      title: d.decision,
      content: `${agentName(d.agentId)} decided "${d.decision}" because ${d.reason}. Alternatives: ${d.alternatives.join(', ') || 'none'}. Confidence ${(d.confidence * 100).toFixed(0)}%.`,
      sharedWith: [],
      metadata: {
        decisionId: d.id,
        category: d.category,
        confidence: d.confidence,
      },
    });
  }

  async rememberHandoff(
    from: AgentId,
    to: AgentId[],
    note: string
  ): Promise<MemoryEntry> {
    return this.add({
      scope: 'shared',
      agentId: from,
      kind: 'handoff',
      title: `Handoff ${agentName(from)} → ${to.map((id) => agentName(id)).join(', ')}`,
      content: note,
      sharedWith: to,
    });
  }

  async rememberArtifact(
    agentId: AgentId,
    name: string,
    path: string,
    why: string
  ): Promise<MemoryEntry> {
    return this.add({
      scope: 'agent',
      agentId,
      kind: 'artifact',
      title: name,
      content: `${agentName(agentId)} produced ${name} (${path}). ${why}`,
      sharedWith: [],
      metadata: { path },
    });
  }

  async rememberReasoning(
    agentId: AgentId,
    summary: string
  ): Promise<MemoryEntry> {
    return this.add({
      scope: 'agent',
      agentId,
      kind: 'knowledge',
      title: `${agentName(agentId)} reasoning`,
      content: summary,
      sharedWith: [],
    });
  }

  /**
   * Search local store (+ optional mem0 remote for agent user id).
   */
  async search(
    query: string,
    opts?: { agentId?: AgentId; includeShared?: boolean; limit?: number }
  ): Promise<MemorySearchHit[]> {
    const q = query.toLowerCase().trim();
    const limit = opts?.limit ?? 12;
    const includeShared = opts?.includeShared !== false;

    const local = this.entries
      .filter((e) => {
        if (opts?.agentId) {
          const isOwn = e.agentId === opts.agentId;
          const isShared =
            includeShared &&
            (e.scope === 'shared' ||
              e.sharedWith.includes(opts.agentId));
          if (!isOwn && !isShared) return false;
        }
        if (!q) return true;
        return (
          e.content.toLowerCase().includes(q) ||
          e.title.toLowerCase().includes(q) ||
          e.kind.includes(q)
        );
      })
      .map((e) => ({
        ...e,
        score: scoreLocal(e, q),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    if (this.useLiveMem0 && opts?.agentId && q) {
      const remote = await mem0SearchMemories({
        userId: mem0UserId(opts.agentId),
        query,
        limit: 5,
      });
      for (const h of remote.hits) {
        if (!h.memory) continue;
        const exists = local.some(
          (l) => l.remoteId === h.id || l.content === h.memory
        );
        if (exists) continue;
        local.push({
          id: `remote-${h.id}`,
          remoteId: h.id,
          scope: 'agent',
          agentId: opts.agentId,
          kind: 'knowledge',
          title: 'mem0 recall',
          content: h.memory,
          ts: Date.now(),
          sharedWith: [],
          source: 'mem0',
          score: h.score ?? 0.5,
        });
      }
      local.sort((a, b) => b.score - a.score);
    }

    return local.slice(0, limit);
  }

  sharedContext(): MemoryEntry[] {
    return this.entries
      .filter((e) => e.scope === 'shared' || e.kind === 'context')
      .sort((a, b) => b.ts - a.ts);
  }

  agentMemories(agentId: AgentId): MemoryEntry[] {
    return this.entries
      .filter((e) => e.agentId === agentId)
      .sort((a, b) => b.ts - a.ts);
  }

  knowledgeShared(): MemoryEntry[] {
    return this.entries
      .filter((e) => e.sharedWith.length > 0 || e.scope === 'shared')
      .sort((a, b) => b.ts - a.ts);
  }
}

function scoreLocal(e: MemoryEntry, q: string): number {
  if (!q) return 0.5;
  let s = 0;
  if (e.title.toLowerCase().includes(q)) s += 0.5;
  if (e.content.toLowerCase().includes(q)) s += 0.4;
  if (e.kind === 'decision') s += 0.05;
  if (e.kind === 'context') s += 0.05;
  return Math.min(1, s);
}

export function kindLabel(k: MemoryKind): string {
  switch (k) {
    case 'context':
      return 'CTX';
    case 'decision':
      return 'DEC';
    case 'artifact':
      return 'ART';
    case 'handoff':
      return 'HND';
    case 'knowledge':
      return 'KNW';
  }
}

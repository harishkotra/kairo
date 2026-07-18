import type { AgentId } from '../agents/types';

export type MemoryScope = 'shared' | 'agent';

export type MemoryKind =
  | 'context'
  | 'decision'
  | 'artifact'
  | 'handoff'
  | 'knowledge';

export type MemoryEntry = {
  id: string;
  /** mem0 remote id when synced */
  remoteId?: string;
  scope: MemoryScope;
  agentId?: AgentId;
  kind: MemoryKind;
  content: string;
  /** Short label for UI */
  title: string;
  ts: number;
  /** Other agents that should see this when searching shared */
  sharedWith: AgentId[];
  metadata?: Record<string, string | number | boolean>;
  source: 'mock' | 'mem0';
};

export type MemorySearchHit = MemoryEntry & {
  score: number;
};

import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { agentName } from '../agents/definitions';
import type { AgentId } from '../agents/types';
import { kindLabel } from '../memory/MemoryService';
import type { MemoryEntry } from '../memory/types';
import { workspace, spacing, typography } from '../theme/tokens';
import { formatClock } from './format';
import { useWorkspace } from './WorkspaceContext';

type Tab = 'shared' | 'agents' | 'decisions' | 'knowledge';

/**
 * Phase 9 — Shared Agent Memory visualization (mem0-backed when configured).
 */
export function MemoryView() {
  const {
    memories,
    memoryBackend,
    selectAgent,
    setView,
    agents,
    agentOrder,
  } = useWorkspace();
  const [tab, setTab] = useState<Tab>('shared');
  const [agentFilter, setAgentFilter] = useState<AgentId | 'all'>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    let list = [...memories];
    if (tab === 'shared') {
      list = list.filter(
        (m) => m.scope === 'shared' || m.kind === 'context' || m.kind === 'handoff'
      );
    } else if (tab === 'agents') {
      list = list.filter((m) => m.scope === 'agent');
      if (agentFilter !== 'all') {
        list = list.filter((m) => m.agentId === agentFilter);
      }
    } else if (tab === 'decisions') {
      list = list.filter((m) => m.kind === 'decision');
    } else if (tab === 'knowledge') {
      list = list.filter(
        (m) => m.kind === 'knowledge' || m.sharedWith.length > 0
      );
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.content.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => b.ts - a.ts);
  }, [memories, tab, agentFilter, query]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>MEMORY</Text>
          <Text style={styles.heading}>Shared agent memory</Text>
          <Text style={styles.sub}>
            {memories.length} entries · backend {memoryBackend}
            {memoryBackend === 'mem0' ? ' (live)' : ' (local mock)'}
          </Text>
        </View>
        <View style={styles.flow}>
          <Text style={styles.flowText}>Shared Context</Text>
          <Text style={styles.flowArrow}>↓</Text>
          <Text style={styles.flowText}>Agent Memories</Text>
          <Text style={styles.flowArrow}>↓</Text>
          <Text style={styles.flowText}>Recent Decisions</Text>
          <Text style={styles.flowArrow}>↓</Text>
          <Text style={styles.flowText}>Knowledge Shared</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        {(
          [
            ['shared', 'Shared'],
            ['agents', 'Agents'],
            ['decisions', 'Decisions'],
            ['knowledge', 'Knowledge'],
          ] as const
        ).map(([id, label]) => (
          <Pressable
            key={id}
            onPress={() => setTab(id)}
            style={[styles.tab, tab === id && styles.tabOn]}
          >
            <Text style={[styles.tabLabel, tab === id && styles.tabLabelOn]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search memories…"
        placeholderTextColor={workspace.textDim}
        style={styles.search}
      />

      {tab === 'agents' ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <Chip
            label="All"
            active={agentFilter === 'all'}
            onPress={() => setAgentFilter('all')}
          />
          {agentOrder.map((id) =>
            agents[id] ? (
              <Chip
                key={id}
                label={agents[id].name}
                color={agents[id].color}
                active={agentFilter === id}
                onPress={() => setAgentFilter(id)}
              />
            ) : null
          )}
        </ScrollView>
      ) : null}

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No memories yet</Text>
          <Text style={styles.emptyBody}>
            Start a build. Agents seed shared context and write decisions,
            artifacts, and handoffs into memory
            {memoryBackend === 'mem0' ? ' via mem0' : ''}.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {filtered.map((m) => (
            <MemoryCard
              key={m.id}
              entry={m}
              agentColor={
                m.agentId ? agents[m.agentId]?.color : workspace.accent
              }
              onPress={() => {
                if (m.agentId) {
                  selectAgent(m.agentId);
                }
                if (m.kind === 'decision') setView('decisions');
              }}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function MemoryCard({
  entry,
  agentColor,
  onPress,
}: {
  entry: MemoryEntry;
  agentColor: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { borderLeftColor: agentColor }]}
    >
      <View style={styles.cardTop}>
        <Text style={[styles.kind, { color: agentColor }]}>
          {kindLabel(entry.kind)}
        </Text>
        <Text style={styles.src}>{entry.source}</Text>
        <Text style={styles.time}>{formatClock(entry.ts)}</Text>
      </View>
      <Text style={styles.title}>{entry.title}</Text>
      <Text style={styles.body} numberOfLines={4}>
        {entry.content}
      </Text>
      <View style={styles.metaRow}>
        {entry.agentId ? (
          <Text style={styles.meta}>
            {agentName(entry.agentId)}
          </Text>
        ) : (
          <Text style={styles.meta}>shared</Text>
        )}
        {entry.sharedWith.length > 0 ? (
          <Text style={styles.meta}>
            → {entry.sharedWith.map((id) => agentName(id)).join(', ')}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function Chip({
  label,
  active,
  onPress,
  color,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active && {
          borderColor: color ?? workspace.accent,
          backgroundColor: (color ?? workspace.accent) + '22',
        },
      ]}
    >
      <Text
        style={[
          styles.chipLabel,
          active && { color: color ?? workspace.accent },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: workspace.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: workspace.border,
    gap: spacing[4],
  },
  eyebrow: {
    color: workspace.accent,
    fontSize: 10,
    fontFamily: workspace.mono,
    letterSpacing: 1.4,
    fontWeight: typography.weight.bold,
  },
  heading: {
    color: workspace.text,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.semibold,
    marginTop: 2,
  },
  sub: {
    color: workspace.textDim,
    fontSize: 11,
    fontFamily: workspace.mono,
    marginTop: 4,
  },
  flow: {
    alignItems: 'flex-end',
  },
  flowText: {
    color: workspace.textMuted,
    fontSize: 10,
    fontFamily: workspace.mono,
  },
  flowArrow: {
    color: workspace.textDim,
    fontSize: 10,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: workspace.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabOn: {
    borderBottomWidth: 2,
    borderBottomColor: workspace.accent,
  },
  tabLabel: {
    color: workspace.textDim,
    fontSize: 12,
    fontWeight: typography.weight.medium,
  },
  tabLabelOn: {
    color: workspace.accent,
  },
  search: {
    margin: spacing[3],
    borderWidth: 1,
    borderColor: workspace.border,
    backgroundColor: workspace.panelElevated,
    color: workspace.text,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  chips: {
    paddingHorizontal: spacing[3],
    paddingBottom: spacing[2],
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: workspace.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 8,
    backgroundColor: workspace.panelElevated,
  },
  chipLabel: {
    color: workspace.textMuted,
    fontSize: 11,
  },
  list: {
    padding: spacing[3],
    paddingBottom: spacing[10],
    gap: 8,
  },
  card: {
    borderWidth: 1,
    borderColor: workspace.border,
    borderLeftWidth: 3,
    backgroundColor: workspace.panelElevated,
    padding: spacing[3],
    marginBottom: 8,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  kind: {
    fontSize: 10,
    fontFamily: workspace.mono,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.8,
  },
  src: {
    color: workspace.textDim,
    fontSize: 10,
    fontFamily: workspace.mono,
    flex: 1,
  },
  time: {
    color: workspace.textDim,
    fontSize: 10,
    fontFamily: workspace.mono,
  },
  title: {
    color: workspace.text,
    fontSize: 14,
    fontWeight: typography.weight.semibold,
    marginBottom: 4,
  },
  body: {
    color: workspace.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  meta: {
    color: workspace.textDim,
    fontSize: 10,
    fontFamily: workspace.mono,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[8],
  },
  emptyTitle: {
    color: workspace.text,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    marginBottom: 8,
  },
  emptyBody: {
    color: workspace.textMuted,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 380,
    lineHeight: 20,
  },
});

import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { agentName } from '../agents/definitions';
import { computeRunMetrics } from '../metrics/compute';
import { workspace, spacing, typography } from '../theme/tokens';
import {
  formatDuration,
  formatTokens,
  formatUsd,
} from './format';
import { useDisplayState } from './useDisplayState';
import { useWorkspace } from './WorkspaceContext';


/**
 * Phase 10 — engineering-centric metrics (not infra).
 */
export function MetricsDashboard() {
  const {
    runStartedAt,
    runEndedAt,
    exportSucceeded,
    memories,
    phase,
    agentOrder,
  } = useWorkspace();
  const { agents, artifacts, events, decisions, isReplayView } =
    useDisplayState();

  const m = useMemo(() => {
    const lastEv = events[events.length - 1];
    const ended =
      isReplayView && runStartedAt != null && lastEv
        ? lastEv.ts
        : runEndedAt;
    return computeRunMetrics({
      agents,
      agentOrder,
      artifacts,
      events,
      decisions,
      runStartedAt,
      runEndedAt: ended,
      exportSucceeded,
      memoriesCount: memories.length,
    });
  }, [
    agents,
    agentOrder,
    artifacts,
    events,
    decisions,
    runStartedAt,
    runEndedAt,
    exportSucceeded,
    memories.length,
    isReplayView,
  ]);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>METRICS</Text>
        <Text style={styles.heading}>Run dashboard</Text>
        <Text style={styles.sub}>
          {phase === 'running' || phase === 'planning'
            ? 'Live · updating'
            : 'Snapshot'}
          {isReplayView ? ' · replay cursor' : ''}
        </Text>
      </View>

      <View style={styles.grid}>
        <Metric
          label="Agents spawned"
          value={String(m.agentsSpawned)}
          hint={`${m.agentsComplete} complete`}
        />
        <Metric
          label="Files created"
          value={String(m.filesCreated)}
          hint="layouts · screens · tokens"
        />
        <Metric
          label="Components reused"
          value={`${m.componentsReused}/${m.componentsCreated}`}
          hint={
            m.mostReusedComponent
              ? `Top: ${m.mostReusedComponent.name} ×${m.mostReusedComponent.count}`
              : 'No reuse yet'
          }
        />
        <Metric
          label="Avg parallelism"
          value={m.averageParallelism.toFixed(2)}
          hint="concurrent agents"
        />
        <Metric
          label="Avg wait time"
          value={formatDuration(Math.round(m.averageWaitMs))}
          hint="blocked → start"
        />
        <Metric
          label="Retries"
          value={String(m.totalRetries)}
          hint="across agents"
        />
        <Metric
          label="Reasoning time"
          value={formatDuration(m.reasoningTimeMs)}
          hint="est. inference share"
        />
        <Metric
          label="Token usage"
          value={formatTokens(m.tokenUsage.total)}
          hint={`${formatTokens(m.tokenUsage.prompt)}↑ ${formatTokens(m.tokenUsage.completion)}↓`}
        />
        <Metric
          label="Est. cost"
          value={formatUsd(m.costUsd)}
          hint="model pricing table"
        />
        <Metric
          label="Critical path"
          value={formatDuration(m.longestCriticalPathMs)}
          hint={
            m.criticalPath.length
              ? m.criticalPath
                  .map((id) => agents[id]?.name ?? agentName(id))
                  .join(' → ')
              : '—'
          }
          wide
        />
        <Metric
          label="Avg confidence"
          value={
            m.averageConfidence > 0
              ? `${Math.round(m.averageConfidence * 100)}%`
              : '—'
          }
          hint={`${m.decisionsCount} decisions`}
        />
        <Metric
          label="Design consistency"
          value={`${Math.round(m.designConsistency * 100)}%`}
          hint="reuse + warning penalty"
        />
        <Metric
          label="Accessibility"
          value={`${Math.round(m.accessibilityScore * 100)}%`}
          hint="contrast / a11y steps"
        />
        <Metric
          label="Export success"
          value={m.exportSuccess ? 'Yes' : '—'}
          hint={m.exportSuccess ? 'last export ok' : 'not exported yet'}
        />
        <Metric
          label="Events"
          value={String(m.eventsCount)}
          hint="trace length"
        />
        <Metric
          label="Memories"
          value={String(m.memoriesCount)}
          hint="shared + agent"
        />
        <Metric
          label="Run duration"
          value={formatDuration(m.runDurationMs)}
          hint="wall clock"
        />
      </View>

      <View style={styles.note}>
        <Text style={styles.noteTitle}>Why these metrics</Text>
        <Text style={styles.noteBody}>
          Orchestration quality: parallelism, critical path, component reuse,
          and confidence — product signals, not infrastructure graphs. Values
          update as agents finish and during replay.
        </Text>
      </View>
    </ScrollView>
  );
}

function Metric({
  label,
  value,
  hint,
  wide,
}: {
  label: string;
  value: string;
  hint?: string;
  wide?: boolean;
}) {
  return (
    <View style={[styles.card, wide && styles.cardWide]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={2}>
        {value}
      </Text>
      {hint ? (
        <Text style={styles.hint} numberOfLines={2}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: workspace.bg },
  content: { paddingBottom: spacing[10] },
  header: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: workspace.border,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing[3],
    gap: 10,
  },
  card: {
    width: '48%',
    minWidth: 140,
    flexGrow: 1,
    borderWidth: 1,
    borderColor: workspace.border,
    backgroundColor: workspace.panelElevated,
    padding: spacing[3],
  },
  cardWide: {
    width: '100%',
  },
  label: {
    color: workspace.textDim,
    fontSize: 10,
    fontFamily: workspace.mono,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  value: {
    color: workspace.text,
    fontSize: 22,
    fontWeight: typography.weight.semibold,
    letterSpacing: -0.4,
  },
  hint: {
    color: workspace.textMuted,
    fontSize: 11,
    marginTop: 6,
    lineHeight: 15,
  },
  note: {
    marginHorizontal: spacing[4],
    marginTop: spacing[2],
    padding: spacing[4],
    borderWidth: 1,
    borderColor: workspace.border,
    backgroundColor: workspace.panel,
  },
  noteTitle: {
    color: workspace.accent,
    fontSize: 11,
    fontFamily: workspace.mono,
    fontWeight: typography.weight.bold,
    letterSpacing: 1,
    marginBottom: 8,
  },
  noteBody: {
    color: workspace.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
});

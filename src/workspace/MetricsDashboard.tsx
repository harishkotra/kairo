import React, { useMemo } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { cumulativeSeries, Meter, Sparkline, useChangeFlash, useCountUp } from './viz';
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
    setTimelineFilter,
    setView,
  } = useWorkspace();

  const jumpTo = (label: string, types: string[]) => () => {
    setTimelineFilter({ label, types });
    setView('timeline');
  };
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

  const series = useMemo(() => {
    const ts = (types?: string[]) =>
      events
        .filter((e) => !types || types.some((t) => e.type.startsWith(t)))
        .map((e) => e.ts);
    return {
      all: cumulativeSeries(ts()),
      artifacts: cumulativeSeries(ts(['artifact.'])),
      agents: cumulativeSeries(ts(['agent.started', 'agent.complete'])),
      memory: cumulativeSeries(ts(['memory.'])),
      decisions: cumulativeSeries(decisions.map((d) => d.ts)),
    };
  }, [events, decisions]);

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
          num={m.agentsSpawned}
          hint={`${m.agentsComplete} complete`}
          series={series.agents}
          onPress={jumpTo('Agents', ['agent.started', 'agent.complete', 'agent.queued', 'agent.waiting'])}
        />
        <Metric
          label="Files created"
          num={m.filesCreated}
          hint="layouts · screens · tokens"
          series={series.artifacts}
          onPress={jumpTo('Artifacts', ['artifact.'])}
        />
        <Metric
          label="Components reused"
          value={`${m.componentsReused}/${m.componentsCreated}`}
          hint={
            m.mostReusedComponent
              ? `Top: ${m.mostReusedComponent.name} ×${m.mostReusedComponent.count}`
              : 'No reuse yet'
          }
          fraction={
            m.componentsCreated > 0
              ? m.componentsReused / m.componentsCreated
              : undefined
          }
        />
        <Metric
          label="Avg parallelism"
          num={m.averageParallelism}
          format={(n) => n.toFixed(2)}
          hint="concurrent agents"
        />
        <Metric
          label="Avg wait time"
          num={Math.round(m.averageWaitMs)}
          format={(n) => formatDuration(Math.round(n))}
          hint="blocked → start"
        />
        <Metric
          label="Retries"
          num={m.totalRetries}
          hint="across agents"
          alert={m.totalRetries > 0}
          onPress={jumpTo('Retries', ['agent.retry', 'agent.error'])}
        />
        <Metric
          label="Reasoning time"
          num={m.reasoningTimeMs}
          format={(n) => formatDuration(Math.round(n))}
          hint="est. inference share"
          onPress={jumpTo('Reasoning', ['agent.reasoning'])}
        />
        <Metric
          label="Token usage"
          num={m.tokenUsage.total}
          format={(n) => formatTokens(Math.round(n))}
          hint={`${formatTokens(m.tokenUsage.prompt)}↑ ${formatTokens(m.tokenUsage.completion)}↓`}
          series={series.all}
        />
        <Metric
          label="Est. cost"
          num={m.costUsd}
          format={(n) => formatUsd(n)}
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
          fraction={m.averageConfidence > 0 ? m.averageConfidence : undefined}
          onPress={jumpTo('Decisions', ['agent.decision'])}
        />
        <Metric
          label="Design consistency"
          value={`${Math.round(m.designConsistency * 100)}%`}
          hint="reuse + warning penalty"
          fraction={m.designConsistency}
        />
        <Metric
          label="Accessibility"
          value={`${Math.round(m.accessibilityScore * 100)}%`}
          hint="contrast / a11y steps"
          fraction={m.accessibilityScore}
        />
        <Metric
          label="Export success"
          value={m.exportSuccess ? 'Yes' : '—'}
          hint={m.exportSuccess ? 'last export ok' : 'not exported yet'}
        />
        <Metric
          label="Events"
          num={m.eventsCount}
          hint="trace length"
          series={series.all}
          onPress={() => {
            setTimelineFilter(null);
            setView('timeline');
          }}
        />
        <Metric
          label="Memories"
          num={m.memoriesCount}
          hint="shared + agent"
          series={series.memory}
          onPress={jumpTo('Memory', ['memory.'])}
        />
        <Metric
          label="Run duration"
          num={m.runDurationMs}
          format={(n) => formatDuration(Math.round(n))}
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
  num,
  format,
  hint,
  wide,
  series,
  fraction,
  alert,
  onPress,
}: {
  label: string;
  /** Static display string (used when `num` is absent). */
  value?: string;
  /** Numeric value — animates with a count-up when it changes. */
  num?: number;
  format?: (n: number) => string;
  hint?: string;
  wide?: boolean;
  /** Cumulative series → sparkline in the card corner. */
  series?: number[];
  /** 0..1 → slim meter bar under the value. */
  fraction?: number;
  /** Tint the value when the metric deserves attention (e.g. retries). */
  alert?: boolean;
  /** Tap → jump to filtered timeline. */
  onPress?: () => void;
}) {
  const animated = useCountUp(num ?? 0);
  const display =
    num != null
      ? (format ?? ((n: number) => String(Math.round(n))))(animated)
      : (value ?? '—');
  const flash = useChangeFlash(num != null ? num : value);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        wide && styles.cardWide,
        onPress && pressed && { borderColor: workspace.accent + '88' },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.cardFlash,
          {
            opacity: flash.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.14],
            }),
          },
        ]}
      />
      <View style={styles.cardTop}>
        <Text style={styles.label}>{label}</Text>
        {series && series.length > 1 ? (
          <Sparkline data={series} width={64} height={22} />
        ) : null}
      </View>
      <Text
        style={[styles.value, alert && { color: workspace.amber }]}
        numberOfLines={2}
      >
        {display}
      </Text>
      {fraction != null ? <Meter fraction={fraction} /> : null}
      {hint ? (
        <Text style={styles.hint} numberOfLines={2}>
          {hint}
        </Text>
      ) : null}
      {onPress ? (
        <Text style={styles.jumpHint}>trace →</Text>
      ) : null}
    </Pressable>
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
    overflow: 'hidden',
  },
  cardFlash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: workspace.accent,
    opacity: 0,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
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
  jumpHint: {
    color: workspace.accentCool,
    fontSize: 9,
    fontFamily: workspace.mono,
    marginTop: 6,
    letterSpacing: 0.5,
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

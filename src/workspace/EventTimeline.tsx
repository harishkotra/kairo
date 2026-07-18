import React, { useEffect, useRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { TraceEvent, TraceEventType } from '../agents/types';
import { workspace, radius, spacing, typography } from '../theme/tokens';
import { formatClock } from './format';
import { useDisplayState } from './useDisplayState';
import { useWorkspace } from './WorkspaceContext';

const TYPE_COLOR: Partial<Record<TraceEventType, string>> = {
  'pipeline.start': workspace.accentHot,
  'pipeline.complete': workspace.success,
  'pipeline.reset': workspace.textDim,
  'plan.ready': workspace.accent,
  'agent.queued': workspace.accentCool,
  'agent.waiting': '#60A5FA',
  'agent.blocked': '#FBBF24',
  'agent.started': workspace.accentCool,
  'agent.step': workspace.textMuted,
  'agent.reasoning': workspace.violet,
  'agent.decision': workspace.accentHot,
  'agent.retry': '#C084FC',
  'agent.complete': workspace.success,
  'agent.error': workspace.danger,
  'artifact.created': workspace.accent,
  'artifact.updated': workspace.accent,
  'memory.added': workspace.violet,
  'memory.searched': '#A78BFA',
  handoff: workspace.amber,
  export: workspace.mint,
  'preview.ready': workspace.accentHot,
};

function EventRow({
  event,
  agentColor,
  onPress,
}: {
  event: TraceEvent;
  agentColor?: string;
  onPress?: () => void;
}) {
  const accent = agentColor ?? TYPE_COLOR[event.type] ?? workspace.textDim;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { opacity: pressed ? 0.75 : 1, borderLeftColor: accent },
      ]}
    >
      <Text style={styles.time}>{formatClock(event.ts)}</Text>
      <View style={styles.rowBody}>
        <Text style={styles.title}>{event.title}</Text>
        {event.detail ? (
          <Text style={styles.detail} numberOfLines={2}>
            {event.detail}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Full timeline view (center panel) */
export function EventTimeline() {
  const { selectAgent, phase, selectDecision } = useWorkspace();
  const { events, agents, isReplayView } = useDisplayState();
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 40);
    return () => clearTimeout(t);
  }, [events.length]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>TRACE</Text>
          <Text style={styles.heading}>Event timeline</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {events.length} events
            {phase === 'running' ? ' · live' : ''}
            {isReplayView ? ' · replay' : ''}
          </Text>
        </View>
      </View>

      {events.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No events yet</Text>
          <Text style={styles.emptyBody}>
            Start a build. Every agent start, step, artifact, handoff, and
            completion lands here so a run is replayable.
          </Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.list}
          contentContainerStyle={styles.listContent}
        >
          <View style={styles.spine} />
          {events.map((ev) => (
            <EventRow
              key={ev.id}
              event={ev}
              agentColor={
                ev.agentId ? agents[ev.agentId]?.color : undefined
              }
              onPress={() => {
                if (ev.agentId) selectAgent(ev.agentId);
                if (
                  ev.type === 'agent.decision' &&
                  typeof ev.meta?.decisionId === 'string'
                ) {
                  selectDecision(String(ev.meta.decisionId));
                }
              }}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

/** Compact strip for canvas dock */
export function EventTimelineStrip() {
  const { selectAgent, setView } = useWorkspace();
  const { events, agents } = useDisplayState();
  const recent = events.slice(-8);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 40);
    return () => clearTimeout(t);
  }, [events.length]);

  if (events.length === 0) return null;

  return (
    <View style={styles.strip}>
      <Pressable onPress={() => setView('timeline')} style={styles.stripHead}>
        <Text style={styles.stripLabel}>TRACE</Text>
        <Text style={styles.stripCount}>{events.length}</Text>
      </Pressable>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stripScroll}
      >
        {recent.map((ev) => (
          <Pressable
            key={ev.id}
            onPress={() => {
              if (ev.agentId) selectAgent(ev.agentId);
            }}
            style={[
              styles.chip,
              {
                borderColor: ev.agentId
                  ? agents[ev.agentId].color + '66'
                  : workspace.border,
              },
            ]}
          >
            <Text style={styles.chipTime}>{formatClock(ev.ts)}</Text>
            <Text style={styles.chipTitle} numberOfLines={1}>
              {ev.title}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: workspace.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
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
    letterSpacing: -0.3,
    marginTop: 2,
  },
  badge: {
    borderWidth: 1,
    borderColor: workspace.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: workspace.panelElevated,
  },
  badgeText: {
    color: workspace.textMuted,
    fontSize: 11,
    fontFamily: workspace.mono,
  },
  list: { flex: 1 },
  listContent: {
    padding: spacing[5],
    paddingBottom: spacing[10],
    position: 'relative',
  },
  spine: {
    position: 'absolute',
    left: spacing[5] + 52,
    top: spacing[5],
    bottom: spacing[10],
    width: 1,
    backgroundColor: workspace.border,
  },
  row: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[3],
    paddingLeft: spacing[2],
    borderLeftWidth: 2,
    paddingVertical: 4,
  },
  time: {
    width: 64,
    color: workspace.textDim,
    fontSize: 11,
    fontFamily: workspace.mono,
    paddingTop: 2,
  },
  rowBody: { flex: 1 },
  title: {
    color: workspace.text,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
  detail: {
    color: workspace.textMuted,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[8],
  },
  emptyTitle: {
    color: workspace.text,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    marginBottom: spacing[2],
  },
  emptyBody: {
    color: workspace.textMuted,
    fontSize: typography.size.sm,
    textAlign: 'center',
    maxWidth: 360,
    lineHeight: 20,
  },
  strip: {
    borderTopWidth: 1,
    borderTopColor: workspace.border,
    backgroundColor: workspace.panel,
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
  },
  stripHead: {
    paddingHorizontal: spacing[3],
    borderRightWidth: 1,
    borderRightColor: workspace.border,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 56,
  },
  stripLabel: {
    color: workspace.accent,
    fontSize: 9,
    fontFamily: workspace.mono,
    letterSpacing: 1,
    fontWeight: typography.weight.bold,
  },
  stripCount: {
    color: workspace.textMuted,
    fontSize: 11,
    fontFamily: workspace.mono,
    marginTop: 2,
  },
  stripScroll: {
    paddingHorizontal: spacing[2],
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    backgroundColor: workspace.panelElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    maxWidth: 180,
    borderRadius: radius.sm,
  },
  chipTime: {
    color: workspace.textDim,
    fontSize: 9,
    fontFamily: workspace.mono,
  },
  chipTitle: {
    color: workspace.text,
    fontSize: 11,
    marginTop: 2,
  },
});

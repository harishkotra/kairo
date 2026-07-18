import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { TraceEvent } from '../agents/types';
import { workspace, spacing, typography } from '../theme/tokens';
import { formatClock } from './format';
import { useDisplayState } from './useDisplayState';
import { useWorkspace } from './WorkspaceContext';

const TICKER_EVENTS = 14;
const PX_PER_SECOND = 40;

/**
 * Marquee of recent trace events under the top bar — the run narrates
 * itself while you watch any view. Tap → full timeline.
 */
export function ActivityTicker() {
  const { setView, setTimelineFilter, phase } = useWorkspace();
  const { events, agents } = useDisplayState();
  const recent = useMemo(() => events.slice(-TICKER_EVENTS), [events]);

  const translate = useRef(new Animated.Value(0)).current;
  const [contentWidth, setContentWidth] = useState(0);

  useEffect(() => {
    if (contentWidth <= 0) return;
    translate.setValue(0);
    const loop = Animated.loop(
      Animated.timing(translate, {
        toValue: -contentWidth,
        duration: (contentWidth / PX_PER_SECOND) * 1000,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      })
    );
    loop.start();
    return () => loop.stop();
  }, [contentWidth, translate, recent.length]);

  if (recent.length === 0) return null;

  const openTimeline = () => {
    setTimelineFilter(null);
    setView('timeline');
  };

  return (
    <Pressable onPress={openTimeline} style={styles.bar}>
      <View style={styles.head}>
        <View
          style={[
            styles.dot,
            {
              backgroundColor:
                phase === 'running' || phase === 'planning'
                  ? workspace.accentHot
                  : workspace.success,
            },
          ]}
        />
        <Text style={styles.headLabel}>
          {phase === 'running' || phase === 'planning' ? 'LIVE' : 'TRACE'}
        </Text>
      </View>
      <View style={styles.window}>
        <Animated.View
          style={[styles.track, { transform: [{ translateX: translate }] }]}
        >
          {/* Two copies for a seamless loop; measure the first. */}
          <View
            style={styles.chunk}
            onLayout={(e) => setContentWidth(e.nativeEvent.layout.width)}
          >
            {recent.map((ev) => (
              <TickerItem key={ev.id} event={ev} color={eventColor(ev, agents)} />
            ))}
          </View>
          <View style={styles.chunk}>
            {recent.map((ev) => (
              <TickerItem
                key={`${ev.id}-b`}
                event={ev}
                color={eventColor(ev, agents)}
              />
            ))}
          </View>
        </Animated.View>
      </View>
    </Pressable>
  );
}

function eventColor(
  ev: TraceEvent,
  agents: Record<string, { color?: string } | undefined>
): string {
  if (ev.agentId && agents[ev.agentId]?.color) {
    return agents[ev.agentId]!.color!;
  }
  if (ev.type === 'agent.error') return workspace.danger;
  if (ev.type.startsWith('pipeline.')) return workspace.accentHot;
  return workspace.textDim;
}

function TickerItem({ event, color }: { event: TraceEvent; color: string }) {
  return (
    <View style={styles.item}>
      <View style={[styles.itemDot, { backgroundColor: color }]} />
      <Text style={styles.itemTime}>{formatClock(event.ts)}</Text>
      <Text style={styles.itemTitle} numberOfLines={1}>
        {event.title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
    backgroundColor: workspace.bg,
    borderBottomWidth: 1,
    borderBottomColor: workspace.border,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing[3],
    borderRightWidth: 1,
    borderRightColor: workspace.border,
    height: '100%',
  },
  dot: { width: 6, height: 6 },
  headLabel: {
    color: workspace.textMuted,
    fontSize: 9,
    fontFamily: workspace.mono,
    letterSpacing: 1.2,
    fontWeight: typography.weight.bold,
  },
  window: {
    flex: 1,
    overflow: 'hidden',
    height: '100%',
    justifyContent: 'center',
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chunk: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing[3],
  },
  itemDot: { width: 5, height: 5 },
  itemTime: {
    color: workspace.textDim,
    fontSize: 9,
    fontFamily: workspace.mono,
  },
  itemTitle: {
    color: workspace.textMuted,
    fontSize: 11,
    maxWidth: 260,
  },
});

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import type { AgentRuntime } from '../agents/types';
import { workspace, radius, spacing, typography } from '../theme/tokens';
import { formatDuration } from './format';

type Props = {
  agent: AgentRuntime;
  selected: boolean;
  scale: number;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
};

export function AgentCard({
  agent,
  selected,
  scale,
  onSelect,
  onMove,
}: Props) {
  const tx = useSharedValue(agent.position.x);
  const ty = useSharedValue(agent.position.y);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const z = useSharedValue(selected ? 10 : 1);
  const pulse = useSharedValue(1);
  const glow = useSharedValue(0);

  React.useEffect(() => {
    tx.value = agent.position.x;
    ty.value = agent.position.y;
  }, [agent.position.x, agent.position.y, tx, ty]);

  const running =
    agent.status === 'running' || agent.status === 'retrying';
  const complete = agent.status === 'complete';
  const blocked = agent.status === 'blocked';
  const waiting =
    agent.status === 'waiting' || agent.status === 'queued';

  React.useEffect(() => {
    if (running) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.025, {
            duration: 700,
            easing: Easing.inOut(Easing.quad),
          }),
          withTiming(1, {
            duration: 700,
            easing: Easing.inOut(Easing.quad),
          })
        ),
        -1,
        false
      );
      glow.value = withRepeat(
        withSequence(
          withTiming(0.55, { duration: 700 }),
          withTiming(0.15, { duration: 700 })
        ),
        -1,
        false
      );
    } else if (complete) {
      cancelAnimation(pulse);
      pulse.value = withTiming(1, { duration: 200 });
      glow.value = withTiming(0.4, { duration: 400 });
    } else {
      cancelAnimation(pulse);
      cancelAnimation(glow);
      pulse.value = withTiming(1, { duration: 200 });
      glow.value = withTiming(0, { duration: 200 });
    }
  }, [running, complete, pulse, glow]);

  const pan = Gesture.Pan()
    .onBegin(() => {
      startX.value = tx.value;
      startY.value = ty.value;
      z.value = 50;
      runOnJS(onSelect)();
    })
    .onUpdate((e) => {
      tx.value = startX.value + e.translationX / scale;
      ty.value = startY.value + e.translationY / scale;
    })
    .onEnd(() => {
      z.value = selected ? 10 : 1;
      runOnJS(onMove)(tx.value, ty.value);
    });

  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(onSelect)();
  });

  const gesture = Gesture.Simultaneous(pan, tap);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: pulse.value },
    ],
    zIndex: z.value,
    shadowOpacity: 0.2 + glow.value * 0.45,
    shadowRadius: 8 + glow.value * 18,
  }));

  const duration =
    agent.durationMs ??
    (agent.startedAt
      ? (agent.completedAt ?? Date.now()) - agent.startedAt
      : undefined);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          styles.card,
          style,
          {
            borderColor: selected
              ? agent.color
              : complete
                ? workspace.success + '99'
                : running
                  ? agent.color + 'aa'
                  : workspace.border,
            shadowColor: complete
              ? workspace.success
              : running
                ? agent.color
                : '#000',
          },
        ]}
      >
        <View style={[styles.topStripe, { backgroundColor: agent.color }]} />
        {running ? (
          <View
            style={[styles.pulseRing, { borderColor: agent.color + '55' }]}
          />
        ) : null}
        <View style={styles.top}>
          <View style={[styles.icon, { borderColor: agent.color + '55' }]}>
            <Ionicons
              name={agent.icon as keyof typeof Ionicons.glyphMap}
              size={16}
              color={agent.color}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{agent.name}</Text>
            <Text style={styles.role}>{agent.role}</Text>
          </View>
          <View
            style={[
              styles.statusChip,
              {
                borderColor: complete
                  ? workspace.success + '55'
                  : running
                    ? agent.color + '55'
                    : blocked
                      ? '#FBBF2455'
                      : waiting
                        ? '#60A5FA55'
                        : workspace.border,
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: complete
                    ? workspace.success
                    : running
                      ? agent.color
                      : blocked
                        ? '#FBBF24'
                        : waiting
                          ? '#60A5FA'
                          : workspace.textDim,
                },
              ]}
            >
              {agent.status === 'error' ? 'failed' : agent.status}
            </Text>
          </View>
        </View>

        <Text style={styles.task} numberOfLines={2}>
          {agent.currentTask}
        </Text>

        {agent.vm && agent.vm.status !== 'idle' ? (
          <View style={styles.vmRow}>
            <View
              style={[
                styles.vmDot,
                {
                  backgroundColor:
                    agent.vm.status === 'running' || agent.vm.status === 'booting'
                      ? workspace.accentHot
                      : agent.vm.status === 'ready'
                        ? workspace.success
                        : workspace.textDim,
                },
              ]}
            />
            <Text style={styles.vmText} numberOfLines={1}>
              VM · {agent.vm.mode === 'agentos' ? 'agentOS' : 'sim'} ·{' '}
              {agent.vm.status}
              {agent.vm.sessionId
                ? ` · ${agent.vm.sessionId.slice(0, 10)}`
                : ''}
            </Text>
          </View>
        ) : null}

        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              {
                width: `${agent.progress}%`,
                backgroundColor: agent.color,
              },
            ]}
          />
        </View>
        <View style={styles.footer}>
          <Text style={styles.pct}>{agent.progress}%</Text>
          <Text style={styles.steps}>
            {agent.currentStepIndex >= 0
              ? `${Math.min(agent.currentStepIndex + 1, agent.steps.length)}/${agent.steps.length}`
              : `${agent.steps.length} steps`}
          </Text>
          {duration != null && agent.status !== 'idle' ? (
            <Text style={styles.dur}>{formatDuration(duration)}</Text>
          ) : null}
          {agent.confidence > 0 ? (
            <Text style={styles.conf}>
              {Math.round(agent.confidence * 100)}%
            </Text>
          ) : null}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: 268,
    backgroundColor: workspace.panelElevated,
    borderRadius: radius.sm,
    borderWidth: 1,
    padding: spacing[3],
    paddingTop: spacing[3] + 4,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  topStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  pulseRing: {
    ...StyleSheet.absoluteFill,
    borderWidth: 1,
    borderRadius: radius.sm,
    opacity: 0.6,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: workspace.panel,
  },
  name: {
    color: workspace.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
  role: {
    color: workspace.textDim,
    fontSize: 11,
    marginTop: 1,
  },
  statusChip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    backgroundColor: workspace.panel,
  },
  statusText: {
    fontSize: 9,
    fontWeight: typography.weight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontFamily: workspace.mono,
  },
  task: {
    color: workspace.textMuted,
    fontSize: typography.size.sm,
    lineHeight: 18,
    minHeight: 36,
    marginBottom: spacing[2],
  },
  vmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing[2],
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: workspace.bg,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: workspace.border,
  },
  vmDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  vmText: {
    color: workspace.textDim,
    fontSize: 10,
    fontFamily: workspace.mono,
    flex: 1,
  },
  track: {
    height: 3,
    backgroundColor: workspace.border,
    overflow: 'hidden',
    marginBottom: spacing[2],
  },
  fill: {
    height: '100%',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pct: {
    color: workspace.text,
    fontSize: 11,
    fontWeight: typography.weight.bold,
    fontFamily: workspace.mono,
  },
  steps: {
    color: workspace.textDim,
    fontSize: 10,
    fontFamily: workspace.mono,
    flex: 1,
  },
  dur: {
    color: workspace.textMuted,
    fontSize: 10,
    fontFamily: workspace.mono,
  },
  conf: {
    color: workspace.accentHot,
    fontSize: 10,
    fontFamily: workspace.mono,
  },
});

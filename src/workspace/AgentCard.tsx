import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import type { AgentRuntime } from '../agents/types';
import { workspace, radius, spacing, typography } from '../theme/tokens';

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

  React.useEffect(() => {
    tx.value = agent.position.x;
    ty.value = agent.position.y;
  }, [agent.position.x, agent.position.y, tx, ty]);

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
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
    zIndex: z.value,
  }));

  const running = agent.status === 'running';
  const complete = agent.status === 'complete';

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          styles.card,
          style,
          {
            borderColor: selected ? agent.color : workspace.border,
            shadowOpacity: selected || running ? 0.35 : 0.15,
          },
        ]}
      >
        <View style={[styles.glow, { backgroundColor: agent.color + '18' }]} />
        <View style={styles.top}>
          <View style={[styles.icon, { backgroundColor: agent.color + '22' }]}>
            <Ionicons
              name={agent.icon as keyof typeof Ionicons.glyphMap}
              size={18}
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
                backgroundColor: complete
                  ? 'rgba(52, 211, 153, 0.12)'
                  : running
                    ? agent.color + '22'
                    : workspace.panel,
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
                      : workspace.textDim,
                },
              ]}
            >
              {agent.status}
            </Text>
          </View>
        </View>

        <Text style={styles.task} numberOfLines={2}>
          {agent.currentTask}
        </Text>

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
              ? `Step ${Math.min(agent.currentStepIndex + 1, agent.steps.length)}/${agent.steps.length}`
              : `${agent.steps.length} steps`}
          </Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: 260,
    backgroundColor: workspace.panelElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing[3] + 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
  },
  glow: {
    ...StyleSheet.absoluteFill,
    opacity: 1,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusText: {
    fontSize: 10,
    fontWeight: typography.weight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  task: {
    color: workspace.textMuted,
    fontSize: typography.size.sm,
    lineHeight: 18,
    minHeight: 36,
    marginBottom: spacing[3],
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: workspace.border,
    overflow: 'hidden',
    marginBottom: spacing[2],
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pct: {
    color: workspace.text,
    fontSize: 12,
    fontWeight: typography.weight.bold,
  },
  steps: {
    color: workspace.textDim,
    fontSize: 11,
  },
});

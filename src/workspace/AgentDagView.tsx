import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Line, Circle } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import type { AgentId, AgentRuntime } from '../agents/types';
import { workspace, spacing, typography } from '../theme/tokens';
import { dagStatusColor, dagStatusLabel } from './replay';
import { useDisplayState } from './useDisplayState';
import { useWorkspace } from './WorkspaceContext';
import { formatDuration } from './format';

const NODE_W = 160;
const NODE_H = 72;

function layoutPositions(order: AgentId[]): Record<AgentId, { x: number; y: number }> {
  const pos: Record<AgentId, { x: number; y: number }> = {};
  let sx = 0;
  for (const id of order) {
    if (id === 'architecture') pos[id] = { x: 40, y: 120 };
    else if (id === 'designSystem') pos[id] = { x: 280, y: 120 };
    else {
      pos[id] = {
        x: 520 + (sx % 2) * 220,
        y: 40 + Math.floor(sx / 2) * 100,
      };
      sx += 1;
    }
  }
  return pos;
}

function DagNode({
  agent,
  selected,
  pos,
  onPress,
}: {
  agent: AgentRuntime;
  selected: boolean;
  pos: { x: number; y: number };
  onPress: () => void;
}) {
  const color = dagStatusColor(agent.status);
  const running =
    agent.status === 'running' || agent.status === 'retrying';
  const complete = agent.status === 'complete';
  const pulse = useSharedValue(1);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (running) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.04, { duration: 600, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      );
      glow.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 600 }),
          withTiming(0.2, { duration: 600 })
        ),
        -1,
        false
      );
    } else if (complete) {
      cancelAnimation(pulse);
      pulse.value = withTiming(1);
      glow.value = withTiming(0.55, { duration: 350 });
    } else {
      cancelAnimation(pulse);
      cancelAnimation(glow);
      pulse.value = 1;
      glow.value = 0;
    }
  }, [running, complete, pulse, glow]);

  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    shadowOpacity: glow.value,
    shadowRadius: 4 + glow.value * 14,
  }));

  const duration =
    agent.durationMs ??
    (agent.startedAt
      ? (agent.completedAt ?? Date.now()) - agent.startedAt
      : undefined);

  return (
    <Animated.View
      style={[
        styles.node,
        anim,
        {
          left: pos.x,
          top: pos.y,
          borderColor: selected ? color : color + '88',
          backgroundColor:
            running || complete ? color + '22' : workspace.panelElevated,
          shadowColor: color,
        },
      ]}
    >
      <Pressable onPress={onPress} style={{ flex: 1 }}>
        <View style={styles.nodeTop}>
          <View style={[styles.pulse, { backgroundColor: color }]} />
          <Text style={[styles.status, { color }]}>
            {dagStatusLabel(agent.status)}
          </Text>
          <Text style={styles.pct}>{agent.progress}%</Text>
        </View>
        <Text style={styles.name}>{agent.name}</Text>
        <Text style={styles.task} numberOfLines={1}>
          {agent.currentTask}
        </Text>
        {duration != null && agent.status !== 'idle' ? (
          <Text style={styles.dur}>{formatDuration(duration)}</Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

export function AgentDagView() {
  const { selectedAgentId, selectAgent, setView, agentOrder } = useWorkspace();
  const { agents, isReplayView } = useDisplayState();
  const [dashOffset, setDashOffset] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setDashOffset((d) => (d + 2) % 24);
    }, 80);
    return () => clearInterval(id);
  }, []);

  const positions = useMemo(() => layoutPositions(agentOrder), [agentOrder]);

  const edges = useMemo(() => {
    const list: Array<{ from: AgentId; to: AgentId }> = [];
    for (const id of agentOrder) {
      const a = agents[id];
      if (!a) continue;
      for (const dep of a.dependsOn) {
        list.push({ from: dep, to: id });
      }
    }
    return list;
  }, [agentOrder, agents]);

  const canvasW = Math.max(980, 520 + Math.ceil(agentOrder.length / 2) * 120);
  const canvasH = 360;

  if (agentOrder.length === 0) {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.heading}>Agent graph</Text>
          <Text style={styles.sub}>
            Build an app from a product brief to populate the execution graph.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>ORCHESTRATION</Text>
          <Text style={styles.heading}>Agent dependency graph</Text>
          <Text style={styles.sub}>
            Execution DAG · status-colored nodes
            {isReplayView ? ' · replay' : ''}
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        style={styles.scroll}
        contentContainerStyle={{ minWidth: canvasW, padding: spacing[5] }}
      >
        <View style={{ width: canvasW, height: canvasH }}>
          <Svg width={canvasW} height={canvasH} style={StyleSheet.absoluteFill}>
            {edges.map((e) => {
              const a = positions[e.from];
              const b = positions[e.to];
              if (!a || !b) return null;
              const x1 = a.x + NODE_W;
              const y1 = a.y + NODE_H / 2;
              const x2 = b.x;
              const y2 = b.y + NODE_H / 2;
              const fromStatus = agents[e.from]?.status;
              const active =
                fromStatus === 'complete' ||
                agents[e.to]?.status === 'running' ||
                agents[e.to]?.status === 'complete';
              return (
                <React.Fragment key={`${e.from}-${e.to}`}>
                  <Line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={
                      active
                        ? 'rgba(212, 165, 116, 0.65)'
                        : 'rgba(61, 74, 92, 0.8)'
                    }
                    strokeWidth={active ? 2.5 : 1}
                    strokeDasharray={active ? '6 4' : undefined}
                    strokeDashoffset={active ? dashOffset : 0}
                  />
                  <Circle
                    cx={(x1 + x2) / 2}
                    cy={(y1 + y2) / 2}
                    r={active ? 4 : 3}
                    fill={active ? workspace.accentHot : workspace.textDim}
                  />
                </React.Fragment>
              );
            })}
          </Svg>

          {agentOrder.map((id) =>
            agents[id] && positions[id] ? (
              <DagNode
                key={id}
                agent={agents[id]}
                selected={selectedAgentId === id}
                pos={positions[id]}
                onPress={() => selectAgent(id)}
              />
            ) : null
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable onPress={() => setView('decisions')}>
          <Text style={styles.link}>Open decisions →</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: workspace.bg },
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
  scroll: { flex: 1 },
  node: {
    position: 'absolute',
    width: NODE_W,
    minHeight: NODE_H,
    borderWidth: 1.5,
    padding: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  nodeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  pulse: { width: 7, height: 7 },
  status: {
    fontSize: 9,
    fontFamily: workspace.mono,
    fontWeight: typography.weight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    flex: 1,
  },
  pct: {
    color: workspace.textMuted,
    fontSize: 10,
    fontFamily: workspace.mono,
  },
  name: {
    color: workspace.text,
    fontSize: 13,
    fontWeight: typography.weight.semibold,
  },
  task: {
    color: workspace.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  dur: {
    color: workspace.textDim,
    fontSize: 9,
    fontFamily: workspace.mono,
    marginTop: 4,
  },
  footer: {
    padding: spacing[4],
    borderTopWidth: 1,
    borderTopColor: workspace.border,
  },
  link: {
    color: workspace.accentCool,
    fontSize: 12,
    fontWeight: typography.weight.semibold,
  },
});

import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  Pressable,
} from 'react-native';
import Svg, { Line, Circle, Defs, Marker, Path } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import type { AppPlan } from '../agents/types';
import { isScreenAgent } from '../agents/definitions';
import { workspace, spacing, typography } from '../theme/tokens';
import { useDisplayState } from './useDisplayState';
import { useWorkspace } from './WorkspaceContext';
import { AgentCard } from './AgentCard';
import { PhonePreview } from './PhonePreview';
import { PromptComposer } from './PromptComposer';

const GRID_SIZE = 28;
const DOT_SIZE = 2;
const MAJOR_EVERY = 5;

function DotGrid({ width, height }: { width: number; height: number }) {
  const dots = useMemo(() => {
    const cols = Math.ceil(width / GRID_SIZE) + 1;
    const rows = Math.ceil(height / GRID_SIZE) + 1;
    const items: { x: number; y: number; major: boolean }[] = [];
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const major = c % MAJOR_EVERY === 0 || r % MAJOR_EVERY === 0;
        items.push({ x: c * GRID_SIZE, y: r * GRID_SIZE, major });
      }
    }
    return items;
  }, [width, height]);

  return (
    <View
      style={[StyleSheet.absoluteFill, { backgroundColor: workspace.bg, pointerEvents: 'none' }]}
    >
      {dots.map((d, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: d.x,
            top: d.y,
            width: DOT_SIZE,
            height: DOT_SIZE,
            borderRadius: DOT_SIZE / 2,
            backgroundColor: d.major
              ? 'rgba(255,255,255,0.08)'
              : 'rgba(255,255,255,0.035)',
          }}
        />
      ))}
    </View>
  );
}

function Edges({
  connections,
  progress,
}: {
  connections: Array<{ from: { x: number; y: number }; to: { x: number; y: number } }>;
  progress: number;
}) {
  const [dashOffset, setDashOffset] = React.useState(0);

  React.useEffect(() => {
    const id = setInterval(() => {
      setDashOffset((d) => (d + 1) % 20);
    }, 50);
    return () => clearInterval(id);
  }, []);

  return (
    <Svg style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      <Defs>
        <Marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <Path d="M0,0 L8,3 L0,6 Z" fill="rgba(212, 165, 116, 0.5)" />
        </Marker>
      </Defs>
      {connections.map((c, i) => {
        const midX = (c.from.x + c.to.x) / 2;
        const midY = (c.from.y + c.to.y) / 2;
        const done = i < Math.floor(progress);
        const active = i === Math.floor(progress);
        return (
          <React.Fragment key={i}>
            <Line
              x1={c.from.x}
              y1={c.from.y}
              x2={c.to.x}
              y2={c.to.y}
              stroke={done ? 'rgba(48, 209, 88, 0.5)' : active ? 'rgba(100, 210, 255, 0.6)' : 'rgba(61, 74, 92, 0.4)'}
              strokeWidth={active ? 2.5 : done ? 2 : 1.2}
              strokeDasharray={!done ? '6 4' : undefined}
              strokeDashoffset={!done ? dashOffset : 0}
              markerEnd={active ? 'url(#arrowhead)' : undefined}
            />
            {active ? (
              <Circle
                cx={midX}
                cy={midY}
                r={4}
                fill="rgba(100, 210, 255, 0.7)"
              />
            ) : null}
            {done ? (
              <Circle
                cx={midX}
                cy={midY}
                r={3}
                fill="rgba(48, 209, 88, 0.5)"
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

export function InfiniteCanvas() {
  const {
    selectedAgentId,
    selectAgent,
    setAgentPosition,
    setPreviewPosition,
    canvasOffset,
    setCanvasOffset,
    canvasScale,
    setCanvasScale,
    darkModePreview,
    setDarkModePreview,
    phase,
    agentOrder,
    appPlan,
    projectName,
  } = useWorkspace();
  const { agents, isReplayView } = useDisplayState();

  const { width, height } = useWindowDimensions();
  const ox = useSharedValue(canvasOffset.x);
  const oy = useSharedValue(canvasOffset.y);
  const scale = useSharedValue(canvasScale);
  const startOx = useSharedValue(0);
  const startOy = useSharedValue(0);
  const startScale = useSharedValue(1);

  const panTwoFinger = Gesture.Pan()
    .minPointers(2)
    .onBegin(() => {
      startOx.value = ox.value;
      startOy.value = oy.value;
    })
    .onUpdate((e) => {
      ox.value = startOx.value + e.translationX;
      oy.value = startOy.value + e.translationY;
    })
    .onEnd(() => {
      runOnJS(setCanvasOffset)(ox.value, oy.value);
    });

  const panBg = Gesture.Pan()
    .onBegin(() => {
      startOx.value = ox.value;
      startOy.value = oy.value;
    })
    .onUpdate((e) => {
      ox.value = startOx.value + e.translationX;
      oy.value = startOy.value + e.translationY;
    })
    .onEnd(() => {
      runOnJS(setCanvasOffset)(ox.value, oy.value);
    });

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      startScale.value = scale.value;
    })
    .onUpdate((e) => {
      const next = Math.min(1.6, Math.max(0.55, startScale.value * e.scale));
      scale.value = next;
    })
    .onEnd(() => {
      runOnJS(setCanvasScale)(scale.value);
    });

  const composed = Gesture.Simultaneous(panTwoFinger, pinch);

  const worldStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: ox.value },
      { translateY: oy.value },
      { scale: scale.value },
    ],
  }));

  const previews = agentOrder
    .map((id) => agents[id])
    .filter(
      (a) => a && a.status === 'complete' && a.screenSpec && isScreenAgent(a.id)
    );

  const flow =
    appPlan?.screens.map((s) => s.title).join('  →  ') ?? '';

  const pipelineEdges = useMemo(() => {
    if (agentOrder.length < 2) return [];
    const edges: Array<{ from: { x: number; y: number }; to: { x: number; y: number } }> = [];
    for (let i = 0; i < agentOrder.length - 1; i++) {
      const a = agents[agentOrder[i]];
      const b = agents[agentOrder[i + 1]];
      if (!a || !b) continue;
      edges.push({
        from: {
          x: a.position.x + 268 / 2,
          y: a.position.y + 100,
        },
        to: {
          x: b.position.x + 268 / 2,
          y: b.position.y - 25,
        },
      });
    }
    return edges;
  }, [agentOrder, agents]);

  const completeCount = agentOrder.filter(
    (id) => agents[id]?.status === 'complete'
  ).length;
  const pipelineProgress = agentOrder.length > 0
    ? (completeCount - 1) / (agentOrder.length - 1)
    : 0;

  const screenCount = appPlan?.screens?.length ?? 0;
  const navType = appPlan?.navigation ?? 'tabs';

  return (
    <View style={styles.root}>
      <GestureDetector gesture={composed}>
        <View style={styles.viewport}>
          <View style={StyleSheet.absoluteFill}>
            <DotGrid width={width * 2} height={height * 2} />
          </View>

          <Animated.View style={[styles.world, worldStyle]}>
            {agentOrder.length > 0 ? (
              <>
                <View style={[styles.flowBadge, { pointerEvents: 'none' }]}>
                  <Text style={styles.flowEyebrow}>
                    {projectName.toUpperCase()}
                  </Text>
                  <View style={styles.flowRow}>
                    {appPlan?.screens.map((s, i) => (
                      <React.Fragment key={s.id}>
                        {i > 0 ? (
                          <Text style={styles.flowArrow}>→</Text>
                        ) : null}
                        <Text style={styles.flowScreen}>{s.title}</Text>
                      </React.Fragment>
                    ))}
                  </View>
                  <View style={styles.flowMeta}>
                    <Text style={styles.flowStat}>
                      {screenCount} screen{screenCount !== 1 ? 's' : ''}
                    </Text>
                    <Text style={styles.flowStat}>{navType}</Text>
                    <Text style={styles.flowStat}>
                      {completeCount}/{agentOrder.length} agents
                    </Text>
                  </View>
                </View>

                <Edges
                  connections={pipelineEdges}
                  progress={pipelineProgress}
                />
              </>
            ) : null}

            {agentOrder.map((id) =>
              agents[id] ? (
                <AgentCard
                  key={id}
                  agent={agents[id]}
                  selected={selectedAgentId === id}
                  scale={canvasScale}
                  onSelect={() => selectAgent(id)}
                  onMove={(x, y) => setAgentPosition(id, x, y)}
                />
              ) : null
            )}

            {previews.map((agent) =>
              agent?.screenSpec ? (
                <PhonePreview
                  key={`preview-${agent.id}`}
                  agentId={agent.id}
                  screenSpec={agent.screenSpec}
                  projectName={projectName}
                  label={`${agent.screenSpec.title} preview`}
                  color={agent.color}
                  x={agent.previewPosition.x}
                  y={agent.previewPosition.y}
                  scale={canvasScale}
                  darkMode={darkModePreview}
                  onMove={(x, y) => setPreviewPosition(agent.id, x, y)}
                  onSelect={() => selectAgent(agent.id)}
                />
              ) : null
            )}
          </Animated.View>

          {phase === 'idle' ? (
            <View style={[styles.emptyOverlay, { pointerEvents: 'box-none' }]}>
              <View style={styles.emptyBg} />
              <PromptComposer />
            </View>
          ) : null}

          {phase === 'planning' ? (
            <View style={[styles.emptyOverlay, { pointerEvents: 'none' }]}>
              <View style={styles.planningCard}>
                <View style={styles.planningDots}>
                  {[0, 1, 2].map((i) => (
                    <PlanningDot key={i} delay={i * 300} />
                  ))}
                </View>
                <Text style={styles.planningTitle}>Designing your app</Text>
                <Text style={styles.planningBody}>
                  Choosing navigation and screens from your brief.
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.toolbar}>
            <Pressable
              onPress={() => setDarkModePreview(!darkModePreview)}
              style={styles.toolBtn}
            >
              <View
                style={[
                  styles.toolDot,
                  { backgroundColor: darkModePreview ? '#000' : '#fff' },
                ]}
              />
              <Text style={styles.toolLabel}>
                {darkModePreview ? 'Dark' : 'Light'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                scale.value = 1;
                setCanvasScale(1);
              }}
              style={styles.toolBtn}
            >
              <Text style={styles.toolLabel}>
                {Math.round(canvasScale * 100)}%
                {isReplayView ? ' · R' : ''}
              </Text>
            </Pressable>
          </View>
        </View>
      </GestureDetector>
    </View>
  );
}

function PlanningDot({ delay }: { delay: number }) {
  const anim = useSharedValue(0.3);
  React.useEffect(() => {
    anim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.3, { duration: 600, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [anim]);

  const style = useAnimatedStyle(() => ({
    opacity: anim.value,
    transform: [{ scale: anim.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: workspace.accent,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: workspace.bg,
  },
  viewport: {
    flex: 1,
    overflow: 'hidden',
  },
  world: {
    width: 1800,
    height: 1400,
  },
  flowBadge: {
    position: 'absolute',
    left: 60,
    top: 28,
    backgroundColor: 'rgba(42, 42, 50, 0.85)',
    borderWidth: 1,
    borderColor: workspace.border,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    zIndex: 10,
    backdropFilter: 'blur(8px)',
  },
  flowEyebrow: {
    color: workspace.accent,
    fontSize: 9,
    fontFamily: workspace.mono,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  flowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  flowArrow: {
    color: workspace.textDim,
    fontSize: 11,
    fontFamily: workspace.mono,
  },
  flowScreen: {
    color: workspace.text,
    fontSize: 13,
    fontWeight: typography.weight.semibold,
    letterSpacing: -0.2,
  },
  flowMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: workspace.border,
  },
  flowStat: {
    color: workspace.textDim,
    fontSize: 9,
    fontFamily: workspace.mono,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  emptyOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[4],
  },
  emptyBg: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(26, 26, 30, 0.7)',
    backdropFilter: 'blur(4px)',
  },
  planningCard: {
    backgroundColor: 'rgba(42, 42, 50, 0.95)',
    borderWidth: 1,
    borderColor: workspace.border,
    padding: spacing[6],
    maxWidth: 340,
    alignItems: 'center',
    gap: spacing[3],
  },
  planningDots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  planningTitle: {
    color: workspace.text,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    textAlign: 'center',
  },
  planningBody: {
    color: workspace.textMuted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  toolbar: {
    position: 'absolute',
    right: spacing[3],
    bottom: spacing[3],
    flexDirection: 'row',
    gap: 6,
  },
  toolBtn: {
    backgroundColor: 'rgba(42, 42, 50, 0.85)',
    borderWidth: 1,
    borderColor: workspace.border,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toolDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: workspace.border,
  },
  toolLabel: {
    color: workspace.textMuted,
    fontSize: 10,
    fontFamily: workspace.mono,
  },
});

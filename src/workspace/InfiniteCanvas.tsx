import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  Pressable,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { isScreenAgent } from '../agents/definitions';
import { workspace, spacing, typography } from '../theme/tokens';
import { useDisplayState } from './useDisplayState';
import { useWorkspace } from './WorkspaceContext';
import { AgentCard } from './AgentCard';
import { PhonePreview } from './PhonePreview';
import { PromptComposer } from './PromptComposer';

/** Figma-like multi-scale grid */
function GridBackground({ width, height }: { width: number; height: number }) {
  const lines = useMemo(() => {
    const minor = 24;
    const majorEvery = 4;
    const vertical = Math.ceil(width / minor) + 2;
    const horizontal = Math.ceil(height / minor) + 2;
    const v: { x: number; major: boolean }[] = [];
    const h: { y: number; major: boolean }[] = [];
    for (let i = 0; i < vertical; i++) {
      v.push({ x: i * minor, major: i % majorEvery === 0 });
    }
    for (let i = 0; i < horizontal; i++) {
      h.push({ y: i * minor, major: i % majorEvery === 0 });
    }
    return { v, h };
  }, [width, height]);

  return (
    <View
      style={[StyleSheet.absoluteFill, { backgroundColor: workspace.bg }]}
      pointerEvents="none"
    >
      {lines.v.map(({ x, major }) => (
        <View
          key={`v-${x}`}
          style={{
            position: 'absolute',
            left: x,
            top: 0,
            bottom: 0,
            width: StyleSheet.hairlineWidth,
            backgroundColor: major ? workspace.gridMajor : workspace.grid,
          }}
        />
      ))}
      {lines.h.map(({ y, major }) => (
        <View
          key={`h-${y}`}
          style={{
            position: 'absolute',
            top: y,
            left: 0,
            right: 0,
            height: StyleSheet.hairlineWidth,
            backgroundColor: major ? workspace.gridMajor : workspace.grid,
          }}
        />
      ))}
    </View>
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
    appPlan?.screens.map((s) => s.title).join(' · ') ??
    'Architecture → Design → Screens';

  return (
    <View style={styles.root}>
      <GestureDetector gesture={composed}>
        <View style={styles.viewport}>
          <GestureDetector gesture={panBg}>
            <View style={StyleSheet.absoluteFill}>
              <GridBackground width={width * 2} height={height * 2} />
            </View>
          </GestureDetector>

          <Animated.View style={[styles.world, worldStyle]}>
            {agentOrder.length > 0 ? (
              <View style={styles.flowHint} pointerEvents="none">
                <Text style={styles.flowText}>
                  {projectName.toUpperCase()} · {flow}
                </Text>
              </View>
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
            <View style={styles.emptyOverlay} pointerEvents="box-none">
              <PromptComposer />
            </View>
          ) : null}

          {phase === 'planning' ? (
            <View style={styles.emptyOverlay} pointerEvents="none">
              <View style={styles.planningCard}>
                <Text style={styles.planningTitle}>Planning product…</Text>
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
              <Text style={styles.toolLabel}>
                Previews {darkModePreview ? 'Dark' : 'Light'}
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
  flowHint: {
    position: 'absolute',
    left: 80,
    top: 40,
  },
  flowText: {
    color: workspace.textDim,
    fontSize: 10,
    letterSpacing: 1.2,
    fontFamily: workspace.mono,
  },
  emptyOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[4],
  },
  planningCard: {
    backgroundColor: workspace.panelElevated,
    borderWidth: 1,
    borderColor: workspace.border,
    padding: spacing[6],
    maxWidth: 360,
  },
  planningTitle: {
    color: workspace.text,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    marginBottom: 8,
  },
  planningBody: {
    color: workspace.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  toolbar: {
    position: 'absolute',
    right: spacing[3],
    bottom: spacing[3],
    flexDirection: 'row',
    gap: 8,
  },
  toolBtn: {
    backgroundColor: workspace.panelElevated,
    borderWidth: 1,
    borderColor: workspace.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toolLabel: {
    color: workspace.textMuted,
    fontSize: 11,
    fontFamily: workspace.mono,
  },
});

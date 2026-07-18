import React, { useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { AGENT_ORDER } from '../agents/definitions';
import type { AgentId } from '../agents/types';
import { workspace, spacing, typography } from '../theme/tokens';
import { useWorkspace } from './WorkspaceContext';
import { AgentCard } from './AgentCard';
import { PhonePreview } from './PhonePreview';

function GridBackground({ width, height }: { width: number; height: number }) {
  const lines = useMemo(() => {
    const size = 40;
    const vertical = Math.ceil(width / size) + 2;
    const horizontal = Math.ceil(height / size) + 2;
    const v: number[] = [];
    const h: number[] = [];
    for (let i = 0; i < vertical; i++) v.push(i * size);
    for (let i = 0; i < horizontal; i++) h.push(i * size);
    return { v, h, size };
  }, [width, height]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {lines.v.map((x) => (
        <View
          key={`v-${x}`}
          style={{
            position: 'absolute',
            left: x,
            top: 0,
            bottom: 0,
            width: StyleSheet.hairlineWidth,
            backgroundColor: workspace.grid,
          }}
        />
      ))}
      {lines.h.map((y) => (
        <View
          key={`h-${y}`}
          style={{
            position: 'absolute',
            top: y,
            left: 0,
            right: 0,
            height: StyleSheet.hairlineWidth,
            backgroundColor: workspace.grid,
          }}
        />
      ))}
    </View>
  );
}

export function InfiniteCanvas() {
  const {
    agents,
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
    generate,
  } = useWorkspace();

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

  // Single-finger pan on background only via wrapping background Pressable area
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

  const previews = (['home', 'profile', 'settings'] as const)
    .map((key) => {
      const id = key as AgentId;
      const agent = agents[id];
      if (agent.status !== 'complete' || !agent.screenKey) return null;
      return agent;
    })
    .filter(Boolean);

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
            {/* Connection hints */}
            <View style={styles.flowHint} pointerEvents="none">
              <Text style={styles.flowText}>
                Architecture → Design System → Home → Profile ∥ Settings
              </Text>
            </View>

            {AGENT_ORDER.map((id) => (
              <AgentCard
                key={id}
                agent={agents[id]}
                selected={selectedAgentId === id}
                scale={canvasScale}
                onSelect={() => selectAgent(id)}
                onMove={(x, y) => setAgentPosition(id, x, y)}
              />
            ))}

            {previews.map((agent) =>
              agent ? (
                <PhonePreview
                  key={`preview-${agent.id}`}
                  agentId={agent.id}
                  screenKey={agent.screenKey!}
                  label={`${agent.name} preview`}
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
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>AI design crew on standby</Text>
                <Text style={styles.emptyBody}>
                  Generate runs Architecture and Design System first, ships Home,
                  then Profile and Settings in parallel — all on shared tokens.
                </Text>
                <Pressable
                  onPress={generate}
                  style={({ pressed }) => [
                    styles.cta,
                    { opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Text style={styles.ctaLabel}>Generate project</Text>
                </Pressable>
                <Text style={styles.hint}>
                  Drag agent cards · two-finger pan · pinch to zoom
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
                Previews: {darkModePreview ? 'Dark' : 'Light'}
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
    width: 1600,
    height: 1400,
  },
  flowHint: {
    position: 'absolute',
    left: 80,
    top: 40,
  },
  flowText: {
    color: workspace.textDim,
    fontSize: 11,
    letterSpacing: 0.6,
    fontFamily: 'monospace',
  },
  emptyOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    maxWidth: 420,
    backgroundColor: workspace.panelElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: workspace.border,
    padding: spacing[6],
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  emptyTitle: {
    color: workspace.text,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    letterSpacing: -0.4,
    marginBottom: spacing[2],
  },
  emptyBody: {
    color: workspace.textMuted,
    fontSize: typography.size.sm,
    lineHeight: 20,
    marginBottom: spacing[5],
  },
  cta: {
    backgroundColor: workspace.accent,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  ctaLabel: {
    color: '#07080C',
    fontWeight: typography.weight.bold,
    fontSize: typography.size.md,
  },
  hint: {
    marginTop: spacing[4],
    color: workspace.textDim,
    fontSize: 11,
    textAlign: 'center',
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
    borderRadius: 8,
  },
  toolLabel: {
    color: workspace.textMuted,
    fontSize: 12,
    fontWeight: typography.weight.medium,
  },
});

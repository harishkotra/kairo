import React, { useEffect, useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Line } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import type { ProjectArtifact } from '../agents/types';
import { layoutArtifactPositions } from '../artifacts/graph';
import { workspace, radius, spacing, typography } from '../theme/tokens';
import { useDisplayState } from './useDisplayState';
import { useWorkspace } from './WorkspaceContext';
import { ArtifactInspector } from './ArtifactInspector';

const TYPE_ICON: Record<ProjectArtifact['type'], string> = {
  file: 'FILE',
  component: 'CMP',
  screen: 'SCR',
  token: 'TOK',
  layout: 'LAY',
};

function reuseCount(node: ProjectArtifact, nodes: ProjectArtifact[]): number {
  return nodes.filter((n) => n.dependsOn.includes(node.id)).length;
}

function ArtifactNode({
  n,
  p,
  color,
  selected,
  reuse,
  index,
  agentName,
  onPress,
}: {
  n: ProjectArtifact;
  p: { x: number; y: number };
  color: string;
  selected: boolean;
  reuse: number;
  index: number;
  agentName: string;
  onPress: () => void;
}) {
  const appear = useSharedValue(0);
  useEffect(() => {
    appear.value = 0;
    appear.value = withDelay(
      Math.min(index * 40, 400),
      withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) })
    );
  }, [n.id, appear, index]);

  const style = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [
      { translateY: (1 - appear.value) * 10 },
      { scale: 0.94 + appear.value * 0.06 },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.node,
        style,
        {
          left: p.x,
          top: p.y,
          borderColor: selected ? color : workspace.border,
          backgroundColor: selected ? color + '18' : workspace.panelElevated,
        },
      ]}
    >
      <Pressable onPress={onPress}>
        <View style={styles.nodeTop}>
          <Text style={[styles.nodeType, { color }]}>
            {TYPE_ICON[n.type]}
          </Text>
          <Text style={styles.ver}>v{n.version}</Text>
          {reuse > 0 ? <Text style={styles.reuse}>×{reuse}</Text> : null}
        </View>
        <Text style={styles.nodeName} numberOfLines={1}>
          {n.name}
        </Text>
        <Text style={styles.nodeAgent} numberOfLines={1}>
          {agentName}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function ArtifactGraphView() {
  const {
    selectedArtifactId,
    selectArtifact,
    selectAgent,
    setView,
    artifactGraph,
  } = useWorkspace();
  const { agents, artifacts, isReplayView } = useDisplayState();

  // Prefer display artifacts (replay-aware); edges from live graph filtered by visible nodes
  const nodes = artifacts;
  const positions = useMemo(() => layoutArtifactPositions(nodes), [nodes]);
  const nodeIds = useMemo(() => new Set(nodes.map((n) => n.id)), [nodes]);

  const visibleEdges = useMemo(() => {
    return artifactGraph.edges.filter(
      (e) => nodeIds.has(e.from) && nodeIds.has(e.to)
    );
  }, [artifactGraph.edges, nodeIds]);

  const mostReused = useMemo(() => {
    return [...nodes]
      .filter((n) => n.type === 'component' || n.type === 'token')
      .map((n) => ({ node: n, count: reuseCount(n, nodes) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [nodes]);

  const canvasW = 1100;
  const canvasH = 520;

  if (nodes.length === 0) {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>ARTIFACTS</Text>
            <Text style={styles.heading}>Artifact graph</Text>
          </View>
        </View>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Nothing shipped yet</Text>
          <Text style={styles.emptyBody}>
            As agents finish, files and components appear as a dependency graph
            — reuse becomes visible, not agent-to-agent arrows.
            {isReplayView ? ' Scrub replay forward to reveal artifacts.' : ''}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>ARTIFACTS</Text>
          <Text style={styles.heading}>Artifact graph</Text>
          <Text style={styles.sub}>
            {nodes.length} nodes · {visibleEdges.length} edges · click for live
            inspector
            {isReplayView ? ' · replay' : ''}
          </Text>
        </View>
        <View style={styles.legend}>
          {(['token', 'component', 'screen', 'layout', 'file'] as const).map(
            (t) => (
              <View key={t} style={styles.legendItem}>
                <Text style={styles.legendTag}>{TYPE_ICON[t]}</Text>
                <Text style={styles.legendLabel}>{t}</Text>
              </View>
            )
          )}
        </View>
      </View>

      <View style={styles.body}>
        <ScrollView
          horizontal
          style={styles.graphScroll}
          contentContainerStyle={{ minWidth: canvasW }}
        >
          <ScrollView contentContainerStyle={{ minHeight: canvasH }}>
            <View style={{ width: canvasW, height: canvasH }}>
              <Svg
                width={canvasW}
                height={canvasH}
                style={StyleSheet.absoluteFill}
              >
                {visibleEdges.map((e) => {
                  const a = positions[e.from];
                  const b = positions[e.to];
                  if (!a || !b) return null;
                  const x1 = a.x + 80;
                  const y1 = a.y + 28;
                  const x2 = b.x + 80;
                  const y2 = b.y + 28;
                  const isUses = e.kind === 'uses';
                  return (
                    <Line
                      key={e.id}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={
                        isUses
                          ? 'rgba(212, 165, 116, 0.35)'
                          : 'rgba(126, 184, 201, 0.28)'
                      }
                      strokeWidth={isUses ? 1.5 : 1}
                      strokeDasharray={isUses ? '4 3' : undefined}
                    />
                  );
                })}
              </Svg>

              {nodes.map((n, index) => {
                const p = positions[n.id] ?? { x: 0, y: 0 };
                const color = agents[n.agentId]?.color ?? workspace.accent;
                const selectedNode = selectedArtifactId === n.id;
                const reuse = reuseCount(n, nodes);
                return (
                  <ArtifactNode
                    key={n.id}
                    n={n}
                    p={p}
                    color={color}
                    selected={selectedNode}
                    reuse={reuse}
                    index={index}
                    agentName={agents[n.agentId]?.name ?? n.agentId}
                    onPress={() => {
                      selectArtifact(n.id);
                      selectAgent(n.agentId);
                    }}
                  />
                );
              })}
            </View>
          </ScrollView>
        </ScrollView>

        <View style={styles.side}>
          {selectedArtifactId ? (
            <ArtifactInspector compact />
          ) : (
            <>
              <Text style={styles.sideTitle}>Most reused</Text>
              {mostReused.map(({ node, count }) => (
                <Pressable
                  key={node.id}
                  onPress={() => {
                    selectArtifact(node.id);
                    selectAgent(node.agentId);
                  }}
                  style={styles.reuseRow}
                >
                  <Text style={styles.reuseName}>{node.name}</Text>
                  <Text style={styles.reuseMeta}>
                    {count} consumer{count === 1 ? '' : 's'} · v{node.version}
                  </Text>
                </Pressable>
              ))}
              <Text style={styles.hint}>
                Tap a node for Phase 7 inspector: creator, consumers, version,
                dependencies.
              </Text>
            </>
          )}

          <Pressable onPress={() => setView('canvas')} style={styles.back}>
            <Text style={styles.backText}>← Canvas</Text>
          </Pressable>
        </View>
      </View>
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
    alignItems: 'flex-start',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: workspace.border,
    gap: spacing[4],
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
  sub: {
    color: workspace.textDim,
    fontSize: 11,
    fontFamily: workspace.mono,
    marginTop: 4,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
    maxWidth: 320,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendTag: {
    color: workspace.accent,
    fontSize: 9,
    fontFamily: workspace.mono,
    fontWeight: typography.weight.bold,
  },
  legendLabel: {
    color: workspace.textDim,
    fontSize: 10,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
  },
  graphScroll: {
    flex: 1,
  },
  node: {
    position: 'absolute',
    width: 160,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing[2],
  },
  nodeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  nodeType: {
    fontSize: 9,
    fontFamily: workspace.mono,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.8,
  },
  ver: {
    color: workspace.textDim,
    fontSize: 9,
    fontFamily: workspace.mono,
    flex: 1,
  },
  reuse: {
    color: workspace.accentHot,
    fontSize: 10,
    fontFamily: workspace.mono,
  },
  nodeName: {
    color: workspace.text,
    fontSize: 12,
    fontWeight: typography.weight.semibold,
  },
  nodeAgent: {
    color: workspace.textDim,
    fontSize: 10,
    marginTop: 2,
  },
  side: {
    width: 260,
    borderLeftWidth: 1,
    borderLeftColor: workspace.border,
    backgroundColor: workspace.panel,
    padding: spacing[3],
  },
  sideTitle: {
    color: workspace.textDim,
    fontSize: 10,
    fontFamily: workspace.mono,
    letterSpacing: 1,
    fontWeight: typography.weight.bold,
    marginBottom: spacing[2],
  },
  reuseRow: {
    borderWidth: 1,
    borderColor: workspace.border,
    padding: spacing[2],
    marginBottom: 6,
    borderRadius: radius.sm,
  },
  reuseName: {
    color: workspace.text,
    fontSize: 12,
    fontWeight: typography.weight.medium,
  },
  reuseMeta: {
    color: workspace.textDim,
    fontSize: 10,
    fontFamily: workspace.mono,
    marginTop: 2,
  },
  hint: {
    color: workspace.textDim,
    fontSize: 12,
    lineHeight: 17,
    marginTop: spacing[4],
  },
  back: {
    marginTop: spacing[4],
    paddingTop: spacing[3],
  },
  backText: {
    color: workspace.accentCool,
    fontSize: 12,
    fontWeight: typography.weight.semibold,
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
    maxWidth: 380,
    lineHeight: 20,
  },
});

import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { workspace, radius, spacing, typography } from '../theme/tokens';
import type { WorkspaceView } from '../agents/types';
import { formatTokens, formatUsd } from './format';
import { useWorkspace } from './WorkspaceContext';

const VIEWS: { id: WorkspaceView; label: string }[] = [
  { id: 'canvas', label: 'Canvas' },
  { id: 'dag', label: 'DAG' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'artifacts', label: 'Artifacts' },
  { id: 'decisions', label: 'Decisions' },
  { id: 'memory', label: 'Memory' },
  { id: 'metrics', label: 'Metrics' },
];

export function TopBar() {
  const router = useRouter();
  const {
    projectName,
    phase,
    isGenerating,
    generate,
    reset,
    exportProject,
    view,
    setView,
    useMockAi,
    setUseMockAi,
    liveAiAvailable,
    totals,
    replayActive,
    setReplayActive,
    runDurationMs,
    setReplayCursorMs,
    setReplayPlaying,
    laminarTelemetry,
  } = useWorkspace();

  return (
    <View style={styles.bar}>
      <View style={styles.left}>
        <View style={styles.logoMark}>
          <View style={styles.logoBar} />
          <View style={[styles.logoBar, styles.logoBar2]} />
          <View style={[styles.logoBar, styles.logoBar3]} />
        </View>
        <View>
          <Text style={styles.brand}>KAIRO</Text>
          <Text style={styles.project}>{projectName}</Text>
        </View>

        <View style={styles.pill}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor:
                  phase === 'complete'
                    ? workspace.success
                    : phase === 'running'
                      ? workspace.accentHot
                      : workspace.textDim,
              },
            ]}
          />
          <Text style={styles.pillText}>
            {phase === 'idle'
              ? 'Ready'
              : phase === 'planning'
                ? 'Planning'
                : phase === 'running'
                  ? 'Building'
                  : phase === 'exporting'
                    ? 'Exporting'
                    : 'Complete'}
          </Text>
        </View>

        <View style={styles.stats}>
          <Text style={styles.stat}>
            {formatTokens(totals.tokens)} tok
          </Text>
          <Text style={styles.statSep}>·</Text>
          <Text style={styles.stat}>{formatUsd(totals.costUsd)}</Text>
          <Text style={styles.statSep}>·</Text>
          <Text style={styles.stat}>{totals.events} ev</Text>
          <Text style={styles.statSep}>·</Text>
          <Text style={styles.stat}>{totals.decisions} dec</Text>
          <Text style={styles.statSep}>·</Text>
          <Text style={styles.stat}>{totals.memories} mem</Text>
          {laminarTelemetry.hasKey ? (
            <>
              <Text style={styles.statSep}>·</Text>
              <Text
                style={[
                  styles.stat,
                  {
                    color: laminarTelemetry.enabled
                      ? workspace.success
                      : workspace.amber,
                  },
                ]}
              >
                {laminarTelemetry.enabled ? 'lmnr' : 'lmnr?'}
              </Text>
            </>
          ) : null}
        </View>
      </View>

      <View style={styles.center}>
        {VIEWS.map((v) => {
          const active = view === v.id;
          return (
            <Pressable
              key={v.id}
              onPress={() => setView(v.id)}
              style={[styles.viewTab, active && styles.viewTabActive]}
            >
              <Text
                style={[
                  styles.viewTabLabel,
                  active && styles.viewTabLabelActive,
                ]}
              >
                {v.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={() => {
            if (phase === 'running') return;
            if (!replayActive) {
              setReplayActive(true);
              setReplayCursorMs(0);
              setReplayPlaying(false);
            } else {
              setReplayActive(false);
              setReplayPlaying(false);
              setReplayCursorMs(runDurationMs);
            }
          }}
          style={[
            styles.modeToggle,
            replayActive && { borderColor: workspace.accentHot + '66' },
          ]}
        >
          <View
            style={[
              styles.modeDot,
              {
                backgroundColor: replayActive
                  ? workspace.accentHot
                  : workspace.textDim,
              },
            ]}
          />
          <Text
            style={[
              styles.modeLabel,
              replayActive && { color: workspace.accentHot },
            ]}
          >
            {replayActive ? 'Replay on' : 'Replay'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setUseMockAi(!useMockAi)}
          style={[
            styles.modeToggle,
            !useMockAi && styles.modeToggleLive,
          ]}
        >
          <View
            style={[
              styles.modeDot,
              {
                backgroundColor: useMockAi
                  ? workspace.textDim
                  : workspace.success,
              },
            ]}
          />
          <Text style={styles.modeLabel}>
            {useMockAi ? 'Mock AI' : 'Live AI'}
          </Text>
          {!liveAiAvailable && !useMockAi ? null : null}
        </Pressable>

        {phase !== 'idle' ? (
          <Pressable
            onPress={reset}
            style={({ pressed }) => [
              styles.btnGhost,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="refresh" size={15} color={workspace.textMuted} />
            <Text style={styles.btnGhostLabel}>Reset</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => generate()}
          disabled={isGenerating}
          style={({ pressed }) => [
            styles.btnPrimary,
            {
              opacity: isGenerating ? 0.7 : pressed ? 0.88 : 1,
            },
          ]}
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color={workspace.bg} />
          ) : (
            <Ionicons name="play" size={15} color={workspace.bg} />
          )}
          <Text style={styles.btnPrimaryLabel}>
            {isGenerating ? 'Building…' : 'Build'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/preview')}
          style={({ pressed }) => [
            styles.btnSecondary,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Ionicons
            name="phone-portrait-outline"
            size={15}
            color={workspace.accentCool}
          />
          <Text
            style={[styles.btnSecondaryLabel, { color: workspace.accentCool }]}
          >
            Preview
          </Text>
        </Pressable>

        <Pressable
          onPress={exportProject}
          disabled={phase !== 'complete' && phase !== 'exporting'}
          style={({ pressed }) => [
            styles.btnSecondary,
            {
              opacity:
                phase !== 'complete' && phase !== 'exporting'
                  ? 0.35
                  : pressed
                    ? 0.8
                    : 1,
            },
          ]}
        >
          <Ionicons
            name="download-outline"
            size={15}
            color={workspace.success}
          />
          <Text
            style={[styles.btnSecondaryLabel, { color: workspace.success }]}
          >
            Export
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
    backgroundColor: workspace.panel,
    borderBottomWidth: 1,
    borderBottomColor: workspace.border,
    zIndex: 20,
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    flexShrink: 1,
  },
  logoMark: {
    width: 26,
    height: 26,
    borderWidth: 1,
    borderColor: workspace.border,
    backgroundColor: workspace.panelElevated,
    padding: 5,
    justifyContent: 'space-between',
  },
  logoBar: {
    height: 2,
    backgroundColor: workspace.accent,
    width: '100%',
  },
  logoBar2: {
    backgroundColor: workspace.accentCool,
    width: '70%',
  },
  logoBar3: {
    backgroundColor: workspace.accentHot,
    width: '40%',
  },
  brand: {
    color: workspace.accent,
    fontSize: 9,
    fontWeight: typography.weight.bold,
    letterSpacing: 2,
    fontFamily: workspace.mono,
  },
  project: {
    color: workspace.text,
    fontSize: 14,
    fontWeight: typography.weight.semibold,
    letterSpacing: -0.2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: workspace.border,
    backgroundColor: workspace.panelElevated,
  },
  statusDot: {
    width: 6,
    height: 6,
  },
  pillText: {
    color: workspace.textMuted,
    fontSize: 11,
    fontFamily: workspace.mono,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stat: {
    color: workspace.textDim,
    fontSize: 10,
    fontFamily: workspace.mono,
  },
  statSep: {
    color: workspace.border,
    fontSize: 10,
  },
  center: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: workspace.border,
    backgroundColor: workspace.bg,
  },
  viewTab: {
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  viewTabActive: {
    backgroundColor: workspace.accentSoft,
  },
  viewTabLabel: {
    color: workspace.textDim,
    fontSize: 12,
    fontWeight: typography.weight.medium,
  },
  viewTabLabelActive: {
    color: workspace.accent,
    fontWeight: typography.weight.semibold,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  modeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: workspace.border,
    backgroundColor: workspace.panelElevated,
  },
  modeToggleLive: {
    borderColor: workspace.success + '66',
  },
  modeDot: {
    width: 6,
    height: 6,
  },
  modeLabel: {
    color: workspace.textMuted,
    fontSize: 11,
    fontFamily: workspace.mono,
    fontWeight: typography.weight.medium,
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: workspace.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  btnPrimaryLabel: {
    color: workspace.bg,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
  },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: workspace.panelElevated,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: workspace.border,
  },
  btnSecondaryLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  btnGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  btnGhostLabel: {
    color: workspace.textMuted,
    fontSize: typography.size.sm,
  },
});

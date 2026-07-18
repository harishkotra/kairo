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
import { useWorkspace } from './WorkspaceContext';

export function TopBar() {
  const router = useRouter();
  const { projectName, phase, isGenerating, generate, reset, exportProject } =
    useWorkspace();

  return (
    <View style={styles.bar}>
      <View style={styles.left}>
        <View style={styles.logoMark}>
          <View style={styles.logoDot} />
          <View style={[styles.logoDot, styles.logoDot2]} />
        </View>
        <View>
          <Text style={styles.brand}>EXPO MACHINES</Text>
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
                      ? workspace.amber
                      : workspace.textDim,
              },
            ]}
          />
          <Text style={styles.pillText}>
            {phase === 'idle'
              ? 'Ready'
              : phase === 'running'
                ? 'Agents live'
                : phase === 'exporting'
                  ? 'Exporting…'
                  : 'Complete'}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        {phase !== 'idle' ? (
          <Pressable
            onPress={reset}
            style={({ pressed }) => [
              styles.btnGhost,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="refresh" size={16} color={workspace.textMuted} />
            <Text style={styles.btnGhostLabel}>Reset</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={generate}
          disabled={isGenerating}
          style={({ pressed }) => [
            styles.btnPrimary,
            {
              opacity: isGenerating ? 0.7 : pressed ? 0.88 : 1,
            },
          ]}
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color="#07080C" />
          ) : (
            <Ionicons name="play" size={16} color="#07080C" />
          )}
          <Text style={styles.btnPrimaryLabel}>
            {isGenerating ? 'Generating…' : 'Generate'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/preview')}
          style={({ pressed }) => [
            styles.btnSecondary,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Ionicons name="phone-portrait-outline" size={16} color={workspace.accent} />
          <Text style={styles.btnSecondaryLabel}>Live Preview</Text>
        </Pressable>

        <Pressable
          onPress={exportProject}
          disabled={phase !== 'complete' && phase !== 'exporting'}
          style={({ pressed }) => [
            styles.btnSecondary,
            {
              opacity:
                phase !== 'complete' && phase !== 'exporting'
                  ? 0.4
                  : pressed
                    ? 0.8
                    : 1,
            },
          ]}
        >
          <Ionicons name="download-outline" size={16} color={workspace.mint} />
          <Text style={[styles.btnSecondaryLabel, { color: workspace.mint }]}>
            Export to Expo
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    backgroundColor: workspace.panel,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: workspace.border,
    zIndex: 20,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  logoMark: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: workspace.panelElevated,
    borderWidth: 1,
    borderColor: workspace.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 3,
  },
  logoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: workspace.accent,
  },
  logoDot2: {
    backgroundColor: workspace.violet,
    marginTop: 4,
  },
  brand: {
    color: workspace.textDim,
    fontSize: 9,
    fontWeight: typography.weight.semibold,
    letterSpacing: 1.6,
  },
  project: {
    color: workspace.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    letterSpacing: -0.2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: spacing[2],
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: workspace.panelElevated,
    borderWidth: 1,
    borderColor: workspace.border,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    color: workspace.textMuted,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: workspace.accent,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.sm,
  },
  btnPrimaryLabel: {
    color: '#07080C',
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
  },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: workspace.panelElevated,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: workspace.border,
  },
  btnSecondaryLabel: {
    color: workspace.accent,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  btnGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  btnGhostLabel: {
    color: workspace.textMuted,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
});

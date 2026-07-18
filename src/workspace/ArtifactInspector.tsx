import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ProjectArtifact } from '../agents/types';
import { agentName } from '../agents/definitions';
import { workspace, radius, spacing, typography } from '../theme/tokens';
import { formatClock } from './format';
import { useDisplayState } from './useDisplayState';
import { useWorkspace } from './WorkspaceContext';

/**
 * Phase 7 — live artifact inspector (created by, used in, version, deps).
 */
export function ArtifactInspector({
  compact,
}: {
  compact?: boolean;
}) {
  const {
    selectedArtifactId,
    selectArtifact,
    selectAgent,
    setView,
  } = useWorkspace();
  const { artifacts, agents } = useDisplayState();

  const node = artifacts.find((a) => a.id === selectedArtifactId) ?? null;

  const usedIn = useMemo(() => {
    if (!node) return [] as ProjectArtifact[];
    return artifacts.filter((a) => a.dependsOn.includes(node.id));
  }, [node, artifacts]);

  const deps = useMemo(() => {
    if (!node) return [] as ProjectArtifact[];
    return node.dependsOn
      .map((id) => artifacts.find((a) => a.id === id))
      .filter(Boolean) as ProjectArtifact[];
  }, [node, artifacts]);

  if (!node) {
    if (compact) return null;
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyTitle}>Artifact inspector</Text>
        <Text style={styles.emptyBody}>
          Select a file or component on the artifact graph to see creator,
          consumers, version, and dependencies.
        </Text>
      </View>
    );
  }

  const creator = agents[node.agentId];
  const modifier = agents[node.lastModifiedBy];

  return (
    <ScrollView
      style={compact ? styles.compactRoot : styles.root}
      contentContainerStyle={styles.body}
    >
      <View style={styles.header}>
        <View style={[styles.typePill, { borderColor: creator?.color ?? workspace.accent }]}>
          <Text style={[styles.typeText, { color: creator?.color ?? workspace.accent }]}>
            {node.type.toUpperCase()}
          </Text>
        </View>
        <Pressable onPress={() => selectArtifact(null)} hitSlop={8}>
          <Ionicons name="close" size={16} color={workspace.textDim} />
        </Pressable>
      </View>

      <Text style={styles.name}>{node.name}</Text>
      <Text style={styles.path}>{node.path}</Text>

      <Row label="Created by" value={agentName(node.agentId)} />
      <Row
        label="Created at"
        value={formatClock(node.createdAt)}
        mono
      />
      <Row label="Version" value={`v${node.version}`} mono />
      <Row
        label="Last modified"
        value={`${agentName(node.lastModifiedBy)} · ${formatClock(node.lastModifiedAt)}`}
      />

      <Text style={styles.section}>USED IN</Text>
      {usedIn.length === 0 ? (
        <Text style={styles.muted}>No consumers yet in this run</Text>
      ) : (
        usedIn.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => {
              selectArtifact(c.id);
              selectAgent(c.agentId);
            }}
            style={styles.linkRow}
          >
            <Ionicons
              name="arrow-forward"
              size={12}
              color={workspace.accentCool}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.linkName}>{c.name}</Text>
              <Text style={styles.linkMeta}>
                {agentName(c.agentId)} · {c.type}
              </Text>
            </View>
          </Pressable>
        ))
      )}

      <Text style={styles.section}>DEPENDENCIES</Text>
      {deps.length === 0 ? (
        <Text style={styles.muted}>No upstream artifacts</Text>
      ) : (
        deps.map((d) => (
          <Pressable
            key={d.id}
            onPress={() => {
              selectArtifact(d.id);
              selectAgent(d.agentId);
            }}
            style={styles.linkRow}
          >
            <Ionicons
              name="git-commit-outline"
              size={12}
              color={workspace.accent}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.linkName}>{d.name}</Text>
              <Text style={styles.linkMeta}>{d.path}</Text>
            </View>
          </Pressable>
        ))
      )}

      <Pressable
        onPress={() => {
          selectAgent(node.agentId);
          setView('canvas');
        }}
        style={styles.cta}
      >
        <Text style={styles.ctaLabel}>Inspect {agentName(node.agentId)} agent</Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          mono && { fontFamily: workspace.mono, fontSize: 11 },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: workspace.panel,
  },
  compactRoot: {
    maxHeight: 420,
  },
  body: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  typePill: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeText: {
    fontSize: 10,
    fontFamily: workspace.mono,
    fontWeight: typography.weight.bold,
    letterSpacing: 1,
  },
  name: {
    color: workspace.text,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
  },
  path: {
    color: workspace.textDim,
    fontSize: 11,
    fontFamily: workspace.mono,
    marginTop: 4,
    marginBottom: spacing[4],
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: workspace.borderSubtle,
  },
  rowLabel: {
    color: workspace.textDim,
    fontSize: 11,
  },
  rowValue: {
    color: workspace.text,
    fontSize: 12,
    flex: 1,
    textAlign: 'right',
  },
  section: {
    color: workspace.accent,
    fontSize: 10,
    fontFamily: workspace.mono,
    letterSpacing: 1.2,
    fontWeight: typography.weight.bold,
    marginTop: spacing[5],
    marginBottom: spacing[2],
  },
  muted: {
    color: workspace.textDim,
    fontSize: 12,
  },
  linkRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: workspace.borderSubtle,
  },
  linkName: {
    color: workspace.text,
    fontSize: 13,
    fontWeight: typography.weight.medium,
  },
  linkMeta: {
    color: workspace.textDim,
    fontSize: 10,
    fontFamily: workspace.mono,
  },
  cta: {
    marginTop: spacing[5],
    borderWidth: 1,
    borderColor: workspace.border,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: workspace.panelElevated,
  },
  ctaLabel: {
    color: workspace.accentCool,
    fontSize: 12,
    fontWeight: typography.weight.semibold,
  },
  emptyBox: {
    padding: spacing[4],
  },
  emptyTitle: {
    color: workspace.text,
    fontSize: 14,
    fontWeight: typography.weight.semibold,
    marginBottom: 6,
  },
  emptyBody: {
    color: workspace.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
});

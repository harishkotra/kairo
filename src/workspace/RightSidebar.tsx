import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { workspace, radius, spacing, typography } from '../theme/tokens';
import { useWorkspace } from './WorkspaceContext';

export function RightSidebar() {
  const { agents, selectedAgentId, artifacts } = useWorkspace();
  const agent = selectedAgentId ? agents[selectedAgentId] : null;
  const agentArtifacts = artifacts.filter(
    (a) => selectedAgentId && a.agentId === selectedAgentId
  );

  if (!agent) {
    return (
      <View style={styles.sidebar}>
        <Text style={styles.heading}>Inspector</Text>
        <Text style={styles.empty}>
          Select an agent card on the canvas to inspect task progress, files,
          and components.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.sidebar}>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: agent.color + '22' }]}>
          <Ionicons
            name={agent.icon as keyof typeof Ionicons.glyphMap}
            size={18}
            color={agent.color}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>{agent.name}</Text>
          <Text style={styles.role}>{agent.role}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.sectionLabel}>CURRENT TASK</Text>
        <View style={styles.taskBox}>
          <Text style={styles.taskText}>{agent.currentTask}</Text>
          <View style={styles.progressMeta}>
            <Text style={styles.progressPct}>{agent.progress}%</Text>
            <Text style={styles.statusTag}>{agent.status.toUpperCase()}</Text>
          </View>
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
        </View>

        <Text style={styles.sectionLabel}>PIPELINE STEPS</Text>
        <View style={styles.steps}>
          {agent.steps.map((step, i) => {
            const done = agent.currentStepIndex > i || agent.status === 'complete';
            const active = agent.currentStepIndex === i && agent.status === 'running';
            return (
              <View key={step.id} style={styles.stepRow}>
                <View
                  style={[
                    styles.stepDot,
                    {
                      backgroundColor: done
                        ? agent.color
                        : active
                          ? agent.color + '88'
                          : workspace.border,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.stepLabel,
                    {
                      color:
                        done || active ? workspace.text : workspace.textDim,
                      fontWeight: active
                        ? typography.weight.semibold
                        : typography.weight.regular,
                    },
                  ]}
                >
                  {step.label}
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>FILES CREATED</Text>
        {agentArtifacts.filter((a) => a.type !== 'component').length === 0 ? (
          <Text style={styles.emptySmall}>No files yet</Text>
        ) : (
          agentArtifacts
            .filter((a) => a.type !== 'component')
            .map((f) => (
              <View key={f.path} style={styles.fileRow}>
                <Ionicons
                  name="document-text-outline"
                  size={14}
                  color={workspace.accent}
                />
                <Text style={styles.filePath} numberOfLines={1}>
                  {f.path}
                </Text>
              </View>
            ))
        )}

        <Text style={[styles.sectionLabel, { marginTop: spacing[4] }]}>
          COMPONENTS CREATED
        </Text>
        {agent.components.length === 0 ? (
          <Text style={styles.emptySmall}>None for this agent</Text>
        ) : (
          agent.components.map((c) => {
            const shipped =
              agent.status === 'complete' ||
              agentArtifacts.some((a) => a.name === c);
            return (
              <View key={c} style={styles.fileRow}>
                <Ionicons
                  name="cube-outline"
                  size={14}
                  color={shipped ? workspace.violet : workspace.textDim}
                />
                <Text
                  style={[
                    styles.filePath,
                    { color: shipped ? workspace.text : workspace.textDim },
                  ]}
                >
                  {c}
                </Text>
              </View>
            );
          })
        )}

        <Text style={[styles.sectionLabel, { marginTop: spacing[4] }]}>
          ABOUT
        </Text>
        <Text style={styles.about}>{agent.description}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 280,
    backgroundColor: workspace.panel,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: workspace.border,
    paddingTop: spacing[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    marginBottom: spacing[4],
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    color: workspace.text,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    letterSpacing: -0.3,
  },
  role: {
    color: workspace.textMuted,
    fontSize: typography.size.sm,
    marginTop: 2,
  },
  body: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[10],
  },
  sectionLabel: {
    color: workspace.textDim,
    fontSize: 10,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.2,
    marginBottom: spacing[2],
    marginTop: spacing[2],
  },
  taskBox: {
    backgroundColor: workspace.panelElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: workspace.border,
    padding: spacing[3],
    marginBottom: spacing[4],
  },
  taskText: {
    color: workspace.text,
    fontSize: typography.size.sm,
    lineHeight: 20,
    marginBottom: spacing[3],
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  progressPct: {
    color: workspace.accent,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
  },
  statusTag: {
    color: workspace.textDim,
    fontSize: 10,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.8,
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: workspace.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  steps: {
    gap: 8,
    marginBottom: spacing[4],
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepLabel: {
    fontSize: typography.size.sm,
    flex: 1,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  filePath: {
    color: workspace.textMuted,
    fontSize: 12,
    fontFamily: 'monospace',
    flex: 1,
  },
  empty: {
    color: workspace.textDim,
    fontSize: typography.size.sm,
    lineHeight: 20,
    paddingHorizontal: spacing[4],
  },
  emptySmall: {
    color: workspace.textDim,
    fontSize: typography.size.sm,
    marginBottom: spacing[2],
  },
  about: {
    color: workspace.textMuted,
    fontSize: typography.size.sm,
    lineHeight: 20,
  },
});

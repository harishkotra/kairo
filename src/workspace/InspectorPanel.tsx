import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { agentName } from '../agents/definitions';
import { workspace, radius, spacing, typography } from '../theme/tokens';
import { formatClock, formatDuration, formatTokens, formatUsd } from './format';
import { useDisplayState } from './useDisplayState';
import { useWorkspace } from './WorkspaceContext';

function MetaRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text
        style={[
          styles.metaValue,
          mono && { fontFamily: workspace.mono, fontSize: 11 },
        ]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      {children}
    </View>
  );
}

/**
 * Horizontal bar breakdown of token usage across every agent, with the
 * inspected agent highlighted — where did the inference budget go?
 */
function TokensByAgent({
  agents,
  selectedId,
}: {
  agents: ReturnType<typeof useDisplayState>['agents'];
  selectedId: string;
}) {
  const { selectAgent } = useWorkspace();
  const rows = Object.values(agents)
    .filter((a) => a.tokenUsage.total > 0)
    .sort((a, b) => b.tokenUsage.total - a.tokenUsage.total);
  if (rows.length === 0) return null;
  const max = rows[0].tokenUsage.total;

  return (
    <Section title="TOKENS BY AGENT">
      {rows.map((a) => {
        const selected = a.id === selectedId;
        return (
          <Pressable
            key={a.id}
            onPress={() => selectAgent(a.id)}
            style={[styles.tokRow, selected && styles.tokRowSelected]}
          >
            <Text
              style={[styles.tokName, selected && { color: workspace.text }]}
              numberOfLines={1}
            >
              {a.name}
            </Text>
            <View style={styles.tokTrack}>
              <View
                style={[
                  styles.tokFill,
                  {
                    width: `${Math.max(3, (a.tokenUsage.total / max) * 100)}%`,
                    backgroundColor: a.color,
                    opacity: selected ? 1 : 0.55,
                  },
                ]}
              />
            </View>
            <Text style={styles.tokValue}>
              {formatTokens(a.tokenUsage.total)}
            </Text>
          </Pressable>
        );
      })}
    </Section>
  );
}

export function InspectorPanel() {
  const { selectedAgentId, selectArtifact, setView, memories } =
    useWorkspace();
  const { agents, artifacts, decisions, isReplayView } = useDisplayState();
  const agentMemories = memories.filter(
    (m) => selectedAgentId && m.agentId === selectedAgentId
  );
  const agent = selectedAgentId ? agents[selectedAgentId] : null;
  const agentArtifacts = artifacts.filter(
    (a) => selectedAgentId && a.agentId === selectedAgentId
  );
  const agentDecisions = decisions.filter(
    (d) => selectedAgentId && d.agentId === selectedAgentId
  );

  if (!agent) {
    return (
      <View style={styles.sidebar}>
        <View style={styles.rail}>
          <Text style={styles.railMark}>INS</Text>
        </View>
        <View style={styles.pad}>
          <Text style={styles.heading}>Inspector</Text>
          <Text style={styles.empty}>
            Select an agent on the canvas. Status, reasoning, artifacts, and
            cost surface here — not a black box.
          </Text>
        </View>
      </View>
    );
  }

  const parentLabel = agent.parentId
    ? agents[agent.parentId]?.name ?? agentName(agent.parentId)
    : '— (root)';
  const childrenLabel =
    agent.childIds.length > 0
      ? agent.childIds
          .map((c) => agents[c]?.name ?? agentName(c))
          .join(', ')
      : '— (leaf)';
  const depLabel =
    agent.dependsOn.length > 0
      ? agent.dependsOn
          .map((d) => agents[d]?.name ?? agentName(d))
          .join(' → ')
      : 'None';

  const duration =
    agent.durationMs ??
    (agent.startedAt
      ? (agent.completedAt ?? Date.now()) - agent.startedAt
      : undefined);

  return (
    <View style={styles.sidebar}>
      <View style={[styles.rail, { backgroundColor: agent.color + '33' }]}>
        <Text style={[styles.railMark, { color: agent.color }]}>
          {agent.id.slice(0, 3).toUpperCase()}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.header}>
          <View style={[styles.badge, { borderColor: agent.color }]}>
            <Ionicons
              name={agent.icon as keyof typeof Ionicons.glyphMap}
              size={18}
              color={agent.color}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>
              AGENT{isReplayView ? ' · REPLAY' : ''}
            </Text>
            <Text style={styles.heading}>{agent.name}</Text>
            <Text style={styles.role}>{agent.role}</Text>
          </View>
        </View>

        <Section title="GOAL">
          <Text style={styles.prose}>{agent.goal}</Text>
        </Section>

        {agent.vm && agent.vm.status !== 'idle' ? (
          <Section title="AGENT VM">
            <View style={styles.metaGrid}>
              <MetaRow label="Runtime" value={agent.vm.mode === 'agentos' ? 'agentOS' : 'Simulated'} mono />
              <MetaRow label="Status" value={agent.vm.status} mono />
              <MetaRow label="Key" value={agent.vm.key} mono />
              {agent.vm.sessionId ? (
                <MetaRow label="Session" value={agent.vm.sessionId} mono />
              ) : null}
              {agent.vm.endpoint ? (
                <MetaRow label="Endpoint" value={agent.vm.endpoint} mono />
              ) : null}
            </View>
            {agent.vm.filesWritten.length > 0 ? (
              <View style={{ marginTop: 8 }}>
                {agent.vm.filesWritten.map((f) => (
                  <Text key={f} style={styles.filePathList}>
                    {f}
                  </Text>
                ))}
              </View>
            ) : null}
            {agent.vm.lastLog ? (
              <Text style={[styles.proseDim, { marginTop: 8 }]}>
                {agent.vm.lastLog}
              </Text>
            ) : null}
          </Section>
        ) : null}

        <Section title="STATUS">
          <View style={styles.taskBox}>
            <View style={styles.statusLine}>
              <View
                style={[
                  styles.liveDot,
                  {
                    backgroundColor:
                      agent.status === 'running' ||
                      agent.status === 'retrying'
                        ? workspace.accentHot
                        : agent.status === 'complete'
                          ? workspace.success
                          : agent.status === 'blocked'
                            ? '#FBBF24'
                            : agent.status === 'waiting' ||
                                agent.status === 'queued'
                              ? '#60A5FA'
                              : workspace.textDim,
                  },
                ]}
              />
              <Text style={styles.statusWord}>
                {agent.status.toUpperCase()}
              </Text>
              <Text style={styles.pct}>{agent.progress}%</Text>
            </View>
            <Text style={styles.taskText}>{agent.currentTask}</Text>
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
        </Section>

        <Section title="TELEMETRY">
          <View style={styles.metaGrid}>
            <MetaRow
              label="Start"
              value={
                agent.startedAt ? formatClock(agent.startedAt) : '—'
              }
              mono
            />
            <MetaRow
              label="End"
              value={
                agent.completedAt ? formatClock(agent.completedAt) : '—'
              }
              mono
            />
            <MetaRow label="Duration" value={formatDuration(duration)} mono />
            <MetaRow
              label="Confidence"
              value={
                agent.confidence > 0
                  ? `${Math.round(agent.confidence * 100)}%`
                  : '—'
              }
              mono
            />
            <MetaRow
              label="Tokens"
              value={
                agent.tokenUsage.total
                  ? `${formatTokens(agent.tokenUsage.total)} (${agent.tokenUsage.prompt}↑ ${agent.tokenUsage.completion}↓)`
                  : '—'
              }
              mono
            />
            <MetaRow
              label="Est. cost"
              value={formatUsd(agent.estimatedCostUsd)}
              mono
            />
            <MetaRow label="Retries" value={String(agent.retryCount)} mono />
            <MetaRow label="Parent" value={parentLabel} />
            <MetaRow label="Children" value={childrenLabel} />
            <MetaRow label="Depends on" value={depLabel} />
          </View>
        </Section>

        <TokensByAgent
          agents={agents}
          selectedId={agent.id}
        />

        <Section title="REASONING SUMMARY">
          <Text style={styles.prose}>
            {agent.reasoningSummary ||
              (agent.status === 'running'
                ? 'Collecting decision notes…'
                : 'Run the pipeline to capture reasoning.')}
          </Text>
        </Section>

        {agent.warnings.length > 0 ? (
          <Section title="WARNINGS">
            {agent.warnings.map((w) => (
              <View key={w} style={styles.warnRow}>
                <Ionicons
                  name="warning-outline"
                  size={14}
                  color={workspace.amber}
                />
                <Text style={styles.warnText}>{w}</Text>
              </View>
            ))}
          </Section>
        ) : null}

        <Section title="NEXT HANDOFF">
          <Text style={styles.prose}>{agent.nextHandoff}</Text>
        </Section>

        {agentDecisions.length > 0 ? (
          <Section title="DECISIONS">
            {agentDecisions.map((d) => (
              <View key={d.id} style={styles.decisionCard}>
                <Text style={styles.decisionTitle}>{d.decision}</Text>
                <Text style={styles.proseDim} numberOfLines={2}>
                  {d.reason}
                </Text>
                <Text style={styles.decisionMeta}>
                  {Math.round(d.confidence * 100)}% · {d.category}
                </Text>
              </View>
            ))}
            <Text
              style={styles.jumpLink}
              onPress={() => setView('decisions')}
            >
              Open decision explorer →
            </Text>
          </Section>
        ) : null}

        {agentMemories.length > 0 ? (
          <Section title="AGENT MEMORY">
            {agentMemories.slice(0, 6).map((m) => (
              <View key={m.id} style={styles.decisionCard}>
                <Text style={styles.decisionTitle}>{m.title}</Text>
                <Text style={styles.proseDim} numberOfLines={3}>
                  {m.content}
                </Text>
                <Text style={styles.decisionMeta}>
                  {m.kind} · {m.source}
                </Text>
              </View>
            ))}
            <Text style={styles.jumpLink} onPress={() => setView('memory')}>
              Open shared memory →
            </Text>
          </Section>
        ) : null}

        <Section title="PIPELINE STEPS">
          <View style={styles.steps}>
            {agent.steps.map((step, i) => {
              const done =
                agent.currentStepIndex > i || agent.status === 'complete';
              const active =
                agent.currentStepIndex === i && agent.status === 'running';
              return (
                <View key={step.id} style={styles.stepRow}>
                  <Text
                    style={[
                      styles.stepIdx,
                      {
                        color:
                          done || active ? agent.color : workspace.textDim,
                      },
                    ]}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </Text>
                  <Text
                    style={[
                      styles.stepLabel,
                      {
                        color:
                          done || active
                            ? workspace.text
                            : workspace.textDim,
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
        </Section>

        <Section title="ARTIFACTS PRODUCED">
          {agentArtifacts.length === 0 ? (
            <Text style={styles.emptySmall}>None yet</Text>
          ) : (
            agentArtifacts.map((f) => (
              <View key={f.id} style={styles.fileRow}>
                <Ionicons
                  name={
                    f.type === 'component'
                      ? 'cube-outline'
                      : f.type === 'screen'
                        ? 'phone-portrait-outline'
                        : 'document-text-outline'
                  }
                  size={14}
                  color={workspace.accent}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.fileName}>{f.name}</Text>
                  <Text style={styles.filePath} numberOfLines={1}>
                    {f.path}
                  </Text>
                </View>
              </View>
            ))
          )}
        </Section>

        <Section title="COMPONENTS · SCREENS">
          <Text style={styles.proseDim}>
            Components:{' '}
            {agent.components.length ? agent.components.join(', ') : '—'}
          </Text>
          <Text style={[styles.proseDim, { marginTop: 6 }]}>
            Screens:{' '}
            {agent.screens.length ? agent.screens.join(', ') : '—'}
          </Text>
        </Section>

        <Section title="FILES CREATED">
          {agent.files.map((path) => (
            <Text key={path} style={styles.filePathList}>
              {path}
            </Text>
          ))}
        </Section>

        <Section title="DEPENDENCY MAP">
          <Text style={styles.proseDim}>
            Upstream: {depLabel}
          </Text>
          <Text style={[styles.proseDim, { marginTop: 6 }]}>
            Downstream:{' '}
            {agent.childIds.length
              ? agent.childIds
                  .map((c) => agents[c]?.name ?? agentName(c))
                  .join(', ')
              : '—'}
          </Text>
          <Text
            style={[styles.jumpLink, { marginTop: spacing[3] }]}
            onPress={() => {
              const first = agentArtifacts[0];
              if (first) selectArtifact(first.id);
              setView('artifacts');
            }}
          >
            Open artifact graph →
          </Text>
        </Section>

        <Section title="ABOUT">
          <Text style={styles.prose}>{agent.description}</Text>
        </Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 300,
    backgroundColor: workspace.panel,
    borderLeftWidth: 1,
    borderLeftColor: workspace.border,
    flexDirection: 'row',
  },
  rail: {
    width: 22,
    backgroundColor: workspace.borderSubtle,
    alignItems: 'center',
    paddingTop: spacing[4],
  },
  railMark: {
    color: workspace.textDim,
    fontSize: 9,
    fontWeight: typography.weight.bold,
    letterSpacing: 1,
    transform: [{ rotate: '-90deg' }],
    width: 48,
    textAlign: 'center',
    marginTop: 28,
    fontFamily: workspace.mono,
  },
  pad: {
    flex: 1,
    padding: spacing[4],
  },
  body: {
    padding: spacing[4],
    paddingBottom: spacing[10],
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: workspace.panelElevated,
  },
  eyebrow: {
    color: workspace.textDim,
    fontSize: 9,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.4,
    fontFamily: workspace.mono,
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
  empty: {
    color: workspace.textMuted,
    fontSize: typography.size.sm,
    lineHeight: 20,
    marginTop: spacing[3],
  },
  emptySmall: {
    color: workspace.textDim,
    fontSize: typography.size.sm,
  },
  section: {
    marginBottom: spacing[5],
  },
  sectionLabel: {
    color: workspace.accent,
    fontSize: 10,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.2,
    fontFamily: workspace.mono,
    marginBottom: spacing[2],
  },
  prose: {
    color: workspace.text,
    fontSize: typography.size.sm,
    lineHeight: 20,
  },
  proseDim: {
    color: workspace.textMuted,
    fontSize: typography.size.sm,
    lineHeight: 18,
  },
  taskBox: {
    backgroundColor: workspace.panelElevated,
    borderWidth: 1,
    borderColor: workspace.border,
    borderRadius: radius.md,
    padding: spacing[3],
  },
  statusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 1,
  },
  statusWord: {
    color: workspace.textMuted,
    fontSize: 11,
    fontWeight: typography.weight.bold,
    letterSpacing: 1,
    fontFamily: workspace.mono,
    flex: 1,
  },
  pct: {
    color: workspace.text,
    fontSize: 12,
    fontWeight: typography.weight.bold,
    fontFamily: workspace.mono,
  },
  taskText: {
    color: workspace.text,
    fontSize: typography.size.sm,
    marginBottom: spacing[2],
  },
  track: {
    height: 3,
    backgroundColor: workspace.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  metaGrid: {
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: workspace.borderSubtle,
    paddingBottom: 6,
  },
  metaLabel: {
    color: workspace.textDim,
    fontSize: 11,
    width: 88,
  },
  metaValue: {
    color: workspace.text,
    fontSize: 12,
    flex: 1,
    textAlign: 'right',
  },
  warnRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
    alignItems: 'flex-start',
  },
  warnText: {
    color: workspace.amber,
    fontSize: typography.size.sm,
    flex: 1,
    lineHeight: 18,
  },
  steps: { gap: 6 },
  stepRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  stepIdx: {
    fontFamily: workspace.mono,
    fontSize: 11,
    width: 22,
  },
  stepLabel: {
    fontSize: typography.size.sm,
    flex: 1,
    lineHeight: 18,
  },
  fileRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  fileName: {
    color: workspace.text,
    fontSize: 13,
    fontWeight: typography.weight.medium,
  },
  filePath: {
    color: workspace.textDim,
    fontSize: 10,
    fontFamily: workspace.mono,
  },
  filePathList: {
    color: workspace.textMuted,
    fontSize: 11,
    fontFamily: workspace.mono,
    marginBottom: 4,
  },
  jumpLink: {
    color: workspace.accentCool,
    fontSize: 12,
    fontWeight: typography.weight.semibold,
    marginTop: spacing[2],
  },
  decisionCard: {
    borderWidth: 1,
    borderColor: workspace.border,
    padding: spacing[2],
    marginBottom: 8,
    backgroundColor: workspace.panelElevated,
  },
  decisionTitle: {
    color: workspace.text,
    fontSize: 13,
    fontWeight: typography.weight.semibold,
    marginBottom: 4,
  },
  decisionMeta: {
    color: workspace.accentHot,
    fontSize: 10,
    fontFamily: workspace.mono,
    marginTop: 4,
  },
  tokRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  tokRowSelected: {
    backgroundColor: workspace.panelElevated,
  },
  tokName: {
    width: 82,
    color: workspace.textMuted,
    fontSize: 10,
    fontFamily: workspace.mono,
  },
  tokTrack: {
    flex: 1,
    height: 8,
    backgroundColor: workspace.border + '55',
    overflow: 'hidden',
  },
  tokFill: {
    height: 8,
  },
  tokValue: {
    width: 44,
    textAlign: 'right',
    color: workspace.textDim,
    fontSize: 10,
    fontFamily: workspace.mono,
  },
});

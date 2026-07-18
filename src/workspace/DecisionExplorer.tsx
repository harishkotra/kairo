import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { agentName } from '../agents/definitions';
import type { AgentId } from '../agents/types';
import { workspace, spacing, typography } from '../theme/tokens';
import { formatClock } from './format';
import { useDisplayState } from './useDisplayState';
import { useWorkspace } from './WorkspaceContext';

/**
 * Phase 8 — explore recorded engineering decisions.
 */
export function DecisionExplorer() {
  const {
    selectAgent,
    selectDecision,
    selectedDecisionId,
    setView,
    agentOrder,
  } = useWorkspace();
  const { decisions, agents, isReplayView } = useDisplayState();
  const [filterAgent, setFilterAgent] = useState<AgentId | 'all'>('all');

  const filtered = useMemo(() => {
    const list =
      filterAgent === 'all'
        ? decisions
        : decisions.filter((d) => d.agentId === filterAgent);
    return [...list].sort((a, b) => a.ts - b.ts);
  }, [decisions, filterAgent]);

  const selected =
    decisions.find((d) => d.id === selectedDecisionId) ??
    filtered[filtered.length - 1] ??
    null;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>DECISIONS</Text>
          <Text style={styles.heading}>Decision explorer</Text>
          <Text style={styles.sub}>
            {decisions.length} recorded
            {isReplayView ? ' · at replay cursor' : ''}
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        <Chip
          label="All"
          active={filterAgent === 'all'}
          onPress={() => setFilterAgent('all')}
        />
        {agentOrder.map((id) =>
          agents[id] ? (
            <Chip
              key={id}
              label={agents[id].name}
              active={filterAgent === id}
              color={agents[id].color}
              onPress={() => setFilterAgent(id)}
            />
          ) : null
        )}
      </ScrollView>

      {decisions.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No decisions yet</Text>
          <Text style={styles.emptyBody}>
            Build an app from a product brief. Agents record choices
            (navigation, theme, composition) with alternatives and confidence.
          </Text>
        </View>
      ) : (
        <View style={styles.split}>
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
          >
            {filtered.map((d) => {
              const active = selected?.id === d.id;
              const color = agents[d.agentId].color;
              return (
                <Pressable
                  key={d.id}
                  onPress={() => {
                    selectDecision(d.id);
                    selectAgent(d.agentId);
                  }}
                  style={[
                    styles.card,
                    active && {
                      borderColor: color,
                      backgroundColor: color + '14',
                    },
                  ]}
                >
                  <View style={styles.cardTop}>
                    <Text style={[styles.cat, { color }]}>
                      {d.category.toUpperCase()}
                    </Text>
                    <Text style={styles.conf}>
                      {Math.round(d.confidence * 100)}%
                    </Text>
                  </View>
                  <Text style={styles.decision}>{d.decision}</Text>
                  <Text style={styles.meta}>
                    {agents[d.agentId]?.name ?? agentName(d.agentId)} ·{' '}
                    {formatClock(d.ts)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView
            style={styles.detail}
            contentContainerStyle={styles.detailBody}
          >
            {selected ? (
              <>
                <Text style={styles.detailEyebrow}>
                  {(
                    agents[selected.agentId]?.name ?? agentName(selected.agentId)
                  ).toUpperCase()}
                </Text>
                <Text style={styles.detailTitle}>{selected.title}</Text>

                <Text style={styles.fieldLabel}>DECISION</Text>
                <Text style={styles.fieldValueBig}>{selected.decision}</Text>

                <Text style={styles.fieldLabel}>REASON</Text>
                <Text style={styles.fieldValue}>{selected.reason}</Text>

                <Text style={styles.fieldLabel}>ALTERNATIVES</Text>
                {selected.alternatives.length === 0 ? (
                  <Text style={styles.muted}>None recorded</Text>
                ) : (
                  selected.alternatives.map((a) => (
                    <View key={a} style={styles.altRow}>
                      <Text style={styles.altBullet}>○</Text>
                      <Text style={styles.altText}>{a}</Text>
                    </View>
                  ))
                )}

                <Text style={styles.fieldLabel}>CONFIDENCE</Text>
                <View style={styles.confTrack}>
                  <View
                    style={[
                      styles.confFill,
                      {
                        width: `${Math.round(selected.confidence * 100)}%`,
                        backgroundColor: agents[selected.agentId].color,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.confNum}>
                  {Math.round(selected.confidence * 100)}%
                </Text>

                <Pressable
                  onPress={() => {
                    selectAgent(selected.agentId);
                    setView('dag');
                  }}
                  style={styles.linkBtn}
                >
                  <Text style={styles.linkBtnText}>
                    View{' '}
                    {agents[selected.agentId]?.name ??
                      agentName(selected.agentId)}{' '}
                    on DAG →
                  </Text>
                </Pressable>
              </>
            ) : (
              <Text style={styles.muted}>Select a decision</Text>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
  color,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active && {
          backgroundColor: (color ?? workspace.accent) + '22',
          borderColor: color ?? workspace.accent,
        },
      ]}
    >
      <Text
        style={[
          styles.chipLabel,
          active && { color: color ?? workspace.accent },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: workspace.bg,
  },
  header: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
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
    letterSpacing: -0.3,
    marginTop: 2,
  },
  sub: {
    color: workspace.textDim,
    fontSize: 11,
    fontFamily: workspace.mono,
    marginTop: 4,
    marginBottom: spacing[2],
  },
  filters: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: workspace.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: workspace.panelElevated,
  },
  chipLabel: {
    color: workspace.textMuted,
    fontSize: 12,
    fontWeight: typography.weight.medium,
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
  split: {
    flex: 1,
    flexDirection: 'row',
  },
  list: {
    width: 300,
    borderRightWidth: 1,
    borderRightColor: workspace.border,
  },
  listContent: {
    padding: spacing[3],
    gap: 8,
    paddingBottom: spacing[10],
  },
  card: {
    borderWidth: 1,
    borderColor: workspace.border,
    backgroundColor: workspace.panelElevated,
    padding: spacing[3],
    marginBottom: 8,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cat: {
    fontSize: 9,
    fontFamily: workspace.mono,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.8,
  },
  conf: {
    color: workspace.accentHot,
    fontSize: 11,
    fontFamily: workspace.mono,
  },
  decision: {
    color: workspace.text,
    fontSize: 14,
    fontWeight: typography.weight.semibold,
  },
  meta: {
    color: workspace.textDim,
    fontSize: 10,
    fontFamily: workspace.mono,
    marginTop: 6,
  },
  detail: {
    flex: 1,
  },
  detailBody: {
    padding: spacing[5],
    paddingBottom: spacing[10],
  },
  detailEyebrow: {
    color: workspace.textDim,
    fontSize: 10,
    fontFamily: workspace.mono,
    letterSpacing: 1.2,
  },
  detailTitle: {
    color: workspace.text,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.semibold,
    marginTop: 4,
    marginBottom: spacing[5],
  },
  fieldLabel: {
    color: workspace.accent,
    fontSize: 10,
    fontFamily: workspace.mono,
    letterSpacing: 1.2,
    fontWeight: typography.weight.bold,
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  fieldValueBig: {
    color: workspace.text,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
  },
  fieldValue: {
    color: workspace.text,
    fontSize: typography.size.sm,
    lineHeight: 21,
  },
  altRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  altBullet: {
    color: workspace.textDim,
  },
  altText: {
    color: workspace.textMuted,
    fontSize: 13,
    flex: 1,
  },
  confTrack: {
    height: 6,
    backgroundColor: workspace.border,
    marginTop: 4,
  },
  confFill: {
    height: '100%',
  },
  confNum: {
    color: workspace.textMuted,
    fontSize: 12,
    fontFamily: workspace.mono,
    marginTop: 6,
  },
  muted: {
    color: workspace.textDim,
    fontSize: 13,
  },
  linkBtn: {
    marginTop: spacing[6],
  },
  linkBtnText: {
    color: workspace.accentCool,
    fontSize: 13,
    fontWeight: typography.weight.semibold,
  },
});

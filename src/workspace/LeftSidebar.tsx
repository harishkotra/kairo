import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isScreenAgent } from '../agents/definitions';
import { workspace, radius, spacing, typography } from '../theme/tokens';
import { useDisplayState } from './useDisplayState';
import { useWorkspace } from './WorkspaceContext';

type Section = 'agents' | 'screens' | 'components' | 'assets';

const SECTIONS: {
  id: Section;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: 'agents', label: 'Agents', icon: 'hardware-chip-outline' },
  { id: 'screens', label: 'Screens', icon: 'phone-portrait-outline' },
  { id: 'components', label: 'Components', icon: 'cube-outline' },
  { id: 'assets', label: 'Assets', icon: 'images-outline' },
];

const STATUS_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  idle: 'ellipse-outline',
  queued: 'time-outline',
  waiting: 'hourglass-outline',
  blocked: 'remove-circle-outline',
  running: 'sync-outline',
  retrying: 'refresh-outline',
  complete: 'checkmark-circle',
  error: 'alert-circle',
};

export function LeftSidebar() {
  const {
    selectedAgentId,
    selectAgent,
    setView,
    selectArtifact,
    agentOrder,
    appPlan,
    completedScreenIds,
  } = useWorkspace();
  const { agents, artifacts } = useDisplayState();
  const [section, setSection] = useState<Section>('agents');

  const components = artifacts.filter((a) => a.type === 'component');
  const screens = (appPlan?.screens ?? []).map((s) => ({
    key: s.id,
    label: s.title,
    ready: completedScreenIds.includes(s.id),
  }));

  return (
    <View style={styles.sidebar}>
      <View style={styles.tabs}>
        {SECTIONS.map((s) => {
          const active = section === s.id;
          return (
            <Pressable
              key={s.id}
              onPress={() => setSection(s.id)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Ionicons
                name={s.icon}
                size={13}
                color={active ? workspace.accent : workspace.textDim}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: active ? workspace.accent : workspace.textDim },
                ]}
              >
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {section === 'agents' &&
          (agentOrder.length === 0 ? (
            <Text style={styles.empty}>
              Agents appear after you start a build from a product brief.
            </Text>
          ) : (
          agentOrder.map((id) => {
            const agent = agents[id];
            if (!agent) return null;
            const selected = selectedAgentId === id;
            return (
              <Pressable
                key={id}
                onPress={() => selectAgent(id)}
                style={[
                  styles.item,
                  selected && {
                    backgroundColor: workspace.accentSoft,
                    borderColor: agent.color + '55',
                  },
                ]}
              >
                <View
                  style={[styles.colorBar, { backgroundColor: agent.color }]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{agent.name}</Text>
                  <Text style={styles.itemMeta}>
                    {agent.status === 'running'
                      ? agent.currentTask
                      : agent.role}
                  </Text>
                </View>
                <Ionicons
                  name={STATUS_ICON[agent.status] ?? 'ellipse-outline'}
                  size={15}
                  color={
                    agent.status === 'complete'
                      ? workspace.success
                      : agent.status === 'running' ||
                          agent.status === 'retrying'
                        ? agent.color
                        : agent.status === 'blocked'
                          ? '#FBBF24'
                          : agent.status === 'waiting' ||
                              agent.status === 'queued'
                            ? '#60A5FA'
                            : workspace.textDim
                  }
                />
              </Pressable>
            );
          })
          ))}

        {section === 'screens' &&
          (screens.length === 0 ? (
            <Text style={styles.empty}>Screens are planned from your brief.</Text>
          ) : (
          screens.map((s) => (
            <View key={s.key} style={styles.item}>
              <Ionicons
                name="phone-portrait-outline"
                size={15}
                color={s.ready ? workspace.mint : workspace.textDim}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{s.label}</Text>
                <Text style={styles.itemMeta}>
                  {s.ready ? 'Live · token-bound' : 'Pending agent'}
                </Text>
              </View>
              {s.ready ? (
                <View style={styles.readyChip}>
                  <Text style={styles.readyChipText}>LIVE</Text>
                </View>
              ) : null}
            </View>
          ))
          ))}

        {section === 'components' &&
          (components.length === 0 ? (
            <Text style={styles.empty}>
              Components appear as Design System and screen agents ship.
            </Text>
          ) : (
            components.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => {
                  selectArtifact(c.id);
                  setView('artifacts');
                }}
                style={styles.item}
              >
                <Ionicons
                  name="cube-outline"
                  size={15}
                  color={workspace.violet}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{c.name}</Text>
                  <Text style={styles.itemMeta}>{c.path}</Text>
                </View>
              </Pressable>
            ))
          ))}

        {section === 'assets' && (
          <>
            <View style={styles.item}>
              <Ionicons
                name="image-outline"
                size={15}
                color={workspace.amber}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>icon.png</Text>
                <Text style={styles.itemMeta}>assets/ · app icon</Text>
              </View>
            </View>
            <Pressable
              onPress={() => setView('artifacts')}
              style={styles.item}
            >
              <Ionicons
                name="color-palette-outline"
                size={15}
                color={workspace.violet}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>tokens.ts</Text>
                <Text style={styles.itemMeta}>Open in artifact graph</Text>
              </View>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 232,
    backgroundColor: workspace.panel,
    borderRightWidth: 1,
    borderRightColor: workspace.border,
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing[2],
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: workspace.border,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  tabActive: {
    backgroundColor: workspace.accentSoft,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: typography.weight.semibold,
  },
  list: { flex: 1 },
  listContent: {
    padding: spacing[2],
    gap: 4,
    paddingBottom: spacing[8],
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[2] + 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: workspace.panelElevated,
  },
  colorBar: {
    width: 3,
    height: 28,
  },
  itemTitle: {
    color: workspace.text,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
  itemMeta: {
    color: workspace.textDim,
    fontSize: 10,
    marginTop: 1,
  },
  empty: {
    color: workspace.textDim,
    fontSize: typography.size.sm,
    lineHeight: 18,
    padding: spacing[3],
  },
  readyChip: {
    backgroundColor: 'rgba(123, 196, 160, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  readyChipText: {
    color: workspace.mint,
    fontSize: 9,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.8,
    fontFamily: workspace.mono,
  },
});

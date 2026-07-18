import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AGENT_ORDER } from '../agents/definitions';
import type { AgentId } from '../agents/types';
import { workspace, radius, spacing, typography } from '../theme/tokens';
import { useWorkspace } from './WorkspaceContext';

type Section = 'agents' | 'screens' | 'components' | 'assets';

const SECTIONS: { id: Section; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'agents', label: 'Agents', icon: 'hardware-chip-outline' },
  { id: 'screens', label: 'Screens', icon: 'phone-portrait-outline' },
  { id: 'components', label: 'Components', icon: 'cube-outline' },
  { id: 'assets', label: 'Assets', icon: 'images-outline' },
];

const STATUS_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  idle: 'ellipse-outline',
  queued: 'time-outline',
  running: 'sync-outline',
  complete: 'checkmark-circle',
  error: 'alert-circle',
};

export function LeftSidebar() {
  const { agents, selectedAgentId, selectAgent, artifacts, completedScreens } =
    useWorkspace();
  const [section, setSection] = useState<Section>('agents');

  const components = artifacts.filter((a) => a.type === 'component');
  const screens = [
    { key: 'home', label: 'Home', ready: completedScreens.includes('home') },
    {
      key: 'profile',
      label: 'Profile',
      ready: completedScreens.includes('profile'),
    },
    {
      key: 'settings',
      label: 'Settings',
      ready: completedScreens.includes('settings'),
    },
  ];

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
                size={14}
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
          AGENT_ORDER.map((id: AgentId) => {
            const agent = agents[id];
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
                  <Text style={styles.itemMeta}>{agent.role}</Text>
                </View>
                <Ionicons
                  name={STATUS_ICON[agent.status]}
                  size={16}
                  color={
                    agent.status === 'complete'
                      ? workspace.success
                      : agent.status === 'running'
                        ? agent.color
                        : workspace.textDim
                  }
                />
              </Pressable>
            );
          })}

        {section === 'screens' &&
          screens.map((s) => (
            <View key={s.key} style={styles.item}>
              <Ionicons
                name="phone-portrait-outline"
                size={16}
                color={s.ready ? workspace.mint : workspace.textDim}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{s.label}</Text>
                <Text style={styles.itemMeta}>
                  {s.ready ? 'Generated · token-bound' : 'Pending agent'}
                </Text>
              </View>
              {s.ready ? (
                <View style={styles.readyChip}>
                  <Text style={styles.readyChipText}>LIVE</Text>
                </View>
              ) : null}
            </View>
          ))}

        {section === 'components' &&
          (components.length === 0 ? (
            <Text style={styles.empty}>
              Components appear as the Design System and screen agents ship.
            </Text>
          ) : (
            components.map((c) => (
              <View key={c.name + c.agentId} style={styles.item}>
                <Ionicons
                  name="cube-outline"
                  size={16}
                  color={workspace.violet}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{c.name}</Text>
                  <Text style={styles.itemMeta}>{c.path}</Text>
                </View>
              </View>
            ))
          ))}

        {section === 'assets' && (
          <>
            <View style={styles.item}>
              <Ionicons name="image-outline" size={16} color={workspace.amber} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>icon.png</Text>
                <Text style={styles.itemMeta}>assets/ · app icon</Text>
              </View>
            </View>
            <View style={styles.item}>
              <Ionicons
                name="color-palette-outline"
                size={16}
                color={workspace.violet}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>tokens.ts</Text>
                <Text style={styles.itemMeta}>Design system package</Text>
              </View>
            </View>
            <Text style={styles.empty}>
              Screen agents reuse shared tokens — no one-off colors.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    backgroundColor: workspace.panel,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: workspace.border,
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing[2],
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: workspace.border,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  tabActive: {
    backgroundColor: workspace.accentSoft,
  },
  tabLabel: {
    fontSize: 11,
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
    borderRadius: 2,
  },
  itemTitle: {
    color: workspace.text,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
  itemMeta: {
    color: workspace.textDim,
    fontSize: 11,
    marginTop: 1,
  },
  empty: {
    color: workspace.textDim,
    fontSize: typography.size.sm,
    lineHeight: 18,
    padding: spacing[3],
  },
  readyChip: {
    backgroundColor: 'rgba(94, 234, 212, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  readyChipText: {
    color: workspace.mint,
    fontSize: 9,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.8,
  },
});

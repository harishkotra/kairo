import React, { useMemo, useState } from 'react';
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

type AssetEntry = {
  id: string;
  name: string;
  type: 'screen' | 'component' | 'style' | 'asset' | 'data';
  icon: string;
  iconColor: string;
  path: string;
  count: number;
  detail: string;
};

const ASSET_ICONS: Record<string, { icon: string; color: string }> = {
  screen: { icon: 'phone-portrait-outline', color: workspace.accentHot },
  component: { icon: 'cube-outline', color: workspace.violet },
  style: { icon: 'color-palette-outline', color: workspace.amber },
  asset: { icon: 'image-outline', color: workspace.mint },
  data: { icon: 'code-slash-outline', color: workspace.accentCool },
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
    icon: s.icon || 'phone-portrait-outline',
    ready: completedScreenIds.includes(s.id),
    sections: s.sections?.length ?? 0,
    items: s.sections?.reduce((sum, sec) => sum + (sec.items?.length ?? 0), 0) ?? 0,
  }));

  const assets = useMemo(() => {
    const list: AssetEntry[] = [];
    const plan = appPlan;
    if (!plan) return list;

    const totalItems = plan.screens?.reduce(
      (sum, s) => sum + (s.sections?.reduce((ss, sec) => ss + (sec.items?.length ?? 0), 0) ?? 0),
      0
    ) ?? 0;

    list.push({
      id: 'screens-export',
      name: 'Screen specs',
      type: 'screen',
      icon: 'phone-portrait-outline',
      iconColor: workspace.accentHot,
      path: 'generated/screens',
      count: plan.screens?.length ?? 0,
      detail: `${plan.screens?.length ?? 0} screens · ${totalItems} items`,
    });

    const sectionTypes = new Set(plan.screens?.flatMap((s) => s.sections?.map((sec) => sec.type) ?? []) ?? []);
    list.push({
      id: 'sections',
      name: 'Section components',
      type: 'component',
      icon: 'cube-outline',
      iconColor: workspace.violet,
      path: 'generated/sections',
      count: sectionTypes.size,
      detail: [...sectionTypes].join(', '),
    });

    list.push({
      id: 'theme',
      name: 'Theme tokens',
      type: 'style',
      icon: 'color-palette-outline',
      iconColor: workspace.amber,
      path: 'theme/tokens.ts',
      count: 1,
      detail: `Navigation: ${plan.navigation}`,
    });

    list.push({
      id: 'navigation',
      name: 'Navigation layout',
      type: 'data',
      icon: 'code-slash-outline',
      iconColor: workspace.accentCool,
      path: `layout/${plan.navigation}`,
      count: 1,
      detail: `${plan.navigation} · ${plan.screens?.length ?? 0} routes`,
    });

    if (totalItems > 0) {
      list.push({
        id: 'static-assets',
        name: 'Generated content',
        type: 'asset',
        icon: 'document-text-outline',
        iconColor: workspace.mint,
        path: 'generated/content',
        count: totalItems,
        detail: `${totalItems} data entries across all screens`,
      });
    }

    return list;
  }, [appPlan]);

  const hasPlan = !!(appPlan && appPlan.screens?.length > 0);

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
            <Pressable
              key={s.key}
              style={styles.item}
              onPress={() => {
                const agentId = `screen:${s.key}`;
                if (agents[agentId]) selectAgent(agentId);
              }}
            >
              <Ionicons
                name={(s.icon as keyof typeof Ionicons.glyphMap) || 'phone-portrait-outline'}
                size={16}
                color={s.ready ? workspace.mint : workspace.textDim}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{s.label}</Text>
                <Text style={styles.itemMeta}>
                  {s.ready
                    ? `${s.sections} sections · ${s.items} items`
                    : 'Pending agent'}
                </Text>
              </View>
              <View
                style={[
                  styles.readyChip,
                  {
                    backgroundColor: s.ready
                      ? 'rgba(48, 209, 88, 0.12)'
                      : 'rgba(107, 122, 144, 0.12)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.readyChipText,
                    { color: s.ready ? workspace.mint : workspace.textDim },
                  ]}
                >
                  {s.ready ? 'LIVE' : `${s.sections}§`}
                </Text>
              </View>
            </Pressable>
          ))
          ))}

        {section === 'components' &&
          (!hasPlan ? (
            <Text style={styles.empty}>
              Components appear as agents ship screen sections and design tokens.
            </Text>
          ) : components.length === 0 && hasPlan ? (
            <>
              <ComponentHint
                title="HeroCard"
                subtitle="section type · hero"
                icon="card-outline"
                color={workspace.accentHot}
              />
              <ComponentHint
                title="StatsRow"
                subtitle="section type · stats"
                icon="stats-chart-outline"
                color={workspace.mint}
              />
              <ComponentHint
                title="MediaCard"
                subtitle="section type · cards"
                icon="grid-outline"
                color={workspace.violet}
              />
              <ComponentHint
                title="ListRow"
                subtitle="section type · list"
                icon="list-outline"
                color={workspace.amber}
              />
              <ComponentHint
                title="ActionButton"
                subtitle="section type · actions"
                icon="flash-outline"
                color={workspace.accentCool}
              />
            </>
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

        {section === 'assets' &&
          (!hasPlan ? (
            <Text style={styles.empty}>
              Assets are generated from your product plan screens.
            </Text>
          ) : (
            assets.map((a) => {
              const meta = ASSET_ICONS[a.type] ?? { icon: 'document-outline', color: workspace.textDim };
              return (
                <Pressable
                  key={a.id}
                  style={styles.item}
                  onPress={() => {
                    if (a.type === 'component' || a.type === 'data') {
                      setView('artifacts');
                    }
                  }}
                >
                  <View
                    style={[
                      styles.assetIconWrap,
                      { backgroundColor: a.iconColor + '18' },
                    ]}
                  >
                    <Ionicons
                      name={a.icon as keyof typeof Ionicons.glyphMap}
                      size={13}
                      color={a.iconColor}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{a.name}</Text>
                    <Text style={styles.itemMeta}>{a.detail}</Text>
                  </View>
                  <Text style={styles.assetCount}>{a.count}</Text>
                </Pressable>
              );
            })
          ))}
      </ScrollView>
    </View>
  );
}

function ComponentHint({
  title,
  subtitle,
  icon,
  color,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  return (
    <View style={styles.item}>
      <View style={[styles.assetIconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={13} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.itemMeta}>{subtitle}</Text>
      </View>
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
  assetIconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
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
  assetCount: {
    color: workspace.textDim,
    fontSize: 10,
    fontFamily: workspace.mono,
    fontWeight: typography.weight.bold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: workspace.border + '66',
    borderRadius: 4,
    overflow: 'hidden',
  },
  empty: {
    color: workspace.textDim,
    fontSize: typography.size.sm,
    lineHeight: 18,
    padding: spacing[3],
  },
  readyChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  readyChipText: {
    fontSize: 9,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.8,
    fontFamily: workspace.mono,
  },
});

import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme/ThemeProvider';
import { DynamicScreen } from '../../src/generated/DynamicScreen';
import { useWorkspace } from '../../src/workspace/WorkspaceContext';
import { fetchPreviewState } from '../../src/agentos/client';
import { spacing, typography } from '../../src/theme/tokens';
import type { AppPlan } from '../../src/agents/types';

/**
 * Live preview: tabs driven by the planned product screens (not hard-coded).
 *
 * When opened fresh (e.g. via Expo Go QR scan), this route fetches the
 * latest app plan from the agentOS server — shared by the pipeline on
 * completion — so the built app content renders instead of an empty state.
 */
export default function PreviewHome() {
  const { appPlan: ctxPlan, projectName, completedScreenIds } = useWorkspace();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [serverState, setServerState] = useState<AppPlan | null>(null);
  const [loading, setLoading] = useState(true);

  // If opened fresh (no context state), fetch from agentOS server
  useEffect(() => {
    if (ctxPlan) {
      setServerState(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const data = await fetchPreviewState();
        if (!cancelled && data?.appPlan) {
          setServerState(data.appPlan as AppPlan);
        }
      } catch {
        // agentOS server not running — show empty state
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [ctxPlan]);

  const appPlan = ctxPlan ?? serverState;
  const screens = appPlan?.screens ?? [];
  const [active, setActive] = useState(0);

  const available = useMemo(() => {
    if (!screens.length) return [];
    const done = screens.filter((s) => completedScreenIds.includes(s.id));
    return done.length ? done : screens;
  }, [screens, completedScreenIds]);

  const idx = Math.min(active, Math.max(0, available.length - 1));
  const current = available[idx];

  if (!appPlan || !current) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.background }]}>
        {loading ? (
          <>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Loading preview…
            </Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              Connecting to the Kairo pipeline to load the built app.
            </Text>
          </>
        ) : (
          <>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No product plan yet
            </Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              Build an app from a product brief on the workspace canvas.
              Screens appear here as agents ship them.
            </Text>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={{ flex: 1 }}>
        <DynamicScreen spec={current} projectName={projectName} />
      </View>
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: colors.tabBar,
            borderTopColor: colors.border,
            maxWidth: width,
          },
        ]}
      >
        {available.map((s, i) => {
          const on = i === idx;
          return (
            <Pressable
              key={s.id}
              onPress={() => setActive(i)}
              style={styles.tab}
            >
              <Ionicons
                name={
                  (s.icon as keyof typeof Ionicons.glyphMap) || 'ellipse-outline'
                }
                size={20}
                color={on ? colors.primary : colors.tabInactive}
              />
              <Text
                style={{
                  color: on ? colors.primary : colors.tabInactive,
                  fontSize: 10,
                  marginTop: 2,
                  fontWeight: on ? '600' : '400',
                }}
                numberOfLines={1}
              >
                {s.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
  },
  emptyTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: 8,
    paddingTop: 6,
    minHeight: 56,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
});

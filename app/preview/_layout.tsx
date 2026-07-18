import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from '../../src/theme/ThemeProvider';
import { useWorkspace } from '../../src/workspace/WorkspaceContext';
import { spacing, typography } from '../../src/theme/tokens';

function PreviewChrome({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { colors, isDark, toggle } = useTheme();
  const { projectName, phase, appPlan } = useWorkspace();
  const evolving = phase === 'running' || phase === 'planning';

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.top,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
          <Text style={[styles.backLabel, { color: colors.text }]}>
            Workspace
          </Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {projectName}
          {evolving ? ' · updating' : ''}
          {appPlan ? ` · ${appPlan.screens.length} screens` : ''}
        </Text>
        <Pressable onPress={toggle} style={styles.themeBtn}>
          <Ionicons
            name={isDark ? 'sunny-outline' : 'moon-outline'}
            size={18}
            color={colors.primary}
          />
        </Pressable>
      </View>
      {children}
    </View>
  );
}

export default function PreviewLayout() {
  return (
    <ThemeProvider>
      <PreviewChrome>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
        </Stack>
      </PreviewChrome>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing[3],
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 90,
  },
  backLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
  title: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    flex: 1,
    textAlign: 'center',
  },
  themeBtn: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
});

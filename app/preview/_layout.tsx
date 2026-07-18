import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from '../../src/theme/ThemeProvider';
import { spacing, typography } from '../../src/theme/tokens';

function PreviewTabs() {
  const router = useRouter();
  const { colors, isDark, toggle } = useTheme();

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
        <Text style={[styles.title, { color: colors.text }]}>
          Live Preview · Aurora Mobile
        </Text>
        <Pressable onPress={toggle} style={styles.themeBtn}>
          <Ionicons
            name={isDark ? 'sunny-outline' : 'moon-outline'}
            size={18}
            color={colors.primary}
          />
          <Text
            style={{
              color: colors.primary,
              fontSize: 13,
              fontWeight: '600',
            }}
          >
            {isDark ? 'Light' : 'Dark'}
          </Text>
        </Pressable>
      </View>

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.tabInactive,
          tabBarStyle: {
            backgroundColor: colors.tabBar,
            borderTopColor: colors.border,
            height: 64,
            paddingBottom: 8,
            paddingTop: 8,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

export default function PreviewLayout() {
  return (
    <ThemeProvider>
      <PreviewTabs />
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
    minWidth: 100,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 100,
    justifyContent: 'flex-end',
  },
});

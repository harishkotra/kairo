import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing, typography } from '../../theme/tokens';
import { Card, ListRow, SectionHeader } from '../../components/ui';

export function SettingsScreen() {
  const { colors, isDark, toggle, setMode } = useTheme();
  const [push, setPush] = useState(true);
  const [email, setEmail] = useState(false);
  const [haptics, setHaptics] = useState(true);
  const [analytics, setAnalytics] = useState(true);

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
      <Text style={[styles.sub, { color: colors.textSecondary }]}>
        Preferences shared across every generated surface.
      </Text>

      <SectionHeader title="Appearance" />
      <Card padded={false} style={styles.group}>
        <ListRow
          icon="moon-outline"
          title="Dark mode"
          subtitle={isDark ? 'On' : 'Off'}
          toggle={{
            value: isDark,
            onValueChange: () => toggle(),
          }}
        />
        <ListRow
          icon="phone-portrait-outline"
          title="Match system"
          subtitle="Follow device appearance"
          onPress={() => setMode('system')}
          showChevron
          last
        />
      </Card>

      <SectionHeader title="Notifications" />
      <Card padded={false} style={styles.group}>
        <ListRow
          icon="notifications-outline"
          title="Push notifications"
          toggle={{ value: push, onValueChange: setPush }}
        />
        <ListRow
          icon="mail-outline"
          title="Email digests"
          toggle={{ value: email, onValueChange: setEmail }}
          last
        />
      </Card>

      <SectionHeader title="Experience" />
      <Card padded={false} style={styles.group}>
        <ListRow
          icon="radio-button-on-outline"
          title="Haptics"
          toggle={{ value: haptics, onValueChange: setHaptics }}
        />
        <ListRow
          icon="stats-chart-outline"
          title="Usage analytics"
          toggle={{ value: analytics, onValueChange: setAnalytics }}
          last
        />
      </Card>

      <SectionHeader title="Account" />
      <Card padded={false} style={styles.group}>
        <ListRow
          icon="person-circle-outline"
          title="Account details"
          showChevron
        />
        <ListRow
          icon="shield-checkmark-outline"
          title="Privacy"
          showChevron
        />
        <ListRow
          icon="log-out-outline"
          title="Sign out"
          last
          onPress={() => {}}
        />
      </Card>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textTertiary }]}>
          Aurora Mobile · v1.0.0
        </Text>
        <Text style={[styles.footerText, { color: colors.textTertiary }]}>
          Tokens by Design System Agent
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    padding: spacing[5],
    paddingBottom: spacing[10],
  },
  title: {
    fontSize: typography.size['3xl'],
    fontWeight: typography.weight.bold,
    letterSpacing: -0.8,
    marginBottom: spacing[2],
  },
  sub: {
    fontSize: typography.size.md,
    marginBottom: spacing[6],
    lineHeight: 22,
  },
  group: { marginBottom: spacing[5] },
  footer: {
    alignItems: 'center',
    gap: 4,
    marginTop: spacing[2],
  },
  footerText: {
    fontSize: typography.size.xs,
  },
});

export default SettingsScreen;

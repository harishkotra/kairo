import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing, typography } from '../../theme/tokens';
import {
  Avatar,
  Badge,
  Button,
  Card,
  ListRow,
  SectionHeader,
} from '../../components/ui';

const STATS = [
  { label: 'Shipped', value: '24' },
  { label: 'Agents', value: '5' },
  { label: 'Tokens', value: '128' },
];

export function ProfileScreen() {
  const { colors } = useTheme();

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Avatar name="Alex Rivera" size={84} />
        <Text style={[styles.name, { color: colors.text }]}>Alex Rivera</Text>
        <Text style={[styles.handle, { color: colors.textSecondary }]}>
          @alex · Product Design
        </Text>
        <View style={styles.badges}>
          <Badge label="Pro" />
          <Badge label="Expo" tone="muted" />
        </View>
      </View>

      <View style={styles.stats}>
        {STATS.map((s) => (
          <Card key={s.label} style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {s.value}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {s.label}
            </Text>
          </Card>
        ))}
      </View>

      <Button label="Edit profile" variant="secondary" style={styles.cta} />

      <SectionHeader title="About" />
      <Card padded={false} style={styles.listCard}>
        <ListRow
          icon="briefcase-outline"
          title="Studio"
          subtitle="Aurora Design Lab"
        />
        <ListRow
          icon="location-outline"
          title="Based in"
          subtitle="San Francisco"
        />
        <ListRow
          icon="link-outline"
          title="Website"
          subtitle="aurora.studio"
          showChevron
          last
        />
      </Card>

      <SectionHeader title="Workspace" />
      <Card padded={false} style={styles.listCard}>
        <ListRow
          icon="layers-outline"
          title="Active project"
          subtitle="Aurora Mobile"
          showChevron
        />
        <ListRow
          icon="people-outline"
          title="Collaborators"
          subtitle="5 AI agents"
          showChevron
          last
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    padding: spacing[5],
    paddingBottom: spacing[10],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing[5],
    marginTop: spacing[2],
  },
  name: {
    marginTop: spacing[4],
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    letterSpacing: -0.5,
  },
  handle: {
    marginTop: spacing[1],
    fontSize: typography.size.md,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  stats: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[4],
  },
  statValue: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    letterSpacing: -0.5,
  },
  statLabel: {
    marginTop: 4,
    fontSize: typography.size.sm,
  },
  cta: { marginBottom: spacing[6] },
  listCard: { marginBottom: spacing[5] },
});

export default ProfileScreen;

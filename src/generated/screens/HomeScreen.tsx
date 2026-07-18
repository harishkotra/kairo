import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing, typography } from '../../theme/tokens';
import { Avatar, Badge, Card, SectionHeader } from '../../components/ui';

const ACTIONS = [
  { icon: 'flash-outline' as const, label: 'Focus' },
  { icon: 'calendar-outline' as const, label: 'Plan' },
  { icon: 'people-outline' as const, label: 'Team' },
  { icon: 'sparkles-outline' as const, label: 'Ideas' },
];

const ACTIVITY = [
  {
    title: 'Design tokens published',
    meta: 'Design System · 2m ago',
    tone: 'primary' as const,
  },
  {
    title: 'Tab navigation locked',
    meta: 'Architecture · 8m ago',
    tone: 'muted' as const,
  },
  {
    title: 'Home surface composition',
    meta: 'Home Agent · now',
    tone: 'accent' as const,
  },
];

export function HomeScreen() {
  const { colors } = useTheme();

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.top}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.textTertiary }]}>
            GOOD AFTERNOON
          </Text>
          <Text style={[styles.hello, { color: colors.text }]}>
            Build something{'\n'}worth shipping
          </Text>
        </View>
        <Avatar name="Alex Rivera" size={44} />
      </View>

      <Card style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View style={{ flex: 1 }}>
            <Badge label="Live session" tone="accent" />
            <Text style={[styles.heroTitle, { color: colors.text }]}>
              Aurora sprint is 68% complete
            </Text>
            <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
              Three agents collaborating on your Expo surfaces.
            </Text>
          </View>
          <View
            style={[styles.ring, { borderColor: colors.primary }]}
          >
            <Text style={[styles.ringText, { color: colors.primary }]}>68%</Text>
          </View>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors.surfaceMuted }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: colors.primary, width: '68%' },
            ]}
          />
        </View>
      </Card>

      <View style={styles.actions}>
        {ACTIONS.map((a) => (
          <Pressable
            key={a.label}
            style={[
              styles.action,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[styles.actionIcon, { backgroundColor: colors.primaryMuted }]}
            >
              <Ionicons name={a.icon} size={18} color={colors.primary} />
            </View>
            <Text style={[styles.actionLabel, { color: colors.text }]}>
              {a.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <SectionHeader title="Activity" action="See all" />
      <View style={{ gap: spacing[3] }}>
        {ACTIVITY.map((item) => (
          <Card key={item.title} style={styles.activityCard}>
            <View style={styles.activityRow}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      item.tone === 'accent'
                        ? colors.accent
                        : item.tone === 'primary'
                          ? colors.primary
                          : colors.textTertiary,
                  },
                ]}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.activityTitle, { color: colors.text }]}>
                  {item.title}
                </Text>
                <Text
                  style={[styles.activityMeta, { color: colors.textSecondary }]}
                >
                  {item.meta}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textTertiary}
              />
            </View>
          </Card>
        ))}
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
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[5],
  },
  eyebrow: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    letterSpacing: 1.4,
    marginBottom: spacing[2],
  },
  hello: {
    fontSize: typography.size['3xl'],
    fontWeight: typography.weight.bold,
    letterSpacing: -0.8,
    lineHeight: 34,
  },
  heroCard: { marginBottom: spacing[5] },
  heroRow: { flexDirection: 'row', gap: spacing[3], marginBottom: spacing[4] },
  heroTitle: {
    marginTop: spacing[3],
    fontSize: typography.size.xl,
    fontWeight: typography.weight.semibold,
    letterSpacing: -0.4,
  },
  heroSub: {
    marginTop: spacing[2],
    fontSize: typography.size.sm,
    lineHeight: 18,
  },
  ring: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
  },
  progressTrack: {
    height: 6,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[6],
  },
  action: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing[2],
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
  },
  activityCard: { padding: 0 },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    gap: spacing[3],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activityTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.medium,
  },
  activityMeta: {
    fontSize: typography.size.sm,
    marginTop: 2,
  },
});

export default HomeScreen;

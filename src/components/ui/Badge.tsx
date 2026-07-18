import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing, typography } from '../../theme/tokens';

export function Badge({
  label,
  tone = 'primary',
}: {
  label: string;
  tone?: 'primary' | 'accent' | 'muted';
}) {
  const { colors } = useTheme();
  const bg =
    tone === 'accent'
      ? 'rgba(255, 122, 110, 0.15)'
      : tone === 'muted'
        ? colors.surfaceMuted
        : colors.primaryMuted;
  const fg =
    tone === 'accent'
      ? colors.accent
      : tone === 'muted'
        ? colors.textSecondary
        : colors.primary;

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing[2] + 2,
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});

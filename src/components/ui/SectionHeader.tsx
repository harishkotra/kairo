import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing, typography } from '../../theme/tokens';

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {action ? (
        <Text style={[styles.action, { color: colors.primary }]}>{action}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  title: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    letterSpacing: -0.3,
  },
  action: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
});

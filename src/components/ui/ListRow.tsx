import React from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing, typography } from '../../theme/tokens';

type Props = {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  right?: React.ReactNode;
  showChevron?: boolean;
  toggle?: {
    value: boolean;
    onValueChange: (v: boolean) => void;
  };
  last?: boolean;
};

export function ListRow({
  title,
  subtitle,
  icon,
  onPress,
  right,
  showChevron,
  toggle,
  last,
}: Props) {
  const { colors } = useTheme();
  const content = (
    <View
      style={[
        styles.row,
        {
          borderBottomColor: colors.border,
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      {icon ? (
        <View
          style={[styles.iconWrap, { backgroundColor: colors.primaryMuted }]}
        >
          <Ionicons name={icon} size={18} color={colors.primary} />
        </View>
      ) : null}
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {toggle ? (
        <Switch
          value={toggle.value}
          onValueChange={toggle.onValueChange}
          trackColor={{ false: colors.surfaceMuted, true: colors.primary }}
          thumbColor="#FFFFFF"
        />
      ) : null}
      {right}
      {showChevron ? (
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      ) : null}
    </View>
  );

  if (onPress && !toggle) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
        {content}
      </Pressable>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3] + 2,
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1 },
  title: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.medium,
  },
  subtitle: {
    fontSize: typography.size.sm,
    marginTop: 2,
  },
});

import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing, typography } from '../../theme/tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  style,
  textStyle,
}: Props) {
  const { colors } = useTheme();

  const pad =
    size === 'sm'
      ? { py: spacing[2], px: spacing[3] }
      : size === 'lg'
        ? { py: spacing[4], px: spacing[6] }
        : { py: spacing[3], px: spacing[5] };

  const bg =
    variant === 'primary'
      ? colors.primary
      : variant === 'secondary'
        ? colors.surfaceMuted
        : variant === 'danger'
          ? colors.danger
          : 'transparent';

  const fg =
    variant === 'primary'
      ? colors.background === '#F4F6FA'
        ? '#FFFFFF'
        : '#07080C'
      : variant === 'danger'
        ? '#FFFFFF'
        : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          paddingVertical: pad.py,
          paddingHorizontal: pad.px,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: fg,
            fontSize: size === 'sm' ? typography.size.sm : typography.size.md,
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: typography.weight.semibold,
    letterSpacing: -0.2,
  },
});

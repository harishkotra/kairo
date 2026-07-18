import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, typography } from '../../theme/tokens';

type Props = {
  name: string;
  size?: number;
  style?: ViewStyle;
  color?: string;
};

export function Avatar({ name, size = 48, style, color }: Props) {
  const { colors } = useTheme();
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: radius.full,
          backgroundColor: color ?? colors.primaryMuted,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: color ? '#07080C' : colors.primary,
          fontSize: size * 0.34,
          fontWeight: typography.weight.bold,
        }}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});

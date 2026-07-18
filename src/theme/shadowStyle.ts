import { Platform, type ViewStyle } from 'react-native';

type ShadowSpec = {
  color: string;
  offsetX?: number;
  offsetY?: number;
  opacity?: number;
  radius?: number;
  elevation?: number;
};

/**
 * Returns platform-appropriate shadow style.
 * - Web (react-native-web 19+): uses `boxShadow` (shadow* props deprecated)
 * - Native: uses `shadowColor / shadowOffset / shadowOpacity / shadowRadius`
 */
export function shadowStyle(spec: ShadowSpec): ViewStyle {
  const { color, offsetX = 0, offsetY = 0, opacity = 1, radius = 0, elevation = 0 } = spec;
  if (Platform.OS === 'web') {
    return {
      boxShadow: `${offsetX}px ${offsetY}px ${radius}px ${color}`,
    };
  }
  return {
    shadowColor: color,
    shadowOffset: { width: offsetX, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation,
  };
}

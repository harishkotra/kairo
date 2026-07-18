/**
 * Shared design tokens — product UI (generated app) + Kairo workspace chrome.
 *
 * Workspace aesthetic: instrument-bay control surface —
 * cold indigo night, brass signal accents, hard edges, tabular mono telemetry.
 * Avoids generic “AI product” neon-on-black and cream-serif templates.
 */

import { Platform, type ViewStyle } from 'react-native';

export const palette = {
  // Brand (product)
  aurora: '#6EE7FF',
  auroraDim: '#2A8FA3',
  violet: '#A78BFA',
  coral: '#FF7A6E',
  amber: '#F5B942',
  mint: '#5EEAD4',

  // Neutrals
  ink: '#07080C',
  void: '#0B0D12',
  carbon: '#12151C',
  slate: '#1A1E28',
  steel: '#252A36',
  fog: '#3A4152',
  mist: '#6B7385',
  cloud: '#A8B0C0',
  snow: '#E8ECF4',
  white: '#FFFFFF',

  paper: '#F4F6FA',
  paperElevated: '#FFFFFF',
  inkOnLight: '#12151C',
  mutedOnLight: '#5A6275',

  // Workspace instrument palette
  bay: '#0A101C',
  bayPanel: '#101826',
  bayRaised: '#162033',
  bayLine: '#243149',
  bayLineSoft: '#1A2638',
  signal: '#D4A574',
  signalHot: '#E8C36A',
  signalCool: '#7EB8C9',
  phosphor: '#C5D4E8',
  mute: '#6B7A90',
  dim: '#3D4A5C',
  danger: '#E07A6A',
  ok: '#7BC4A0',
} as const;

export const colors = {
  light: {
    background: palette.paper,
    surface: palette.paperElevated,
    surfaceElevated: '#FFFFFF',
    surfaceMuted: '#E8EBF2',
    border: '#D5DAE6',
    borderStrong: '#B8C0D0',
    text: palette.inkOnLight,
    textSecondary: palette.mutedOnLight,
    textTertiary: '#8A93A6',
    primary: '#0F766E',
    primaryMuted: '#CCFBF1',
    accent: palette.coral,
    success: '#059669',
    warning: palette.amber,
    danger: '#DC2626',
    tabBar: '#FFFFFF',
    tabInactive: '#8A93A6',
    shadow: 'rgba(15, 23, 42, 0.12)',
    overlay: 'rgba(7, 8, 12, 0.45)',
  },
  dark: {
    background: palette.void,
    surface: palette.carbon,
    surfaceElevated: palette.slate,
    surfaceMuted: palette.steel,
    border: palette.steel,
    borderStrong: palette.fog,
    text: palette.snow,
    textSecondary: palette.cloud,
    textTertiary: palette.mist,
    primary: palette.mint,
    primaryMuted: 'rgba(94, 234, 212, 0.12)',
    accent: palette.coral,
    success: '#34D399',
    warning: palette.amber,
    danger: '#F87171',
    tabBar: palette.carbon,
    tabInactive: palette.mist,
    shadow: 'rgba(0, 0, 0, 0.45)',
    overlay: 'rgba(0, 0, 0, 0.55)',
  },
} as const;

export type ColorScheme = keyof typeof colors;
export type ThemeColors = (typeof colors)[ColorScheme];

export const typography = {
  fonts: {
    display: 'System',
    body: 'System',
    mono: 'Menlo',
  },
  size: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeight: {
    tight: 1.15,
    snug: 1.3,
    normal: 1.45,
    relaxed: 1.6,
  },
  letterSpacing: {
    tight: -0.4,
    normal: 0,
    wide: 0.6,
    wider: 1.2,
  },
};

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 32,
  8: 40,
  9: 48,
  10: 64,
} as const;

export const radius = {
  none: 0,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  full: 9999,
} as const;

function platformShadow(spec: {
  color: string;
  offsetX?: number;
  offsetY?: number;
  opacity?: number;
  radius?: number;
  elevation?: number;
}): ViewStyle {
  const { color, offsetX = 0, offsetY = 0, opacity = 1, radius = 0, elevation = 0 } = spec;
  if (Platform.OS === 'web') {
    return {
      boxShadow: `${offsetX}px ${offsetY}px ${radius}px ${color}`,
    } as ViewStyle;
  }
  return {
    shadowColor: color,
    shadowOffset: { width: offsetX, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation,
  };
}

export const shadows = {
  sm: platformShadow({ color: '#000', offsetY: 1, opacity: 0.12, radius: 3, elevation: 2 }),
  md: platformShadow({ color: '#000', offsetY: 4, opacity: 0.18, radius: 12, elevation: 6 }),
  lg: platformShadow({ color: '#000', offsetY: 10, opacity: 0.28, radius: 24, elevation: 12 }),
  glow: platformShadow({ color: palette.signal, opacity: 0.25, radius: 12, elevation: 8 }),
} as const;

export const layout = {
  screenPadding: spacing[5],
  maxContentWidth: 480,
  headerHeight: 56,
  tabBarHeight: 64,
  /** iPhone-like design frame (Figma / device mock proportions) */
  phoneWidth: 320,
  phoneHeight: 692,
  phoneRadius: 44,
  phoneBezel: 10,
  phoneStatusBar: 48,
  phoneHomeIndicator: 20,
} as const;

/**
 * Kairo workspace chrome — Figma-like design surface
 * soft dark board, subtle grid, restrained accent
 */
export const workspace = {
  bg: '#1A1A1E',
  panel: '#222228',
  panelElevated: '#2A2A32',
  border: '#3A3A44',
  borderSubtle: '#2E2E36',
  grid: 'rgba(255, 255, 255, 0.035)',
  gridMajor: 'rgba(255, 255, 255, 0.06)',
  text: '#F2F2F4',
  textMuted: '#9B9BA8',
  textDim: '#6B6B78',
  accent: '#0A84FF',
  accentSoft: 'rgba(10, 132, 255, 0.14)',
  accentHot: '#64D2FF',
  accentCool: '#5AC8FA',
  violet: '#BF5AF2',
  coral: '#FF6961',
  amber: '#FFD60A',
  mint: '#30D158',
  success: '#30D158',
  danger: '#FF453A',
  mono: 'Menlo',
  device: {
    frame: '#0C0C0E',
    bezel: '#1C1C1E',
    island: '#000000',
    shadow: 'rgba(0,0,0,0.55)',
  },
  agent: {
    architecture: '#64D2FF',
    designSystem: '#BF5AF2',
    home: '#30D158',
    profile: '#FFD60A',
    settings: '#FF9F0A',
  },
} as const;

export const tokens = {
  palette,
  colors,
  typography,
  spacing,
  radius,
  shadows,
  layout,
  workspace,
} as const;

export default tokens;

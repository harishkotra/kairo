/**
 * Shared design tokens — produced by the Design System Agent
 * and consumed by every screen agent.
 */

export const palette = {
  // Brand
  aurora: '#6EE7FF',
  auroraDim: '#2A8FA3',
  violet: '#A78BFA',
  coral: '#FF7A6E',
  amber: '#F5B942',
  mint: '#5EEAD4',

  // Neutrals (dark-first)
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

  // Light surface
  paper: '#F4F6FA',
  paperElevated: '#FFFFFF',
  inkOnLight: '#12151C',
  mutedOnLight: '#5A6275',
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
    mono: 'SpaceMono',
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
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  '2xl': 28,
  full: 9999,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 12,
  },
  glow: {
    shadowColor: palette.aurora,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

export const layout = {
  screenPadding: spacing[5],
  maxContentWidth: 480,
  headerHeight: 56,
  tabBarHeight: 64,
  phoneWidth: 280,
  phoneHeight: 560,
  phoneRadius: 36,
} as const;

/** Workspace chrome tokens (distinct from product UI) */
export const workspace = {
  bg: '#080A0F',
  panel: '#0E1118',
  panelElevated: '#141922',
  border: '#1E2430',
  borderSubtle: '#171C26',
  grid: 'rgba(110, 231, 255, 0.04)',
  text: '#E6EAF2',
  textMuted: '#7A8499',
  textDim: '#4A5366',
  accent: palette.aurora,
  accentSoft: 'rgba(110, 231, 255, 0.12)',
  violet: palette.violet,
  coral: palette.coral,
  amber: palette.amber,
  mint: palette.mint,
  success: '#34D399',
  danger: '#F87171',
  agent: {
    architecture: '#6EE7FF',
    designSystem: '#A78BFA',
    home: '#5EEAD4',
    profile: '#F5B942',
    settings: '#FF7A6E',
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

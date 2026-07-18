import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { useColorScheme as useSystemScheme } from 'react-native';
import {
  ColorScheme,
  ThemeColors,
  colors,
  radius,
  shadows,
  spacing,
  typography,
} from './tokens';

type ThemeMode = 'system' | ColorScheme;

type ThemeContextValue = {
  mode: ThemeMode;
  scheme: ColorScheme;
  colors: ThemeColors;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  shadows: typeof shadows;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  forcedScheme,
}: {
  children: React.ReactNode;
  /** Pin light/dark for canvas previews, ignoring system. */
  forcedScheme?: ColorScheme;
}) {
  const system = useSystemScheme();
  const [mode, setMode] = useState<ThemeMode>(forcedScheme ?? 'system');

  const scheme: ColorScheme = forcedScheme
    ? forcedScheme
    : mode === 'system'
      ? system === 'light'
        ? 'light'
        : 'dark'
      : mode;

  const toggle = useCallback(() => {
    setMode((prev) => {
      const current =
        prev === 'system' ? (system === 'light' ? 'light' : 'dark') : prev;
      return current === 'dark' ? 'light' : 'dark';
    });
  }, [system]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      scheme,
      colors: colors[scheme],
      isDark: scheme === 'dark',
      setMode,
      toggle,
      spacing,
      radius,
      typography,
      shadows,
    }),
    [mode, scheme, toggle]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}

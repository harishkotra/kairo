import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { WorkspaceProvider } from '../src/workspace/WorkspaceContext';
import { workspace } from '../src/theme/tokens';
import { initLaminar } from '../src/telemetry/laminar';

export default function RootLayout() {
  useEffect(() => {
    // Only attempt Laminar init if a project API key is configured.
    // The SDK cannot run in all web environments, so we check at runtime.
    const key = (
      process.env.EXPO_PUBLIC_LMNR_PROJECT_API_KEY ??
      process.env.LMNR_PROJECT_API_KEY ??
      ''
    ).trim();
    if (key) {
      initLaminar();
    }
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider forcedScheme="dark">
          <WorkspaceProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: workspace.bg },
                animation: 'fade',
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen
                name="preview"
                options={{
                  presentation: 'modal',
                  animation: 'slide_from_bottom',
                }}
              />
            </Stack>
          </WorkspaceProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: workspace.bg },
});

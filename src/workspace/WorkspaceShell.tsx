import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { workspace } from '../theme/tokens';
import { TopBar } from './TopBar';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';
import { InfiniteCanvas } from './InfiniteCanvas';

export function WorkspaceShell() {
  const { width } = useWindowDimensions();
  const compact = width < 900;
  const showRight = width >= 1100;
  const showLeft = width >= 720;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <View style={styles.root}>
        <TopBar />
        <View style={styles.body}>
          {showLeft && !compact ? <LeftSidebar /> : null}
          <InfiniteCanvas />
          {showRight ? <RightSidebar /> : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: workspace.bg,
  },
  root: {
    flex: 1,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
  },
});

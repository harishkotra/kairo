import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { workspace } from '../theme/tokens';
import { TopBar } from './TopBar';
import { ActivityTicker } from './ActivityTicker';
import { LeftSidebar } from './LeftSidebar';
import { InspectorPanel } from './InspectorPanel';
import { InfiniteCanvas } from './InfiniteCanvas';
import { EventTimeline, EventTimelineStrip } from './EventTimeline';
import { ArtifactGraphView } from './ArtifactGraphView';
import { AgentDagView } from './AgentDagView';
import { DecisionExplorer } from './DecisionExplorer';
import { MemoryView } from './MemoryView';
import { MetricsDashboard } from './MetricsDashboard';
import { LivePreviewFab } from './LivePreviewPanel';
import { ReplayBar } from './ReplayBar';
import { useWorkspace } from './WorkspaceContext';

export function WorkspaceShell() {
  const { width } = useWindowDimensions();
  const { view, phase, events, selectedArtifactId } = useWorkspace();
  const compact = width < 900;
  const showRight = width >= 1000;
  const showLeft =
    width >= 720 && (view === 'canvas' || view === 'dag');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <View style={styles.root}>
        <TopBar />
        <ActivityTicker />
        <View style={styles.body}>
          {showLeft && !compact ? <LeftSidebar /> : null}
          <View style={styles.center}>
            {view === 'canvas' ? (
              <>
                <InfiniteCanvas />
                <LivePreviewFab />
                {phase !== 'idle' || events.length > 0 ? (
                  <EventTimelineStrip />
                ) : null}
              </>
            ) : null}
            {view === 'timeline' ? <EventTimeline /> : null}
            {view === 'artifacts' ? <ArtifactGraphView /> : null}
            {view === 'dag' ? <AgentDagView /> : null}
            {view === 'decisions' ? <DecisionExplorer /> : null}
            {view === 'memory' ? <MemoryView /> : null}
            {view === 'metrics' ? <MetricsDashboard /> : null}
            {(phase === 'complete' ||
              phase === 'exporting' ||
              (events.length > 0 && phase === 'idle') ||
              selectedArtifactId) &&
            phase !== 'running' ? (
              <ReplayBar />
            ) : null}
          </View>
          {showRight ? <InspectorPanel /> : null}
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
  center: {
    flex: 1,
    minWidth: 0,
  },
});

import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { workspace, spacing, typography } from '../theme/tokens';
import { formatDuration } from './format';
import { useWorkspace } from './WorkspaceContext';

/**
 * Phase 6 — time-travel scrubber for a completed (or recorded) run.
 */
export function ReplayBar() {
  const {
    phase,
    events,
    runStartedAt,
    runDurationMs,
    replayActive,
    setReplayActive,
    replayCursorMs,
    setReplayCursorMs,
    replayPlaying,
    setReplayPlaying,
    isGenerating,
  } = useWorkspace();

  const canReplay =
    !isGenerating &&
    events.length > 0 &&
    runStartedAt != null &&
    (phase === 'complete' || phase === 'exporting' || phase === 'idle');

  if (!canReplay && !replayActive) return null;

  const duration = Math.max(runDurationMs, 1);
  const pct = Math.min(100, (replayCursorMs / duration) * 100);

  const onSlider = (value: number) => {
    setReplayActive(true);
    setReplayPlaying(false);
    setReplayCursorMs(Math.round(value));
  };

  return (
    <View style={styles.bar}>
      <Pressable
        onPress={() => {
          if (!replayActive) {
            setReplayActive(true);
            setReplayCursorMs(0);
          } else {
            setReplayActive(false);
            setReplayPlaying(false);
            setReplayCursorMs(duration);
          }
        }}
        style={[styles.modeBtn, replayActive && styles.modeBtnOn]}
      >
        <Ionicons
          name="play-back-circle-outline"
          size={16}
          color={replayActive ? workspace.accentHot : workspace.textMuted}
        />
        <Text
          style={[
            styles.modeLabel,
            replayActive && { color: workspace.accentHot },
          ]}
        >
          {replayActive ? 'Replay on' : 'Replay'}
        </Text>
      </Pressable>

      {replayActive ? (
        <>
          <Pressable
            onPress={() => {
              if (replayCursorMs >= duration) setReplayCursorMs(0);
              setReplayPlaying(!replayPlaying);
            }}
            style={styles.playBtn}
          >
            <Ionicons
              name={replayPlaying ? 'pause' : 'play'}
              size={14}
              color={workspace.bg}
            />
          </Pressable>

          <Text style={styles.time}>{formatDuration(replayCursorMs)}</Text>

          <View style={styles.trackWrap}>
            {Platform.OS === 'web' ? (
              <WebRange
                min={0}
                max={duration}
                value={replayCursorMs}
                onChange={onSlider}
              />
            ) : (
              <Pressable
                style={styles.track}
                onPress={(e) => {
                  const w = 280;
                  const x = e.nativeEvent.locationX ?? 0;
                  onSlider(Math.round((x / w) * duration));
                }}
              >
                <View style={[styles.fill, { width: `${pct}%` }]} />
                <View
                  style={[styles.thumb, { left: `${Math.max(0, pct - 1)}%` }]}
                />
              </Pressable>
            )}
          </View>

          <Text style={styles.time}>{formatDuration(duration)}</Text>

          <Pressable
            onPress={() => {
              setReplayCursorMs(0);
              setReplayPlaying(false);
            }}
            style={styles.ghost}
          >
            <Text style={styles.ghostLabel}>0s</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setReplayCursorMs(duration);
              setReplayPlaying(false);
            }}
            style={styles.ghost}
          >
            <Text style={styles.ghostLabel}>End</Text>
          </Pressable>
        </>
      ) : (
        <Text style={styles.hint}>
          Scrub the last run — agents, artifacts, timeline, and decisions
          time-travel together.
        </Text>
      )}
    </View>
  );
}

function WebRange({
  min,
  max,
  value,
  onChange,
}: {
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  // RN web: native range element
  return React.createElement('input', {
    type: 'range',
    min,
    max,
    value,
    onChange: (e: { target: { value: string } }) =>
      onChange(Number(e.target.value)),
    style: {
      width: '100%',
      accentColor: workspace.accent,
      cursor: 'pointer',
    },
  });
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing[3],
    paddingVertical: 8,
    backgroundColor: workspace.panel,
    borderTopWidth: 1,
    borderTopColor: workspace.border,
    minHeight: 48,
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: workspace.border,
    backgroundColor: workspace.panelElevated,
  },
  modeBtnOn: {
    borderColor: workspace.accentHot + '66',
    backgroundColor: 'rgba(232, 195, 106, 0.1)',
  },
  modeLabel: {
    color: workspace.textMuted,
    fontSize: 11,
    fontFamily: workspace.mono,
    fontWeight: typography.weight.semibold,
  },
  playBtn: {
    width: 28,
    height: 28,
    backgroundColor: workspace.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  time: {
    color: workspace.textMuted,
    fontSize: 11,
    fontFamily: workspace.mono,
    minWidth: 40,
  },
  trackWrap: {
    flex: 1,
    minWidth: 120,
    maxWidth: 420,
    justifyContent: 'center',
  },
  track: {
    height: 8,
    backgroundColor: workspace.border,
    position: 'relative',
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: workspace.accent,
  },
  thumb: {
    position: 'absolute',
    width: 12,
    height: 12,
    backgroundColor: workspace.accentHot,
    marginLeft: -6,
    top: -2,
  },
  ghost: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ghostLabel: {
    color: workspace.textDim,
    fontSize: 11,
    fontFamily: workspace.mono,
  },
  hint: {
    color: workspace.textDim,
    fontSize: 11,
    flex: 1,
  },
});

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { ThemeProvider } from '../theme/ThemeProvider';
import { workspace, typography } from '../theme/tokens';
import type { AgentId, ScreenSpec } from '../agents/types';
import { DynamicScreen } from '../generated/DynamicScreen';

type Props = {
  agentId: AgentId;
  screenSpec: ScreenSpec;
  projectName: string;
  label: string;
  color: string;
  x: number;
  y: number;
  scale: number;
  darkMode: boolean;
  onMove: (x: number, y: number) => void;
  onSelect: () => void;
};

/** Design size of the phone shell (canvas units) */
const FRAME_W = 260;
const FRAME_H = 532;
const BEZEL = 9;
const SCREEN_R = 36;
const SHELL_R = 42;

/**
 * Figma / FlutterFlow-style device frame.
 */
export function PhonePreview({
  screenSpec,
  projectName,
  color,
  x,
  y,
  scale,
  darkMode,
  onMove,
  onSelect,
}: Props) {
  const tx = useSharedValue(x);
  const ty = useSharedValue(y);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const appear = useSharedValue(0);

  React.useEffect(() => {
    tx.value = x;
    ty.value = y;
  }, [x, y, tx, ty]);

  React.useEffect(() => {
    appear.value = 0;
    appear.value = withTiming(1, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
  }, [screenSpec.id, appear]);

  const pan = Gesture.Pan()
    .onBegin(() => {
      startX.value = tx.value;
      startY.value = ty.value;
      runOnJS(onSelect)();
    })
    .onUpdate((e) => {
      tx.value = startX.value + e.translationX / scale;
      ty.value = startY.value + e.translationY / scale;
    })
    .onEnd(() => {
      runOnJS(onMove)(tx.value, ty.value);
    });

  const style = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: 0.96 + appear.value * 0.04 },
    ],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.wrap, style]}>
        <View style={styles.labelRow}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={styles.label} numberOfLines={1}>
            {screenSpec.title}
          </Text>
          <Text style={styles.meta}>Device</Text>
        </View>

        <View style={styles.shell}>
          <View style={styles.silent} />
          <View style={styles.volUp} />
          <View style={styles.volDown} />
          <View style={styles.power} />

          <View style={styles.screen}>
            <View style={styles.island} />
            <View style={styles.screenContent}>
              <ThemeProvider forcedScheme={darkMode ? 'dark' : 'light'}>
                <DynamicScreen
                  spec={screenSpec}
                  projectName={projectName}
                />
              </ThemeProvider>
            </View>
            <View style={styles.homeBar} />
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    zIndex: 5,
    width: FRAME_W,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  label: {
    color: workspace.text,
    fontSize: 12,
    fontWeight: typography.weight.semibold,
    flex: 1,
    letterSpacing: -0.1,
  },
  meta: {
    color: workspace.textDim,
    fontSize: 10,
    fontFamily: workspace.mono,
    letterSpacing: 0.3,
  },
  shell: {
    width: FRAME_W,
    height: FRAME_H,
    borderRadius: SHELL_R,
    backgroundColor: '#0B0B0D',
    borderWidth: 1.5,
    borderColor: '#2C2C30',
    padding: BEZEL,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 28 },
    shadowOpacity: 0.55,
    shadowRadius: 48,
    elevation: 24,
  },
  silent: {
    position: 'absolute',
    left: -2,
    top: 88,
    width: 3,
    height: 22,
    borderTopLeftRadius: 1,
    borderBottomLeftRadius: 1,
    backgroundColor: '#3A3A3C',
  },
  volUp: {
    position: 'absolute',
    left: -2,
    top: 128,
    width: 3,
    height: 40,
    backgroundColor: '#3A3A3C',
  },
  volDown: {
    position: 'absolute',
    left: -2,
    top: 176,
    width: 3,
    height: 40,
    backgroundColor: '#3A3A3C',
  },
  power: {
    position: 'absolute',
    right: -2,
    top: 148,
    width: 3,
    height: 56,
    backgroundColor: '#3A3A3C',
  },
  screen: {
    flex: 1,
    borderRadius: SCREEN_R,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  island: {
    position: 'absolute',
    top: 9,
    alignSelf: 'center',
    left: (FRAME_W - BEZEL * 2) / 2 - 54,
    width: 108,
    height: 28,
    borderRadius: 18,
    backgroundColor: '#000',
    zIndex: 30,
    borderWidth: 1,
    borderColor: '#1C1C1E',
  },
  screenContent: {
    flex: 1,
  },
  homeBar: {
    position: 'absolute',
    bottom: 7,
    left: (FRAME_W - BEZEL * 2) / 2 - 54,
    width: 108,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.32)',
    zIndex: 30,
  },
});

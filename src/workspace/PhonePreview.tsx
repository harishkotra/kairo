import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { ThemeProvider } from '../theme/ThemeProvider';
import { layout, workspace, typography } from '../theme/tokens';
import { HomeScreen } from '../generated/screens/HomeScreen';
import { ProfileScreen } from '../generated/screens/ProfileScreen';
import { SettingsScreen } from '../generated/screens/SettingsScreen';
import type { AgentId } from '../agents/types';

type ScreenKey = 'home' | 'profile' | 'settings';

type Props = {
  agentId: AgentId;
  screenKey: ScreenKey;
  label: string;
  color: string;
  x: number;
  y: number;
  scale: number;
  darkMode: boolean;
  onMove: (x: number, y: number) => void;
  onSelect: () => void;
};

function ScreenBody({ screenKey }: { screenKey: ScreenKey }) {
  if (screenKey === 'profile') return <ProfileScreen />;
  if (screenKey === 'settings') return <SettingsScreen />;
  return <HomeScreen />;
}

export function PhonePreview({
  screenKey,
  label,
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

  React.useEffect(() => {
    tx.value = x;
    ty.value = y;
  }, [x, y, tx, ty]);

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
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }));

  const phoneScale = 0.72;
  const w = layout.phoneWidth * phoneScale;
  const h = layout.phoneHeight * phoneScale;

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.wrap, style]}>
        <View style={styles.labelRow}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.dragHint}>drag</Text>
        </View>
        <View
          style={[
            styles.phone,
            {
              width: w,
              height: h,
              borderColor: color + '66',
              borderRadius: layout.phoneRadius * phoneScale,
            },
          ]}
        >
          <View style={styles.notch} />
          <View style={styles.screenClip}>
            <View
              style={{
                width: layout.phoneWidth,
                height: layout.phoneHeight,
                transform: [{ scale: phoneScale }],
              }}
            >
              <ThemeProvider forcedScheme={darkMode ? 'dark' : 'light'}>
                <View style={{ flex: 1, height: layout.phoneHeight - 40 }}>
                  <ScreenBody screenKey={screenKey} />
                </View>
              </ThemeProvider>
            </View>
          </View>
          <View style={styles.homeBar} />
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    zIndex: 5,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    color: workspace.text,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    flex: 1,
  },
  dragHint: {
    color: workspace.textDim,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  phone: {
    backgroundColor: '#0A0A0C',
    borderWidth: 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 28,
    elevation: 16,
  },
  notch: {
    alignSelf: 'center',
    width: 72,
    height: 16,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: '#000',
    zIndex: 2,
  },
  screenClip: {
    flex: 1,
    overflow: 'hidden',
  },
  homeBar: {
    alignSelf: 'center',
    width: 80,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginVertical: 6,
  },
});

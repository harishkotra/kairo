import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { workspace } from '../theme/tokens';

/**
 * Count-up hook: animates a displayed number toward `target` whenever it
 * changes, so stats feel alive instead of snapping.
 */
export function useCountUp(target: number, durationMs = 600): number {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / durationMs);
      const eased = 1 - (1 - t) * (1 - t) * (1 - t);
      const v = from + (target - from) * eased;
      setDisplay(v);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      fromRef.current = target;
    };
  }, [target, durationMs]);

  return display;
}

/**
 * Flash hook: returns an animated opacity that pulses briefly whenever
 * `signal` changes — used to highlight a stat card that just updated.
 */
export function useChangeFlash(signal: unknown): Animated.Value {
  const flash = useRef(new Animated.Value(0)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    flash.setValue(1);
    Animated.timing(flash, {
      toValue: 0,
      duration: 900,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [signal, flash]);
  return flash;
}

/** Minimal single-hue sparkline (line + soft area + endpoint dot). */
export function Sparkline({
  data,
  width = 120,
  height = 28,
  color = workspace.accent,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (data.length < 2) return <View style={{ width, height }} />;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const pts = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * w,
    y: pad + h - ((v - min) / span) * h,
  }));
  const line = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');
  const area = `${line} L${(pad + w).toFixed(1)},${(pad + h).toFixed(1)} L${pad},${(pad + h).toFixed(1)} Z`;
  const last = pts[pts.length - 1];
  return (
    <Svg width={width} height={height}>
      <Path d={area} fill={color} opacity={0.12} />
      <Path d={line} stroke={color} strokeWidth={2} fill="none" />
      <Circle cx={last.x} cy={last.y} r={3} fill={color} />
    </Svg>
  );
}

/** Slim meter bar for 0..1 fractions (confidence, consistency, a11y). */
export function Meter({
  fraction,
  color = workspace.accent,
}: {
  fraction: number;
  color?: string;
}) {
  const clamped = Math.max(0, Math.min(1, fraction));
  const anim = useRef(new Animated.Value(clamped)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: clamped,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [clamped, anim]);
  return (
    <View style={meterStyles.track}>
      <Animated.View
        style={[
          meterStyles.fill,
          {
            backgroundColor: color,
            width: anim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
}

const meterStyles = StyleSheet.create({
  track: {
    height: 4,
    backgroundColor: workspace.border,
    marginTop: 8,
    overflow: 'hidden',
  },
  fill: { height: 4 },
});

/**
 * Bucket timestamped events into a cumulative series for sparklines.
 */
export function cumulativeSeries(
  timestamps: number[],
  buckets = 24
): number[] {
  if (!timestamps.length) return [];
  const sorted = [...timestamps].sort((a, b) => a - b);
  const start = sorted[0];
  const end = sorted[sorted.length - 1];
  const span = Math.max(1, end - start);
  const out = new Array(buckets).fill(0);
  for (const ts of sorted) {
    const i = Math.min(buckets - 1, Math.floor(((ts - start) / span) * buckets));
    out[i] += 1;
  }
  let acc = 0;
  return out.map((n) => (acc += n));
}

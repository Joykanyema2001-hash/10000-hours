import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { HOUR, MINUTE } from '../lib/time';
import { colors, springs } from '../theme';

/**
 * One clock hand. The hand is drawn pointing at 12 inside a full-size square,
 * so rotating the square rotates the hand around the clock's centre.
 */
export function Hand({ box, length, width, tail = 0, angle, color = colors.ink, opacity }: {
  box: number;
  length: number;
  width: number;
  tail?: number;
  angle: SharedValue<number>;
  color?: string;
  opacity?: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${angle.value}deg` }],
    opacity: opacity ? opacity.value : 1,
  }));
  const c = box / 2;
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <View
        style={{
          position: 'absolute',
          left: c - width / 2,
          top: c - length,
          width,
          height: length + Math.max(tail, width / 2),
          borderRadius: width / 2,
          backgroundColor: color,
        }}
      />
    </Animated.View>
  );
}

type Props = {
  /** Time banked before the current run. */
  bankedMs: number;
  /** Epoch ms the current run started, or null while paused. */
  runningSince: number | null;
  /** Whole hours completed this session; when it increments the face pulses. */
  hourCount: number;
  size?: number;
  accessibilityLabel?: string;
};

/**
 * The session clock. It's a stopwatch face, not wall time:
 *  - the long hand makes one full lap per hour you practise (so every lap = +1 hour),
 *  - the short hand moves 1/12 of the dial per hour,
 *  - a thin second hand sweeps continuously so you can see it's live.
 *
 * Angles are computed on the UI thread every frame from timestamps (not from a JS
 * interval), so it stays smooth at 60/120Hz and correct after backgrounding.
 */
export function ClockFace({ bankedMs, runningSince, hourCount, size = 300, accessibilityLabel }: Props) {
  const reduce = useReducedMotion();
  const k = size / 300;

  const banked = useSharedValue(bankedMs);
  const since = useSharedValue(runningSince ?? -1);
  const elapsed = useSharedValue(bankedMs);
  const intro = useSharedValue(reduce ? 1 : 0);
  const live = useSharedValue(runningSince != null ? 1 : 0.35);
  const pulse = useSharedValue(1);

  useEffect(() => {
    banked.value = bankedMs;
    since.value = runningSince ?? -1;
    live.value = withTiming(runningSince != null ? 1 : 0.35, { duration: 240 });
  }, [bankedMs, runningSince]);

  // Hands sweep into place on open (rotation spring, damping 0.8 — Apple's rotation value).
  useEffect(() => {
    if (!reduce) intro.value = withSpring(1, { dampingRatio: 0.8, duration: 900 });
  }, []);

  // Each completed hour: a single, causal pulse (no looping animation).
  useEffect(() => {
    if (hourCount === 0 || reduce) return;
    pulse.value = withSequence(withSpring(1.06, springs.celebrate), withSpring(1, springs.ui));
  }, [hourCount]);

  useFrameCallback(() => {
    elapsed.value = banked.value + (since.value > 0 ? Date.now() - since.value : 0);
  });

  const minuteAngle = useDerivedValue(() => ((elapsed.value % HOUR) / HOUR) * 360 * intro.value);
  const hourAngle = useDerivedValue(() => ((elapsed.value % (12 * HOUR)) / (12 * HOUR)) * 360 * intro.value);
  const secondAngle = useDerivedValue(() => ((elapsed.value % MINUTE) / MINUTE) * 360 * intro.value);

  const faceStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <Animated.View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={[{ width: size, height: size }, faceStyle]}
    >
      <Svg width={size} height={size} viewBox="0 0 300 300">
        <Circle cx={150} cy={150} r={138} stroke={colors.ink} strokeWidth={20} fill="none" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <Circle key={i} cx={150 + Math.sin(a) * 112} cy={150 - Math.cos(a) * 112} r={i % 3 === 0 ? 4 : 2.5} fill={colors.ink} />;
        })}
      </Svg>
      <Hand box={size} length={73 * k} width={16 * k} angle={hourAngle} opacity={live} />
      <Hand box={size} length={92 * k} width={16 * k} angle={minuteAngle} opacity={live} />
      <Hand box={size} length={114 * k} width={4 * k} tail={22 * k} angle={secondAngle} opacity={live} />
      <View pointerEvents="none" style={[styles.cap, { width: 22 * k, height: 22 * k, borderRadius: 11 * k, marginLeft: -11 * k, marginTop: -11 * k }]}>
        <View style={{ width: 8 * k, height: 8 * k, borderRadius: 4 * k, backgroundColor: colors.lime }} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cap: { position: 'absolute', left: '50%', top: '50%', backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
});

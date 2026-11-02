import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { colors, springs } from '../theme';

/** Track + fill that grows from its current value to `fraction` (interruptible spring). */
export function ProgressBar({ fraction, delay = 0, height = 12 }: { fraction: number; delay?: number; height?: number }) {
  const reduce = useReducedMotion();
  const p = useSharedValue(reduce ? fraction : 0);
  useEffect(() => {
    const f = Math.min(1, Math.max(0, fraction));
    p.value = reduce ? withTiming(f, { duration: 150 }) : withDelay(delay, withSpring(f, springs.ui));
  }, [fraction]);
  const fill = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return (
    <View style={{ height, backgroundColor: colors.track, borderRadius: height / 2, overflow: 'hidden' }}>
      <Animated.View style={[{ height: '100%', minWidth: fraction > 0 ? height / 2 : 0, backgroundColor: colors.ink, borderRadius: height / 2 }, fill]} />
    </View>
  );
}

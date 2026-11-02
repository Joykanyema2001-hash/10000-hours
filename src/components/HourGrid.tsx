import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { colors, springs } from '../theme';

const Cell = memo(function Cell({ fill, delay }: { fill: number; delay: number }) {
  const reduce = useReducedMotion();
  const p = useSharedValue(reduce ? fill : 0);
  useEffect(() => {
    p.value = reduce ? withTiming(fill, { duration: 150 }) : withDelay(delay, withSpring(fill, springs.snappy));
  }, [fill]);
  const style = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return (
    <View style={styles.cell}>
      <Animated.View style={[styles.fill, style]} />
    </View>
  );
});

/** 100 squares × 100 hours. Filled squares cascade in on open. */
export function HourGrid({ hours }: { hours: number }) {
  const squares = Math.min(100, hours / 100);
  const full = Math.floor(squares);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Grid of 100 squares, ${full} filled${squares - full > 0 ? ' and one partly filled' : ''}`}
      style={{ gap: 3 }}
    >
      {Array.from({ length: 10 }, (_, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: 3 }}>
          {Array.from({ length: 10 }, (_, c) => {
            const i = r * 10 + c;
            const fill = i < full ? 1 : i === full ? squares - full : 0;
            return <Cell key={c} fill={fill} delay={Math.min(i, full) * 28} />;
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: { flex: 1, height: 27, borderWidth: 2, borderColor: colors.ink, borderRadius: 6, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.ink },
});

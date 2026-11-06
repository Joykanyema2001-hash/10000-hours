import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedProps, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { colors, fonts, springs } from '../theme';
import { Text } from './Text';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Ring that fills toward today's goal. Overflows into a second lap in lime. */
export function GoalRing({ fraction, size = 104 }: { fraction: number; size?: number }) {
  const reduce = useReducedMotion();
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = useSharedValue(reduce ? fraction : 0);
  useEffect(() => {
    p.value = reduce ? withTiming(fraction, { duration: 150 }) : withSpring(fraction, { ...springs.ui, duration: 600 });
  }, [fraction]);
  const first = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - Math.min(1, p.value)) }));
  const extra = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - Math.min(1, Math.max(0, p.value - 1))) }));
  const pct = Math.round(fraction * 100);
  return (
    <View accessible accessibilityLabel={`${pct}% of today's goal`} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.track} strokeWidth={stroke} fill="none" />
        <AnimatedCircle cx={size / 2} cy={size / 2} r={r} stroke={colors.ink} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${c} ${c}`} animatedProps={first} />
        <AnimatedCircle cx={size / 2} cy={size / 2} r={r} stroke={colors.lime} strokeWidth={stroke - 6} fill="none" strokeLinecap="round" strokeDasharray={`${c} ${c}`} animatedProps={extra} />
      </Svg>
      <Text style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 26 }} maxFontSizeMultiplier={1}>{Math.min(pct, 999)}%</Text>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 14, color: colors.muted }} maxFontSizeMultiplier={1}>of goal</Text>
    </View>
  );
}

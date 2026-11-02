import { useEffect } from 'react';
import { View } from 'react-native';
import { useDerivedValue, useReducedMotion, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { colors, fonts } from '../theme';
import { Hand } from './ClockFace';
import { Text } from './Text';

/** Small clock whose minute hand sweeps one lap and settles — "time passing" on first open. */
function MiniClock({ delay }: { delay: number }) {
  const reduce = useReducedMotion();
  const lap = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (!reduce) lap.value = withDelay(delay, withSpring(1, { dampingRatio: 0.8, duration: 1100 }));
  }, []);
  const k = 40 / 24;
  const minute = useDerivedValue(() => (lap.value - 1) * 360); // ends pointing at 12
  const hour = useDerivedValue(() => 127 * lap.value); // ends at ~4 o'clock, like the icon
  return (
    <View style={{ width: 40, height: 40 }}>
      <Svg width={40} height={40} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={10} stroke={colors.ink} strokeWidth={2} fill="none" />
      </Svg>
      <Hand box={40} length={6 * k} width={2 * k} angle={minute} />
      <Hand box={40} length={5 * k} width={2 * k} angle={hour} />
    </View>
  );
}

export function Logo() {
  return (
    <View
      accessible
      accessibilityLabel="10,000 Hours logo"
      style={{ width: 240, height: 240, borderWidth: 16, borderColor: colors.ink, borderRadius: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 }}
    >
      <Text style={{ fontFamily: fonts.display, fontSize: 48, lineHeight: 56, marginRight: 2 }} maxFontSizeMultiplier={1}>
        10
      </Text>
      {[0, 1, 2].map((i) => (
        <MiniClock key={i} delay={350 + i * 120} />
      ))}
    </View>
  );
}


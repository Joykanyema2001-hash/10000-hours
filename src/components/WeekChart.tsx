import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { formatDuration } from '../lib/time';
import { colors, fonts, springs } from '../theme';
import { Text } from './Text';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const H = 112;

function Bar({ fraction, today, delay }: { fraction: number; today: boolean; delay: number }) {
  const reduce = useReducedMotion();
  const p = useSharedValue(reduce ? fraction : 0);
  useEffect(() => {
    p.value = reduce ? withTiming(fraction, { duration: 150 }) : withDelay(delay, withSpring(fraction, springs.ui));
  }, [fraction]);
  const style = useAnimatedStyle(() => ({ height: Math.max(fraction > 0 ? 6 : 0, p.value * H) }));
  return (
    <Animated.View
      style={[
        { width: '100%', borderRadius: 8, backgroundColor: today ? colors.lime : colors.ink, borderWidth: today ? 3 : 0, borderColor: colors.ink },
        style,
      ]}
    />
  );
}

/** Last 7 days of practice with a dashed line at the daily goal. Today is the lime bar. */
export function WeekChart({ days, goalMs }: { days: { start: number; ms: number }[]; goalMs: number }) {
  const max = Math.max(goalMs * 1.15, ...days.map((d) => d.ms), 1);
  const goalY = (goalMs / max) * H;
  return (
    <View
      accessible
      accessibilityLabel={days.map((d) => `${DAY_NAMES[new Date(d.start).getDay()]} ${formatDuration(d.ms)}`).join(', ')}
      style={{ gap: 8 }}
    >
      <View style={{ height: H, flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: goalY, borderTopWidth: 2, borderStyle: 'dashed', borderColor: colors.muted }} />
        {days.map((d, i) => (
          <View key={d.start} style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}>
            <Bar fraction={d.ms / max} today={i === days.length - 1} delay={i * 45} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {days.map((d, i) => (
          <Text key={d.start} style={{ flex: 1, textAlign: 'center', fontFamily: i === days.length - 1 ? fonts.bodyBold : fonts.body, fontSize: 13, color: i === days.length - 1 ? colors.ink : colors.muted }}>
            {DAYS[new Date(d.start).getDay()]}
          </Text>
        ))}
      </View>
    </View>
  );
}

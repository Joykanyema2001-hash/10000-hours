import { View } from 'react-native';
import Animated, { ZoomIn, useReducedMotion } from 'react-native-reanimated';
import { withCommas } from '../lib/time';
import { colors, fonts } from '../theme';
import { CheckCircle, OpenCircle } from './Icons';
import { Text } from './Text';

export function MilestoneRow({ name, hours, reached, index }: { name: string; hours: number; reached: boolean; index: number }) {
  const reduce = useReducedMotion();
  return (
    <View
      accessible
      accessibilityLabel={`${name}, ${withCommas(hours)} hours, ${reached ? 'reached' : 'not reached yet'}`}
      style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 2, borderBottomColor: colors.divider }}
    >
      {reached ? (
        <Animated.View entering={reduce ? undefined : ZoomIn.delay(150 + index * 70).springify().dampingRatio(0.7).duration(380)}>
          <CheckCircle />
        </Animated.View>
      ) : (
        <OpenCircle />
      )}
      <Text style={{ flex: 1, fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 22 }}>{name}</Text>
      <Text style={{ fontFamily: fonts.body, fontSize: 15, lineHeight: 20, color: colors.muted }}>{withCommas(hours)} h</Text>
    </View>
  );
}

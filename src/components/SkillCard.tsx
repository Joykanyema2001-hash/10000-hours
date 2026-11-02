import { View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { GOAL_HOURS, HOUR, percentOfGoal, withCommas } from '../lib/time';
import { colors, fonts } from '../theme';
import { PressableScale } from './PressableScale';
import { ProgressBar } from './ProgressBar';
import { Text } from './Text';

export function SkillCard({ name, totalMs, index, onPress }: { name: string; totalMs: number; index: number; onPress: () => void }) {
  const reduce = useReducedMotion();
  const hours = Math.floor(totalMs / HOUR);
  return (
    <Animated.View entering={reduce ? undefined : FadeInDown.delay(80 + index * 60).springify().dampingRatio(1).duration(380)}>
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${withCommas(hours)} hours, ${percentOfGoal(totalMs)} of 10,000`}
        accessibilityHint="Opens skill progress"
        style={{ gap: 10, padding: 16, backgroundColor: colors.white, borderWidth: 3, borderColor: colors.ink, borderRadius: 20 }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 18, lineHeight: 24 }}>{name}</Text>
          <Text style={{ fontFamily: fonts.displaySemi, fontSize: 20, lineHeight: 26 }}>{withCommas(hours)} h</Text>
        </View>
        <ProgressBar fraction={totalMs / (GOAL_HOURS * HOUR)} delay={200 + index * 60} />
        <Text variant="caption">{percentOfGoal(totalMs)} of 10,000 hours</Text>
      </PressableScale>
    </Animated.View>
  );
}

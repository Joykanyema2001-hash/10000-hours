import { View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { GOAL_HOURS, HOUR, percentOfGoal, withCommas } from '../lib/time';
import { colors, fonts } from '../theme';
import { PlayIcon } from './Icons';
import { PressableScale } from './PressableScale';
import { ProgressBar } from './ProgressBar';
import { SkillIcon } from './SkillIcon';
import { Text } from './Text';

type Props = { name: string; icon?: string; totalMs: number; index: number; onPress: () => void; onStart?: () => void; live?: boolean };

export function SkillCard({ name, icon, totalMs, index, onPress, onStart, live }: Props) {
  const reduce = useReducedMotion();
  const hours = Math.floor(totalMs / HOUR);
  return (
    <Animated.View entering={reduce ? undefined : FadeInDown.delay(80 + index * 60).springify().dampingRatio(1).duration(380)}>
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${withCommas(hours)} hours, ${percentOfGoal(totalMs)} of 10,000`}
        accessibilityHint="Opens skill progress"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, backgroundColor: colors.white, borderWidth: 3, borderColor: colors.ink, borderRadius: 20 }}
      >
        <SkillIcon icon={icon} size={44} />
        <View style={{ flex: 1, minWidth: 0, gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <Text style={{ flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 18, lineHeight: 24 }} numberOfLines={1}>{name}</Text>
            <Text style={{ fontFamily: fonts.displaySemi, fontSize: 20, lineHeight: 26 }}>{withCommas(hours)} h</Text>
          </View>
          <ProgressBar fraction={totalMs / (GOAL_HOURS * HOUR)} delay={200 + index * 60} />
          <Text variant="caption">{live ? 'In session now · ' : ''}{percentOfGoal(totalMs)} of 10,000 hours</Text>
        </View>
        {onStart ? (
          <PressableScale
            onPress={onStart}
            scaleTo={0.9}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={live ? `Open ${name} timer` : `Start a ${name} session`}
            style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: live ? colors.lime : colors.ink, borderWidth: live ? 3 : 0, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}
          >
            <PlayIcon size={20} color={live ? colors.ink : colors.lime} />
          </PressableScale>
        ) : null}
      </PressableScale>
    </Animated.View>
  );
}

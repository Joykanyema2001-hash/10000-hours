import Trophy from 'lucide-react-native/icons/trophy';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, FadeInDown, FadeInLeft, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import type { CoachPlan } from '../lib/coach';
import { haptics } from '../lib/haptics';
import { colors, fonts } from '../theme';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

const DOT = 40;

/** Three headline numbers for a plan. */
export function PlanStats({ plan }: { plan: CoachPlan }) {
  const reduce = useReducedMotion();
  const steps = plan.stages.reduce((n, s) => n + s.steps.length, 0);
  const hours = Math.round((plan.minutesPerWeek / 60) * 10) / 10;
  const tiles: [string, string][] = [
    [String(plan.stages.length), plan.stages.length === 1 ? 'stage' : 'stages'],
    [String(steps), steps === 1 ? 'step' : 'steps'],
    [`${hours}h`, 'a week'],
  ];
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {tiles.map(([value, label], i) => (
        <Animated.View
          key={label}
          entering={reduce ? undefined : FadeInDown.delay(80 + i * 70).springify().dampingRatio(0.8).duration(420)}
          style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 18, backgroundColor: i === 0 ? colors.lime : colors.white, borderWidth: 3, borderColor: colors.ink }}
        >
          <Text style={{ fontFamily: fonts.display, fontSize: 28, lineHeight: 32 }} maxFontSizeMultiplier={1.2}>{value}</Text>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.muted }}>{label}</Text>
        </Animated.View>
      ))}
    </View>
  );
}

/**
 * The plan as a journey: numbered stages strung on a line that draws itself
 * from the start down to mastery.
 */
export function PlanJourney({ plan }: { plan: CoachPlan }) {
  const reduce = useReducedMotion();
  const grow = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (!reduce) grow.value = withDelay(250, withTiming(1, { duration: 400 + plan.stages.length * 220, easing: Easing.out(Easing.cubic) }));
  }, [reduce, grow, plan.stages.length]);
  const line = useAnimatedStyle(() => ({ transform: [{ scaleY: grow.value }] }));
  const enter = (i: number) => (reduce ? undefined : FadeInLeft.delay(300 + i * 160).springify().dampingRatio(0.9).duration(420));

  return (
    <View>
      {/* The path: drawn behind the dots, growing downward. */}
      <Animated.View
        style={[{ position: 'absolute', left: DOT / 2 - 2, top: DOT / 2, bottom: DOT / 2, width: 4, borderRadius: 2, backgroundColor: colors.ink, transformOrigin: 'top' }, line]}
      />
      <View style={{ gap: 14 }}>
        {plan.stages.map((s, i) => (
          <Animated.View key={s.title + i} entering={enter(i)} style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ width: DOT, height: DOT, borderRadius: DOT / 2, borderWidth: 3, borderColor: colors.ink, backgroundColor: i === 0 ? colors.lime : colors.white, alignItems: 'center', justifyContent: 'center', marginTop: 12 }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 18, lineHeight: 22 }}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1, padding: 14, borderRadius: 18, borderWidth: 3, borderColor: colors.ink, backgroundColor: i === 0 ? colors.lime : colors.white, gap: 8 }}>
              <View style={{ gap: 2 }}>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.muted }}>
                  Stage {i + 1} · {s.steps.length} {s.steps.length === 1 ? 'step' : 'steps'}
                </Text>
                <Text style={{ fontFamily: fonts.displaySemi, fontSize: 19, lineHeight: 23 }}>{s.title}</Text>
                <Text variant="body">{s.why}</Text>
              </View>
              <View style={{ gap: 6 }}>
                {s.steps.map((st) => (
                  <View key={st.title} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2.5, borderColor: colors.ink }} />
                    <Text style={{ flex: 1, fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20 }}>{st.title}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>
        ))}
        <Animated.View entering={enter(plan.stages.length)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
            <Trophy size={20} color={colors.lime} strokeWidth={2.25} />
          </View>
          <Text style={{ fontFamily: fonts.display, fontSize: 22, lineHeight: 26 }}>Mastery</Text>
        </Animated.View>
      </View>
    </View>
  );
}

/** One answer to a coach question: full-width, left-aligned, with a radio dot. */
export function OptionRow({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <PressableScale
      onPress={() => {
        if (!selected) haptics.select();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 56,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 3,
        borderColor: colors.ink,
        borderRadius: 16,
        backgroundColor: selected ? colors.lime : colors.white,
      }}
    >
      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 3, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
        {selected ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.ink }} /> : null}
      </View>
      <Text style={{ flex: 1, fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 21 }}>{label}</Text>
    </PressableScale>
  );
}

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { Button } from '../../components/Button';
import { HourGrid } from '../../components/HourGrid';
import { IconButton } from '../../components/IconButton';
import { Text } from '../../components/Text';
import { haptics } from '../../lib/haptics';
import { useNow } from '../../lib/hooks';
import { latestLevel } from '../../lib/levels';
import { startSession } from '../../lib/session';
import { formatDuration, GOAL_HOURS, HOUR, percentOfGoal, withCommas } from '../../lib/time';
import { dailyRateMs, projectedYear, skillTotalMs, useStore } from '../../store';
import { colors, fonts } from '../../theme';

export default function SkillScreen() {
  const reduce = useReducedMotion();
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const skills = useStore((s) => s.skills);
  const sessions = useStore((s) => s.sessions);
  const active = useStore((s) => s.active);
  const goalMin = useStore((s) => s.dailyGoalMin);
  const liveHere = active?.skillId === id && active.runningSince != null;
  const now = useNow(liveHere ? 1000 : 60_000);

  const skill = skills.find((k) => k.id === id);
  const total = skill ? skillTotalMs({ skills, sessions, active }, skill.id, now) : 0;
  const hours = Math.floor(total / HOUR);
  const fromHours = from != null ? Number(from) : undefined;

  // Arriving from "Finish": celebrate a new level with a success haptic.
  useEffect(() => {
    if (fromHours == null) return;
    const before = latestLevel(fromHours);
    const after = latestLevel(hours);
    if (after && after !== before) haptics.success();
  }, []);

  if (!skill) {
    return (
      <SafeAreaView style={{ flex: 1, padding: 24, backgroundColor: colors.paper }}>
        <IconButton kind="back" onPress={() => router.back()} />
        <Text variant="title">Skill not found</Text>
      </SafeAreaView>
    );
  }

  const rate = dailyRateMs({ skills, sessions, dailyGoalMin: goalMin }, skill.id, now);
  const remaining = GOAL_HOURS * HOUR - total;
  const year = projectedYear(remaining, rate, now);
  const fasterYear = projectedYear(remaining, rate + 30 * 60_000, now);
  const rise = (d: number) => (reduce ? undefined : FadeInDown.delay(d).springify().dampingRatio(1).duration(400));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 8, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton kind="back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 18 }} accessibilityRole="header">{skill.name}</Text>
          <View style={{ width: 44 }} />
        </View>

        <View>
          <AnimatedNumber value={hours} from={fromHours} suffix=" hours" style={{ fontSize: 52, lineHeight: 54 }} />
          <Text variant="body" style={{ marginTop: 6, color: colors.muted }}>
            {remaining > 0 ? `${percentOfGoal(total)} of the way, ${withCommas(Math.ceil(remaining / HOUR))} to go` : 'All 10,000 hours. Master.'}
          </Text>
        </View>

        <Animated.View entering={rise(80)} style={{ padding: 14, backgroundColor: colors.white, borderWidth: 3, borderColor: colors.ink, borderRadius: 20 }}>
          <HourGrid hours={total / HOUR} />
          <Text variant="caption" style={{ marginTop: 10 }}>Each square is 100 hours</Text>
        </Animated.View>

        {remaining > 0 ? (
          <Animated.View entering={rise(160)} style={{ paddingVertical: 14, paddingHorizontal: 16, backgroundColor: colors.lime, borderWidth: 3, borderColor: colors.ink, borderRadius: 20 }}>
            <Text style={{ fontFamily: fonts.displaySemi, fontSize: 20, lineHeight: 24 }}>
              At {formatDuration(rate)} a day, you reach 10,000 in {year}
            </Text>
            {fasterYear < year ? (
              <Text style={{ marginTop: 6, fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 19 }}>
                Add 30 minutes a day and it's {fasterYear}.
              </Text>
            ) : null}
          </Animated.View>
        ) : null}

        <View style={{ flex: 1, minHeight: 16 }} />
        <Animated.View entering={rise(220)} style={{ flexDirection: 'row', gap: 12 }}>
          <Button variant="outline" size="md" label="Milestones" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/(tabs)/milestones', params: { skill: skill.id } })} />
          <Button
            size="md"
            label={active?.skillId === skill.id ? 'Open timer' : 'Start session'}
            disabled={!!active && active.skillId !== skill.id}
            accessibilityHint={active && active.skillId !== skill.id ? 'Finish your other session first' : undefined}
            style={{ flex: 1 }}
            onPress={() => startSession(skill.id)}
          />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

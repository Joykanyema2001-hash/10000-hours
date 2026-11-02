import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { PlayIcon, PlusIcon } from '../../components/Icons';
import { PressableScale } from '../../components/PressableScale';
import { SkillCard } from '../../components/SkillCard';
import { TAB_BAR_HEIGHT } from '../../components/TabBar';
import { Text } from '../../components/Text';
import { useNow } from '../../lib/hooks';
import { startSession } from '../../lib/session';
import { formatClock, formatDuration, MINUTE } from '../../lib/time';
import { elapsedOf, skillTotalMs, todayMs, useStore } from '../../store';
import { colors, fonts } from '../../theme';

export default function Today() {
  const reduce = useReducedMotion();
  const insets = useSafeAreaInsets();
  const skills = useStore((s) => s.skills);
  const sessions = useStore((s) => s.sessions);
  const active = useStore((s) => s.active);
  const goalMin = useStore((s) => s.dailyGoalMin);
  const lastSkillId = useStore((s) => s.lastSkillId);
  // Tick every second only while a session runs; otherwise once a minute is enough.
  const now = useNow(active?.runningSince != null ? 1000 : 60_000);

  const state = { skills, sessions, active };
  const today = todayMs(state, now);
  const goalMs = goalMin * MINUTE;
  const left = goalMs - today;
  const activeSkill = active ? skills.find((k) => k.id === active.skillId) : null;
  const startSkill = skills.find((k) => k.id === lastSkillId) ?? skills[0];

  const rise = (d: number) => (reduce ? undefined : FadeInDown.delay(d).springify().dampingRatio(1).duration(380));

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 24, gap: 20 }}>
        <Animated.View entering={rise(0)} style={{ gap: 8 }}>
          <View style={{ gap: 4 }}>
            <Text variant="label">Today</Text>
            <Text variant="display" accessibilityRole="header">{formatDuration(today)}</Text>
          </View>
          <Text variant="body" style={{ color: colors.muted }}>
            {left > 0 ? `${formatDuration(left)} left of your ${formatDuration(goalMs)} goal` : `Goal done. ${formatDuration(-left)} extra today.`}
          </Text>
        </Animated.View>

        <Animated.View layout={reduce ? undefined : LinearTransition.springify().dampingRatio(1)}>
          {active && activeSkill ? (
            <Animated.View entering={reduce ? FadeIn : FadeInDown.springify().dampingRatio(0.85)} exiting={FadeOut.duration(150)}>
              <PressableScale
                onPress={() => router.push('/timer')}
                accessibilityRole="button"
                accessibilityLabel={`${activeSkill.name} session ${active.runningSince != null ? 'running' : 'paused'}, ${formatClock(elapsedOf(active, now))}. Open timer`}
                style={{ backgroundColor: colors.lime, borderWidth: 3, borderColor: colors.ink, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}
              >
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: active.runningSince != null ? colors.ink : colors.muted }} />
                <View style={{ flex: 1 }}>
                  <Text variant="label">{activeSkill.name} · {active.runningSince != null ? 'in session' : 'paused'}</Text>
                  <Text style={{ fontFamily: fonts.display, fontSize: 28, lineHeight: 32 }}>{formatClock(elapsedOf(active, now))}</Text>
                </View>
                <Text style={{ fontFamily: fonts.displaySemi, fontSize: 18 }}>Open</Text>
              </PressableScale>
            </Animated.View>
          ) : startSkill ? (
            <Animated.View entering={rise(60)}>
              <Button
                label="Start a session"
                icon={<PlayIcon />}
                accessibilityHint={`Starts timing ${startSkill.name}`}
                onPress={() => startSession(startSkill.id)}
              />
            </Animated.View>
          ) : null}
        </Animated.View>

        <View style={{ gap: 20, paddingTop: 8 }}>
          <Text variant="heading" accessibilityRole="header">Your skills</Text>
          {skills.map((k, i) => (
            <SkillCard key={k.id} index={i} name={k.name} totalMs={skillTotalMs(state, k.id, now)} onPress={() => router.push(`/skill/${k.id}`)} />
          ))}
          <Animated.View entering={rise(120 + skills.length * 60)}>
            <PressableScale
              onPress={() => router.push('/add-skill')}
              accessibilityRole="button"
              accessibilityLabel="Add a skill"
              style={{ minHeight: 56, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.muted, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <PlusIcon color={colors.muted} />
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: colors.muted }}>Add a skill</Text>
            </PressableScale>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

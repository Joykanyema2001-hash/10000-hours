import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { AvatarButton } from '../../components/AvatarButton';
import { GoalRing } from '../../components/GoalRing';
import { PlayIcon, PlusIcon } from '../../components/Icons';
import { PressableScale } from '../../components/PressableScale';
import { ProgressBar } from '../../components/ProgressBar';
import { SkillCard } from '../../components/SkillCard';
import { TAB_BAR_HEIGHT } from '../../components/TabBar';
import { Text } from '../../components/Text';
import { WeekChart } from '../../components/WeekChart';
import { useNow } from '../../lib/hooks';
import { nextLevel, withArticle } from '../../lib/levels';
import { startSession } from '../../lib/session';
import { formatClock, formatDuration, HOUR, MINUTE, startOfDay, withCommas } from '../../lib/time';
import { allTimeMs, dailyRateMs, dayTotals, elapsedOf, skillTotalMs, todayMs, useStore } from '../../store';
import { colors, fonts } from '../../theme';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function greeting(d: Date) {
  const h = d.getHours();
  return h < 5 ? 'Late one' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function when(t: number, now: number) {
  const d = new Date(t);
  const h = d.getHours() % 12 || 12;
  const time = `${h}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'am' : 'pm'}`;
  const days = Math.round((startOfDay(now) - startOfDay(t)) / (24 * HOUR));
  if (days === 0) return `Today, ${time}`;
  if (days === 1) return `Yesterday, ${time}`;
  if (days < 7) return `${WEEKDAYS[d.getDay()]}, ${time}`;
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}

/** Small labelled figure for the stats row. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 16, letterSpacing: 0.6, color: colors.muted }} numberOfLines={1}>{label.toUpperCase()}</Text>
      <Text style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 28 }} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

const card = { backgroundColor: colors.white, borderWidth: 3, borderColor: colors.ink, borderRadius: 20, padding: 16 } as const;

export default function Today() {
  const reduce = useReducedMotion();
  const insets = useSafeAreaInsets();
  const skills = useStore((s) => s.skills);
  const sessions = useStore((s) => s.sessions);
  const active = useStore((s) => s.active);
  const goalMin = useStore((s) => s.dailyGoalMin);
  const lastSkillId = useStore((s) => s.lastSkillId);
  const now = useNow(active?.runningSince != null ? 1000 : 60_000);

  const state = { skills, sessions, active };
  const today = todayMs(state, now);
  const goalMs = goalMin * MINUTE;
  const left = goalMs - today;
  const week = dayTotals(state, 7, now);
  const weekMs = week.reduce((a, d) => a + d.ms, 0);
  const activeSkill = active ? skills.find((k) => k.id === active.skillId) : null;
  const startSkill = skills.find((k) => k.id === lastSkillId) ?? skills[0];

  // Closest upcoming milestone across all skills.
  const upcoming = skills
    .map((k) => {
      const ms = skillTotalMs(state, k.id, now);
      const lvl = nextLevel(Math.floor(ms / HOUR));
      return lvl ? { skill: k, ms, lvl, leftH: lvl.hours - ms / HOUR } : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => a.leftH - b.leftH)[0];

  const avg = skills.reduce((a, k) => a + dailyRateMs({ skills, sessions, dailyGoalMin: 0 }, k.id, now), 0);
  const recent = [...sessions].sort((a, b) => b.end - a.end).slice(0, 3);
  const d = new Date(now);
  const rise = (ms: number) => (reduce ? undefined : FadeInDown.delay(ms).springify().dampingRatio(1).duration(380));

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 24, gap: 20 }}>
        {/* Header: date + greeting, today's total and the goal ring */}
        <Animated.View entering={rise(0)} style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: -10 }}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 0.6, color: colors.muted }}>
              {`${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`.toUpperCase()}
            </Text>
            <AvatarButton />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <Text variant="label">{greeting(d)}. Today</Text>
              <Text variant="display" accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit>{formatDuration(today)}</Text>
              <Text variant="body" style={{ color: colors.muted }}>
                {left > 0 ? `${formatDuration(left)} left of your ${formatDuration(goalMs)} goal` : `Goal done. ${formatDuration(-left)} extra.`}
              </Text>
            </View>
            <GoalRing fraction={today / goalMs} />
          </View>
        </Animated.View>

        {/* Running session or the main start button */}
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
              <Button label={`Start ${startSkill.name}`} icon={<PlayIcon />} accessibilityHint="Starts a timed session" onPress={() => startSession(startSkill.id)} />
            </Animated.View>
          ) : null}
        </Animated.View>

        {/* This week */}
        <Animated.View entering={rise(120)} style={[card, { gap: 14 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text variant="heading">This week</Text>
            <Text style={{ fontFamily: fonts.displaySemi, fontSize: 18 }}>{formatDuration(weekMs)}</Text>
          </View>
          <WeekChart days={week} goalMs={goalMs} />
          <Text variant="caption">Dashed line is your {formatDuration(goalMs)} daily goal. Missed days don't reset anything.</Text>
        </Animated.View>

        {/* Stats */}
        <Animated.View entering={rise(160)} style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 4 }}>
          <Stat label="All time" value={`${withCommas(Math.floor(allTimeMs(state, now) / HOUR))} h`} />
          <Stat label="Daily avg" value={formatDuration(avg)} />
          <Stat label="Sessions" value={withCommas(sessions.length)} />
        </Animated.View>

        {/* Next milestone */}
        {upcoming ? (
          <Animated.View entering={rise(200)}>
            <PressableScale
              onPress={() => router.push({ pathname: '/milestones', params: { skill: upcoming.skill.id } })}
              accessibilityRole="button"
              accessibilityLabel={`Next milestone: ${upcoming.skill.name}, ${withCommas(Math.ceil(upcoming.leftH))} hours until ${upcoming.lvl.name}`}
              style={{ backgroundColor: colors.lime, borderWidth: 3, borderColor: colors.ink, borderRadius: 20, padding: 16, gap: 10 }}
            >
              <Text variant="label">Next milestone</Text>
              <Text style={{ fontFamily: fonts.displaySemi, fontSize: 20, lineHeight: 24 }}>
                {withCommas(Math.ceil(upcoming.leftH))} hours until {upcoming.skill.name} makes you {withArticle(upcoming.lvl.name)}
              </Text>
              <ProgressBar fraction={upcoming.ms / HOUR / upcoming.lvl.hours} delay={260} />
            </PressableScale>
          </Animated.View>
        ) : null}

        {/* Skills */}
        <View style={{ gap: 14, paddingTop: 4 }}>
          <Text variant="heading" accessibilityRole="header">Your skills</Text>
          {skills.map((k, i) => (
            <SkillCard
              key={k.id}
              index={i}
              name={k.name}
              icon={k.icon}
              live={active?.skillId === k.id}
              totalMs={skillTotalMs(state, k.id, now)}
              onPress={() => router.push(`/skill/${k.id}`)}
              onStart={() => startSession(k.id)}
            />
          ))}
          <PressableScale
            onPress={() => router.push('/add-skill')}
            accessibilityRole="button"
            accessibilityLabel="Add a skill"
            style={{ minHeight: 56, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.muted, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <PlusIcon color={colors.muted} />
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: colors.muted }}>Add a skill</Text>
          </PressableScale>
        </View>

        {/* Recent sessions */}
        {recent.length ? (
          <View style={{ gap: 4 }}>
            <Text variant="heading" accessibilityRole="header" style={{ marginBottom: 6 }}>Recent sessions</Text>
            {recent.map((x) => {
              const k = skills.find((s) => s.id === x.skillId);
              return (
                <View key={x.id} style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 2, borderBottomColor: colors.divider }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16 }} numberOfLines={1}>{k?.name ?? 'Removed skill'}</Text>
                    <Text variant="caption">{when(x.end, now)}</Text>
                  </View>
                  <Text style={{ fontFamily: fonts.displaySemi, fontSize: 18 }}>{formatDuration(x.ms)}</Text>
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

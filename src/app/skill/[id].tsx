import { router, useLocalSearchParams } from 'expo-router';
import { Alert, ScrollView, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { Button } from '../../components/Button';
import { HourGrid } from '../../components/HourGrid';
import { PressableScale } from '../../components/PressableScale';
import { SkillIcon } from '../../components/SkillIcon';
import { IconButton } from '../../components/IconButton';
import { Text } from '../../components/Text';
import { haptics } from '../../lib/haptics';
import { useNow } from '../../lib/hooks';
import { notify } from '../../lib/notify';
import { replanNudge, startSession } from '../../lib/session';
import { formatDuration, GOAL_HOURS, HOUR, percentOfGoal, startOfDay, withCommas } from '../../lib/time';
import { projectedYear, projectionRate, skillTotalMs, useStore } from '../../store';
import { colors, fonts } from '../../theme';

export default function SkillScreen() {
  const reduce = useReducedMotion();
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const skills = useStore((s) => s.skills);
  const sessions = useStore((s) => s.sessions);
  const active = useStore((s) => s.active);
  const goalMin = useStore((s) => s.dailyGoalMin);
  const deleteSession = useStore((s) => s.deleteSession);
  const allNodes = useStore((s) => s.nodes);
  const liveHere = active?.skillId === id && active.runningSince != null;
  const now = useNow(liveHere ? 1000 : 60_000);

  const skill = skills.find((k) => k.id === id);
  const total = skill ? skillTotalMs({ skills, sessions, active }, skill.id, now) : 0;
  const hours = Math.floor(total / HOUR);
  const fromHours = from != null ? Number(from) : undefined;

  if (!skill) {
    return (
      <SafeAreaView style={{ flex: 1, padding: 24, backgroundColor: colors.paper }}>
        <IconButton kind="back" onPress={() => router.back()} />
        <Text variant="title">Skill not found</Text>
      </SafeAreaView>
    );
  }

  const { ms: rate, fromGoal } = projectionRate({ skills, sessions, dailyGoalMin: goalMin }, skill.id, now);
  const remaining = GOAL_HOURS * HOUR - total;
  const year = projectedYear(remaining, rate, now);
  const fasterYear = projectedYear(remaining, rate + 30 * 60_000, now);
  const rise = (d: number) => (reduce ? undefined : FadeInDown.delay(d).springify().dampingRatio(1).duration(400));
  const mine = sessions.filter((x) => x.skillId === skill.id).sort((a, b) => b.end - a.end);
  const skillNodes = allNodes.filter((n) => n.skillId === skill.id);
  const tree = {
    total: skillNodes.length,
    mastered: skillNodes.filter((n) => n.status === 'mastered').length,
    learning: skillNodes.filter((n) => n.status === 'learning').slice(0, 3).map((n) => n.title),
  };
  const dayLabel = (t: number) => {
    const days = Math.round((startOfDay(now) - startOfDay(t)) / (24 * HOUR));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    const d = new Date(t);
    return `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]} ${d.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]}`;
  };
  const confirmDelete = (sid: string, ms: number, end: number) => {
    haptics.warning();
    Alert.alert('Delete this session?', `${formatDuration(ms)} of ${skill.name}, ${dayLabel(end).toLowerCase()}. The hours come off your total.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteSession(sid);
          replanNudge();
          notify({ kind: 'info', title: 'Session deleted', body: `${formatDuration(ms)} removed from ${skill.name}.` });
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 8, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton kind="back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
            <SkillIcon icon={skill.icon} size={30} />
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 18, flexShrink: 1 }} numberOfLines={1} accessibilityRole="header">{skill.name}</Text>
          </View>
          <IconButton kind="edit" label={`Edit ${skill.name}`} onPress={() => router.push(`/skill/edit/${skill.id}`)} />
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
              {fromGoal ? `At your ${formatDuration(rate)} daily goal` : `At ${formatDuration(rate)} a day`}, you reach 10,000 in {year}
            </Text>
            {fasterYear < year ? (
              <Text style={{ marginTop: 6, fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 19 }}>
                Add 30 minutes a day and it's {fasterYear}.
              </Text>
            ) : null}
          </Animated.View>
        ) : null}

        <Animated.View entering={rise(180)}>
          <PressableScale
            onPress={() => router.push({ pathname: '/tree/[id]', params: { id: skill.id } })}
            accessibilityRole="button"
            accessibilityLabel={`${skill.name} skill tree, ${tree.mastered} of ${tree.total} steps mastered. Open the tree`}
            style={{ padding: 16, backgroundColor: colors.ink, borderRadius: 20, gap: 10 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: fonts.displaySemi, fontSize: 20, color: colors.lime }}>Skill tree</Text>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: colors.paper }}>
                {tree.total ? `${tree.mastered}/${tree.total} mastered` : 'Start mapping →'}
              </Text>
            </View>
            {tree.learning.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {tree.learning.map((t) => (
                  <View key={t} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.lime }}>
                    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13 }}>◐ {t}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 19, color: colors.paper }}>
                {tree.total ? 'Open the tree to pick what you are learning next.' : `Break ${skill.name} into the things you are learning, and branch off as you build on them.`}
              </Text>
            )}
          </PressableScale>
        </Animated.View>

        <Animated.View entering={rise(200)} style={{ gap: 4, marginTop: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text variant="heading" accessibilityRole="header">Sessions</Text>
            <PressableScale
              onPress={() => router.push(`/log/${skill.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`Log time for ${skill.name}`}
              style={{ paddingHorizontal: 14, height: 40, borderRadius: 999, borderWidth: 2.5, borderColor: colors.ink, justifyContent: 'center' }}
            >
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15 }}>+ Log time</Text>
            </PressableScale>
          </View>
          {mine.length === 0 ? (
            <Text variant="caption">No sessions yet. Start one, or log time you've already put in.</Text>
          ) : (
            mine.slice(0, 12).map((x) => (
              <PressableScale
                key={x.id}
                scaleTo={0.98}
                onPress={() => confirmDelete(x.id, x.ms, x.end)}
                accessibilityRole="button"
                accessibilityLabel={`${formatDuration(x.ms)}, ${dayLabel(x.end)}`}
                accessibilityHint="Opens an option to delete this session"
                style={{ minHeight: 50, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: colors.divider }}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 16 }}>{dayLabel(x.end)}</Text>
                  {x.nodeId || x.note ? (
                    <Text variant="caption" numberOfLines={2}>
                      {[allNodes.find((n) => n.id === x.nodeId)?.title, x.note].filter(Boolean).join(' · ')}
                    </Text>
                  ) : null}
                </View>
                <Text style={{ fontFamily: fonts.displaySemi, fontSize: 18 }}>{formatDuration(x.ms)}</Text>
              </PressableScale>
            ))
          )}
          {mine.length > 12 ? <Text variant="caption" style={{ marginTop: 6 }}>Showing your latest 12 of {mine.length} sessions.</Text> : null}
        </Animated.View>

        <View style={{ flex: 1, minHeight: 16 }} />
        <Animated.View entering={rise(220)} style={{ flexDirection: 'row', gap: 12 }}>
          <Button variant="outline" size="md" label="Milestones" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/milestones', params: { skill: skill.id } })} />
          <Button
            size="md"
            label={active?.skillId === skill.id ? 'Open timer' : 'Start session'}
            style={{ flex: 1 }}
            onPress={() => startSession(skill.id)}
          />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

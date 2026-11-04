import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Alert, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { ClockFace } from '../components/ClockFace';
import { IconButton } from '../components/IconButton';
import { PauseIcon, PlayIcon } from '../components/Icons';
import { RollingText } from '../components/RollingText';
import { Text } from '../components/Text';
import { haptics } from '../lib/haptics';
import { useNow } from '../lib/hooks';
import { discardSession, finishSession, togglePause } from '../lib/session';
import { formatClock, HOUR, MINUTE, withCommas } from '../lib/time';
import { elapsedOf, skillTotalMs, useStore } from '../store';
import { colors, fonts } from '../theme';

export default function Timer() {
  useKeepAwake();
  const skills = useStore((s) => s.skills);
  const sessions = useStore((s) => s.sessions);
  const active = useStore((s) => s.active);
  const running = active?.runningSince != null;
  const now = useNow(1000, running);

  const skill = active ? skills.find((k) => k.id === active.skillId) : undefined;
  const elapsed = elapsedOf(active, now);
  const total = skill ? skillTotalMs({ skills, sessions, active }, skill.id, now) : 0;
  const hoursNow = Math.floor(total / HOUR);
  const hoursAtStart = Math.floor((total - elapsed) / HOUR);
  const hourCount = hoursNow - hoursAtStart;
  const nextHour = hoursNow + 1;
  const minsLeft = Math.ceil((nextHour * HOUR - total) / MINUTE);

  // A light tick each minute while running. Hour and milestone pop-ups come from SessionWatcher.
  const prevMinute = useRef(Math.floor(elapsed / MINUTE));
  useEffect(() => {
    const minute = Math.floor(elapsed / MINUTE);
    if (running && minute > prevMinute.current && useStore.getState().minuteTicks) haptics.tick();
    prevMinute.current = minute;
  }, [elapsed, running]);

  if (!active || !skill) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.lime, padding: 24, gap: 24 }}>
        <IconButton kind="close" onPress={() => router.back()} />
        <Text variant="title">No session running</Text>
      </SafeAreaView>
    );
  }

  const finish = () => {
    const done = () => {
      const fromHours = hoursAtStart;
      const id = skill.id;
      const saved = finishSession();
      if (saved) router.replace({ pathname: '/session-note/[id]', params: { id: saved.id, from: String(fromHours) } });
      else router.replace({ pathname: '/skill/[id]', params: { id, from: String(fromHours) } });
    };
    if (elapsed < MINUTE) {
      haptics.warning();
      Alert.alert('Log this session?', "It's under a minute long.", [
        { text: 'Keep going', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => { discardSession(); router.back(); } },
        { text: 'Log it', onPress: done },
      ]);
      return;
    }
    done();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.lime }}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16, alignItems: 'center' }}>
        <View style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton kind="close" label="Minimise timer" onPress={() => router.back()} />
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 18 }} accessibilityRole="header">{skill.name}</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={{ marginTop: 40, alignItems: 'center' }}>
          <ClockFace
            bankedMs={active.bankedMs}
            runningSince={active.runningSince}
            hourCount={hourCount}
            accessibilityLabel={`Session clock, ${formatClock(elapsed)} elapsed${running ? '' : ', paused'}`}
          />
        </View>

        <View style={{ marginTop: 32, alignItems: 'center', gap: 12 }}>
          <RollingText text={formatClock(elapsed)} fontSize={72} style={{ fontFamily: fonts.display }} accessibilityLabel={`${formatClock(elapsed)} elapsed`} />
          <Text variant="bodyMedium" style={{ textAlign: 'center' }}>
            {running ? '' : 'Paused · '}
            {minsLeft} min until hour {withCommas(nextHour)}
          </Text>
        </View>

        <View style={{ flex: 1 }} />
        <View style={{ alignSelf: 'stretch', flexDirection: 'row', gap: 12 }}>
          <Button
            variant="outline"
            label={running ? 'Pause' : 'Resume'}
            icon={running ? <PauseIcon /> : <PlayIcon color={colors.ink} />}
            onPress={togglePause}
            style={{ flex: 1 }}
          />
          <Button label="Finish" onPress={finish} style={{ flex: 1 }} accessibilityHint="Logs this session" />
        </View>
      </View>
    </SafeAreaView>
  );
}

import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, ScrollView, Share, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chip } from '../components/Chip';
import { IconButton } from '../components/IconButton';
import { PressableScale } from '../components/PressableScale';
import { Text } from '../components/Text';
import { GOALS, REMINDER_HOURS } from '../lib/goals';
import { haptics } from '../lib/haptics';
import { cancelSessionAlerts } from '../lib/notifications';
import { notify } from '../lib/notify';
import { replanNudge } from '../lib/session';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../store';
import { colors, fonts } from '../theme';

function Section({ title, footer, children }: { title: string; footer?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.6, color: colors.muted, marginLeft: 4 }}>{title.toUpperCase()}</Text>
      <View style={{ backgroundColor: colors.white, borderWidth: 3, borderColor: colors.ink, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 }}>{children}</View>
      {footer ? <Text variant="caption" style={{ marginHorizontal: 4 }}>{footer}</Text> : null}
    </View>
  );
}

function Row({ label, detail, last, children }: { label: string; detail?: string; last?: boolean; children?: ReactNode }) {
  return (
    <View style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: last ? 0 : 2, borderBottomColor: colors.divider }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16 }}>{label}</Text>
        {detail ? <Text variant="caption">{detail}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Switch
      value={value}
      accessibilityLabel={label}
      onValueChange={(v) => {
        onChange(v);
        if (v) haptics.select();
      }}
      trackColor={{ false: colors.track, true: colors.ink }}
      thumbColor={value ? colors.lime : colors.white}
      ios_backgroundColor={colors.track}
    />
  );
}

export default function Settings() {
  const goal = useStore((s) => s.dailyGoalMin);
  const reminderHour = useStore((s) => s.reminderHour);
  const hapticsOn = useStore((s) => s.hapticsOn);
  const minuteTicks = useStore((s) => s.minuteTicks);
  const setSetting = useStore((s) => s.setSetting);
  const counts = useStore(useShallow((s) => ({ skills: s.skills.length, sessions: s.sessions.length })));

  // Read back what's actually saved on the phone, so a saving problem is visible.
  const [saved, setSaved] = useState('Checking what is saved on this phone…');
  useEffect(() => {
    AsyncStorage.getItem('tenk-v1')
      .then((raw) => {
        const st = raw ? JSON.parse(raw)?.state : null;
        const n = st?.skills?.length ?? 0;
        const m = st?.sessions?.length ?? 0;
        setSaved(
          n === counts.skills && m === counts.sessions
            ? `Saved on this phone: ${n} skill${n === 1 ? '' : 's'}, ${m} session${m === 1 ? '' : 's'}. Only on this phone, so export a backup now and then.`
            : `Saving problem: the phone has ${n} skills and ${m} sessions saved, but the app shows ${counts.skills} and ${counts.sessions}. Export a backup and tell us.`,
        );
      })
      .catch((e) => setSaved(`Saving isn't working on this phone (${String(e?.message ?? e)}). Export a backup before closing the app.`));
  }, [counts.skills, counts.sessions]);

  const exportData = async () => {
    const s = useStore.getState();
    const data = { app: '10,000 Hours', exportedAt: new Date().toISOString(), skills: s.skills, sessions: s.sessions, dailyGoalMin: s.dailyGoalMin };
    await Share.share({ title: '10,000 Hours backup', message: JSON.stringify(data, null, 2) }).catch(() => {});
  };

  const erase = () => {
    Alert.alert('Erase everything?', `This deletes ${counts.skills} skills and ${counts.sessions} sessions from this phone. It can't be undone. Export a backup first if you might want them.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Erase everything',
        style: 'destructive',
        onPress: () => {
          cancelSessionAlerts().catch(() => {});
          useStore.getState().resetAll();
          replanNudge();
          router.dismissAll();
          router.replace('/welcome');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40, gap: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton kind="back" onPress={() => router.back()} />
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 18 }} accessibilityRole="header">Settings</Text>
          <View style={{ width: 44 }} />
        </View>

        <Section title="Daily goal" footer="Missing it never resets your hours. It just sets the ring on Today.">
          <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 10 }} accessibilityRole="radiogroup">
            {GOALS.map((g) => (
              <Chip
                key={g.min}
                label={g.label}
                accessibilityLabel={g.a11y}
                selected={goal === g.min}
                onPress={() => {
                  if (goal === g.min) return;
                  haptics.select();
                  setSetting({ dailyGoalMin: g.min });
                  replanNudge();
                }}
              />
            ))}
          </View>
        </Section>

        <Section title="Daily reminder" footer="One gentle nudge, only on days you haven't reached your goal yet.">
          <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 10 }} accessibilityRole="radiogroup">
            {REMINDER_HOURS.map((r) => (
              <Chip
                key={r.label}
                label={r.label}
                accessibilityLabel={r.hour == null ? 'Reminders off' : `Remind me at ${r.label}`}
                selected={reminderHour === r.hour}
                onPress={() => {
                  if (reminderHour === r.hour) return;
                  haptics.select();
                  setSetting({ reminderHour: r.hour });
                  replanNudge();
                  notify({ kind: 'info', title: r.hour == null ? 'Reminders off' : `Reminder set for ${r.label}`, body: r.hour == null ? 'You can turn them back on any time.' : undefined });
                }}
              />
            ))}
          </View>
        </Section>

        <Section title="Feel">
          <Row label="Haptics" detail="Taps and buzzes on key moments">
            <Toggle label="Haptics" value={hapticsOn} onChange={(v) => setSetting({ hapticsOn: v })} />
          </Row>
          <Row label="Minute ticks" detail="A light tap each minute while timing" last>
            <Toggle label="Minute ticks" value={minuteTicks} onChange={(v) => setSetting({ minuteTicks: v })} />
          </Row>
        </Section>

        <Section title="Your data" footer={saved}>
          <PressableScale onPress={exportData} accessibilityRole="button" accessibilityLabel="Export a backup">
            <Row label="Export a backup" detail={`${counts.skills} skills, ${counts.sessions} sessions as text you can save`} />
          </PressableScale>
          <PressableScale onPress={() => router.push('/import')} accessibilityRole="button" accessibilityLabel="Import a backup">
            <Row label="Import a backup" detail="Bring in skills and sessions from another copy of the app" />
          </PressableScale>
          <PressableScale onPress={erase} accessibilityRole="button" accessibilityLabel="Erase everything">
            <Row label="Erase everything" detail="Start again from the welcome screen" last />
          </PressableScale>
        </Section>

        <Text variant="caption" style={{ textAlign: 'center' }}>
          10,000 Hours {Constants.expoConfig?.version ?? ''}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

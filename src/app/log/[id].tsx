import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Field } from '../../components/Field';
import { IconButton } from '../../components/IconButton';
import { SkillIcon } from '../../components/SkillIcon';
import { StepPicker } from '../../components/StepPicker';
import { Text } from '../../components/Text';
import { haptics } from '../../lib/haptics';
import { notify } from '../../lib/notify';
import { replanNudge } from '../../lib/session';
import { DAY, formatDuration, HOUR, MINUTE, withCommas } from '../../lib/time';
import { useShallow } from 'zustand/react/shallow';
import { skillTotalMs, useStore } from '../../store';
import { colors, fonts } from '../../theme';

const DURATIONS = [15, 30, 45, 60, 90, 120];
const WHEN = [
  { label: 'Today', daysAgo: 0 },
  { label: 'Yesterday', daysAgo: 1 },
  { label: '2 days ago', daysAgo: 2 },
];

/** Add time you didn't run the timer for. */
export default function LogTime() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const skill = useStore((s) => s.skills.find((k) => k.id === id));
  const logSession = useStore((s) => s.logSession);
  const [minutes, setMinutes] = useState(30);
  const [custom, setCustom] = useState('');
  const [daysAgo, setDaysAgo] = useState(0);
  const [stepId, setStepId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const nodes = useStore(useShallow((s) => s.nodes.filter((n) => n.skillId === id)));

  if (!skill) return null;
  const customMin = Number(custom.replace(/[^0-9]/g, '')) || 0;
  const total = custom ? customMin : minutes;
  const valid = total > 0 && total <= 24 * 60;

  const save = () => {
    if (!valid) return;
    const end = daysAgo === 0 ? Date.now() : Date.now() - daysAgo * DAY;
    const saved = logSession(skill.id, total * MINUTE, end);
    if (stepId || note.trim()) useStore.getState().updateSession(saved.id, { nodeId: stepId, note: note.trim() || null });
    const s = useStore.getState();
    notify({ kind: 'logged', title: `Logged ${formatDuration(total * MINUTE)} of ${skill.name}`, body: `${withCommas(Math.floor(skillTotalMs(s, skill.id) / HOUR))} hours in total.` });
    replanNudge();
    router.back();
  };

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.paper }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 16, gap: 24 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <IconButton kind="close" label="Cancel" onPress={() => router.back()} />
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 18 }} accessibilityRole="header">Log time</Text>
            <View style={{ width: 44 }} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <SkillIcon icon={skill.icon} size={52} />
            <View style={{ flex: 1 }}>
              <Text variant="title" style={{ fontSize: 30, lineHeight: 34 }}>{skill.name}</Text>
              <Text variant="caption">For practice you didn't time.</Text>
            </View>
          </View>

          <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="How long">
            <Text variant="label">How long?</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {DURATIONS.map((m) => (
                <View key={m} style={{ width: '31%', flexGrow: 1 }}>
                  <Chip
                    label={formatDuration(m * MINUTE)}
                    selected={!custom && minutes === m}
                    onPress={() => {
                      haptics.select();
                      setCustom('');
                      setMinutes(m);
                    }}
                  />
                </View>
              ))}
            </View>
          </View>

          <Field label="Or exact minutes" value={custom} onChangeText={setCustom} placeholder="e.g. 75" keyboardType="number-pad" returnKeyType="done" />

          <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="When">
            <Text variant="label">When?</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {WHEN.map((w) => (
                <Chip
                  key={w.daysAgo}
                  label={w.label}
                  selected={daysAgo === w.daysAgo}
                  onPress={() => {
                    haptics.select();
                    setDaysAgo(w.daysAgo);
                  }}
                />
              ))}
            </View>
          </View>

          {nodes.length ? (
            <View style={{ gap: 8 }}>
              <Text variant="label">What did you work on? (optional)</Text>
              <StepPicker nodes={nodes} value={stepId} onChange={setStepId} />
            </View>
          ) : null}

          <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="What went well, what to fix…" returnKeyType="done" />

          <View style={{ flex: 1 }} />
          <Button label={valid ? `Log ${formatDuration(total * MINUTE)}` : 'Log time'} onPress={save} disabled={!valid} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

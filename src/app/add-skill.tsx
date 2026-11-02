import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View, type TextInputInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { Field } from '../components/Field';
import { IconButton } from '../components/IconButton';
import { Text } from '../components/Text';
import { haptics } from '../lib/haptics';
import { withCommas } from '../lib/time';
import { useStore } from '../store';
import { colors } from '../theme';

const GOALS = [
  { label: '30m', min: 30, a11y: '30 minutes' },
  { label: '1h', min: 60, a11y: '1 hour' },
  { label: '2h', min: 120, a11y: '2 hours' },
  { label: '3h', min: 180, a11y: '3 hours' },
];

export default function AddSkill() {
  const addSkill = useStore((s) => s.addSkill);
  const setDailyGoal = useStore((s) => s.setDailyGoal);
  const isFirst = useStore((s) => s.skills.length === 0);
  const [name, setName] = useState('');
  const [prior, setPrior] = useState('');
  const [goal, setGoal] = useState(useStore.getState().dailyGoalMin);
  const priorRef = useRef<TextInputInstance>(null);

  const priorHours = Number(prior.replace(/[^0-9.]/g, '')) || 0;
  const canSave = name.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    haptics.success();
    const id = addSkill(name, priorHours);
    setDailyGoal(goal);
    if (isFirst) router.replace('/(tabs)');
    else router.replace(`/skill/${id}`);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16, gap: 24 }} keyboardShouldPersistTaps="handled">
          <IconButton kind="back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/welcome'))} />
          <Text variant="title" accessibilityRole="header">What are you working to master?</Text>

          <Field
            label="Skill"
            value={name}
            onChangeText={setName}
            placeholder="Guitar"
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => priorRef.current?.focus()}
          />

          <Field
            ref={priorRef}
            label="Hours you already have"
            helper="A rough guess is fine. Years of playing still count."
            value={prior}
            onChangeText={setPrior}
            onBlur={() => prior && setPrior(withCommas(Math.round(priorHours)))}
            placeholder="0"
            keyboardType="number-pad"
            returnKeyType="done"
          />

          <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Daily goal">
            <Text variant="label">Daily goal</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {GOALS.map((g) => (
                <Chip
                  key={g.min}
                  label={g.label}
                  accessibilityLabel={g.a11y}
                  selected={goal === g.min}
                  onPress={() => {
                    if (goal !== g.min) haptics.select();
                    setGoal(g.min);
                  }}
                />
              ))}
            </View>
          </View>

          <View style={{ flex: 1 }} />
          <Button label="Start counting" onPress={save} disabled={!canSave} accessibilityHint={canSave ? undefined : 'Enter a skill name first'} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

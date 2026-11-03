import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View, type ScrollViewInstance, type TextInputInstance } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { Field } from '../components/Field';
import { IconButton } from '../components/IconButton';
import { IconPicker } from '../components/IconPicker';
import { PressableScale } from '../components/PressableScale';
import { SkillIcon } from '../components/SkillIcon';
import { Suggestions } from '../components/Suggestions';
import { Text } from '../components/Text';
import { GOALS } from '../lib/goals';
import { haptics } from '../lib/haptics';
import { notify } from '../lib/notify';
import { replanNudge } from '../lib/session';
import { guessIcon, iconFor } from '../lib/skillIcons';
import { withCommas } from '../lib/time';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../store';
import { colors } from '../theme';

export default function AddSkill() {
  const reduce = useReducedMotion();
  const addSkill = useStore((s) => s.addSkill);
  const setDailyGoal = useStore((s) => s.setDailyGoal);
  const taken = useStore(useShallow((s) => s.skills.map((k) => k.name.toLowerCase())));
  const isFirst = taken.length === 0;
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string | null>(null); // null = follow the name
  const [pickIcon, setPickIcon] = useState(false);
  const [prior, setPrior] = useState('');
  const [goal, setGoal] = useState(useStore.getState().dailyGoalMin);
  const priorRef = useRef<TextInputInstance>(null);
  const scrollRef = useRef<ScrollViewInstance>(null);

  const iconKey = icon ?? guessIcon(name);
  const priorHours = Number(prior.replace(/[^0-9.]/g, '')) || 0;
  const duplicate = taken.includes(name.trim().toLowerCase());
  const canSave = name.trim().length > 0 && !duplicate;

  const save = () => {
    if (!canSave) return;
    const id = addSkill(name, priorHours, iconKey);
    if (isFirst) setDailyGoal(goal);
    notify({
      kind: 'info',
      title: `${name.trim()} added`,
      body: priorHours > 0 ? `${withCommas(Math.round(priorHours))} hours already counted.` : 'Start a session whenever you are ready.',
    });
    replanNudge();
    if (isFirst) router.replace('/(tabs)');
    else router.replace(`/skill/${id}`);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16, gap: 24 }} keyboardShouldPersistTaps="handled">
          <IconButton kind="back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/welcome'))} />
          <Text variant="title" accessibilityRole="header">What are you working to master?</Text>

          <View style={{ gap: 10 }}>
            <Text variant="label">Pick one to start</Text>
            <Suggestions
              selected={name}
              taken={taken}
              onPick={(n, i) => {
                setName(n);
                setIcon(i);
                setPickIcon(false);
              }}
            />
          </View>

          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Or name your own"
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Pottery"
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => priorRef.current?.focus()}
                />
              </View>
              <PressableScale
                onPress={() => {
                  haptics.select();
                  setPickIcon((v) => !v);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Icon: ${iconFor(iconKey).label}. Change icon`}
                style={{ marginBottom: 2 }}
              >
                <SkillIcon icon={iconKey} size={54} tone={pickIcon ? 'ink' : 'lime'} />
              </PressableScale>
            </View>
            {duplicate ? <Text variant="caption" style={{ color: colors.ink }}>You already track {name.trim()}.</Text> : null}
            {pickIcon ? (
              <Animated.View entering={reduce ? FadeIn : FadeIn.duration(180)} exiting={FadeOut.duration(120)} layout={reduce ? undefined : LinearTransition.springify().dampingRatio(1)}>
                <IconPicker value={iconKey} onChange={(k) => setIcon(k)} />
              </Animated.View>
            ) : (
              <Text variant="caption">Tap the icon to change it.</Text>
            )}
          </View>

          <Field
            ref={priorRef}
            label="Hours you already have"
            helper="A rough guess is fine. Years of practice still count."
            value={prior}
            onChangeText={setPrior}
            onBlur={() => prior && setPrior(withCommas(Math.round(priorHours)))}
            onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250)}
            placeholder="0"
            keyboardType="number-pad"
            returnKeyType="done"
          />

          {isFirst ? (
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
              <Text variant="caption">You can change this any time in Settings.</Text>
            </View>
          ) : null}

          <View style={{ flex: 1 }} />
          <Button label="Start counting" onPress={save} disabled={!canSave} accessibilityHint={canSave ? undefined : 'Pick or enter a skill first'} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

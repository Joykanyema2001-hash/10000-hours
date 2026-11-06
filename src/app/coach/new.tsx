import { router } from 'expo-router';
import ShieldAlert from 'lucide-react-native/icons/shield-alert';
import Sparkles from 'lucide-react-native/icons/sparkles';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppleSignInButton } from '../../components/AppleSignInButton';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Field } from '../../components/Field';
import { IconButton } from '../../components/IconButton';
import { SkillIcon } from '../../components/SkillIcon';
import { Text } from '../../components/Text';
import { useAuth } from '../../lib/auth';
import { applyPlan, askQuestions, CoachError, makePlan, type CoachPlan, type CoachQuestions } from '../../lib/coach';
import { haptics } from '../../lib/haptics';
import { notify } from '../../lib/notify';
import { colors, fonts } from '../../theme';

const IDEAS = ['Learn to swim', 'Play guitar chords', 'Speak basic Spanish', 'Draw faces', 'Run a 5k'];
const LOADING = {
  questions: ['Reading your goal', 'Thinking about where to start'],
  plan: ['Mapping the stages', 'Breaking them into steps', 'Checking the order'],
} as const;

type Phase =
  | { at: 'goal' }
  | { at: 'loading'; what: keyof typeof LOADING }
  | { at: 'questions'; q: CoachQuestions }
  | { at: 'plan'; plan: CoachPlan };

function Loading({ what }: { what: keyof typeof LOADING }) {
  const lines = LOADING[what];
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => Math.min(n + 1, lines.length - 1)), 2600);
    return () => clearInterval(t);
  }, [lines.length]);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }} accessibilityLiveRegion="polite">
      <ActivityIndicator color={colors.ink} size="large" />
      <Animated.View key={i} entering={FadeIn.duration(250)}>
        <Text style={{ fontFamily: fonts.displaySemi, fontSize: 20, textAlign: 'center' }}>{lines[i]}</Text>
      </Animated.View>
      {what === 'plan' ? <Text variant="caption" style={{ textAlign: 'center' }}>This takes about half a minute</Text> : null}
    </View>
  );
}

/** "What do you want to learn?" → a few questions → a staged plan → a skill tree. */
export default function NewPlan() {
  const reduce = useReducedMotion();
  const signedIn = useAuth((s) => !!s.session);
  const [phase, setPhase] = useState<Phase>({ at: 'goal' });
  const [goal, setGoal] = useState('');
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  const rise = (n: number) => (reduce ? undefined : FadeInDown.delay(40 + n * 50).springify().dampingRatio(1).duration(360));

  const failWith = (e: unknown, back: Phase) => {
    haptics.warning();
    setError(e instanceof CoachError ? e.message : 'Something went wrong. Try again.');
    setPhase(back);
  };

  const ask = async () => {
    const g = goal.trim();
    if (g.length < 2) return;
    haptics.select();
    setError(null);
    setAnswers({});
    setPhase({ at: 'loading', what: 'questions' });
    try {
      setPhase({ at: 'questions', q: await askQuestions(g) });
    } catch (e) {
      failWith(e, { at: 'goal' });
    }
  };

  const plan = async (q: CoachQuestions) => {
    haptics.select();
    setError(null);
    setPhase({ at: 'loading', what: 'plan' });
    const given = q.questions.map((x, i) => ({ question: x.question, answer: answers[i] ?? 'Not sure' }));
    try {
      const p = await makePlan(goal.trim(), given);
      haptics.success();
      setPhase({ at: 'plan', plan: p });
    } catch (e) {
      failWith(e, { at: 'questions', q });
    }
  };

  const accept = (p: CoachPlan) => {
    const id = applyPlan(p);
    haptics.success();
    const steps = p.stages.reduce((n, s) => n + s.steps.length, 0);
    notify({ kind: 'info', title: `${p.skillName} is mapped`, body: `${p.stages.length} stages, ${steps} steps. Tap any step for its lesson.` });
    router.replace({ pathname: '/tree/[id]', params: { id, start: 'left' } });
  };

  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 }}>
      <IconButton kind="close" onPress={() => router.back()} label="Close" />
      {phase.at === 'questions' || phase.at === 'plan' ? (
        <Button size="sm" variant="outline" label="Start over" onPress={() => { setError(null); setPhase({ at: 'goal' }); }} />
      ) : null}
    </View>
  );

  if (!signedIn) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
        {header}
        <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 16 }}>
          <Text variant="title" accessibilityRole="header">Sign in to plan with the coach</Text>
          <Text variant="body" style={{ color: colors.muted }}>
            The coach runs on our server, so it needs to know it’s you. Your plans become normal skill trees you can edit.
          </Text>
          <AppleSignInButton />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
      {header}
      {phase.at === 'loading' ? (
        <Loading what={phase.what} />
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, paddingBottom: 48, gap: 20 }}>
            {error ? (
              <View style={{ padding: 14, borderRadius: 16, borderWidth: 3, borderColor: colors.ink, backgroundColor: colors.white }} accessibilityLiveRegion="polite">
                <Text variant="label">{error}</Text>
              </View>
            ) : null}

            {phase.at === 'goal' ? (
              <>
                <Animated.View entering={rise(0)} style={{ gap: 8 }}>
                  <Text variant="title" accessibilityRole="header">What do you want to learn?</Text>
                  <Text variant="body" style={{ color: colors.muted }}>The coach asks a couple of questions, then maps a path from where you are to mastery, with a short lesson for every step.</Text>
                </Animated.View>
                <Animated.View entering={rise(1)}>
                  <Field label="Your goal" placeholder="e.g. Learn to swim" value={goal} onChangeText={setGoal} maxLength={200} returnKeyType="go" onSubmitEditing={ask} autoFocus />
                </Animated.View>
                <Animated.View entering={rise(2)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {IDEAS.map((idea) => (
                    <Chip fit key={idea} label={idea} selected={goal === idea} onPress={() => setGoal(idea)} />
                  ))}
                </Animated.View>
                <Animated.View entering={rise(3)}>
                  <Button label="Next" icon={<Sparkles size={20} color={colors.lime} strokeWidth={2.25} />} disabled={goal.trim().length < 2} onPress={ask} />
                </Animated.View>
              </>
            ) : null}

            {phase.at === 'questions' ? (
              <>
                <Animated.View entering={rise(0)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <SkillIcon icon={phase.q.icon} size={48} />
                  <Text variant="title" style={{ flex: 1 }} accessibilityRole="header">{phase.q.skillName}</Text>
                </Animated.View>
                {phase.q.questions.map((q, i) => (
                  <Animated.View key={q.question} entering={rise(i + 1)} style={{ gap: 10 }}>
                    <Text variant="heading">{q.question}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {q.options.map((o) => (
                        <Chip fit key={o} label={o} selected={answers[i] === o} onPress={() => setAnswers((a) => ({ ...a, [i]: o }))} />
                      ))}
                    </View>
                  </Animated.View>
                ))}
                <Animated.View entering={rise(phase.q.questions.length + 1)} style={{ gap: 8 }}>
                  <Button label="Make my plan" onPress={() => plan(phase.q)} />
                  <Text variant="caption" style={{ textAlign: 'center' }}>Skipped questions count as “not sure”</Text>
                </Animated.View>
              </>
            ) : null}

            {phase.at === 'plan' ? (
              <>
                <Animated.View entering={rise(0)} style={{ gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <SkillIcon icon={phase.plan.icon} size={48} />
                    <Text variant="title" style={{ flex: 1 }} accessibilityRole="header">{phase.plan.skillName}</Text>
                  </View>
                  <Text variant="bodyMedium">{phase.plan.summary}</Text>
                  <Text variant="caption">About {Math.round(phase.plan.minutesPerWeek / 60 * 10) / 10} hours a week · {phase.plan.stages.length} stages</Text>
                </Animated.View>

                {phase.plan.safety ? (
                  <Animated.View entering={rise(1)} style={{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: 18, backgroundColor: colors.ink }}>
                    <ShieldAlert size={22} color={colors.lime} strokeWidth={2.25} />
                    <Text style={{ flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 21, color: colors.paper }}>{phase.plan.safety}</Text>
                  </Animated.View>
                ) : null}

                {phase.plan.stages.map((s, i) => (
                  <Animated.View key={s.title + i} entering={rise(i + 2)} style={{ padding: 16, borderRadius: 20, borderWidth: 3, borderColor: colors.ink, backgroundColor: i === 0 ? colors.lime : colors.white, gap: 10 }}>
                    <View style={{ gap: 2 }}>
                      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.muted }}>Stage {i + 1}</Text>
                      <Text style={{ fontFamily: fonts.displaySemi, fontSize: 20, lineHeight: 24 }}>{s.title}</Text>
                      <Text variant="body">{s.why}</Text>
                    </View>
                    {s.steps.map((st) => (
                      <View key={st.title} style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.ink, marginTop: 7 }} />
                        <Text style={{ flex: 1, fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 21 }}>{st.title}</Text>
                      </View>
                    ))}
                  </Animated.View>
                ))}

                <View style={{ gap: 8 }}>
                  <Button label="Add to my skills" onPress={() => accept(phase.plan)} />
                  <Text variant="caption" style={{ textAlign: 'center' }}>It becomes your skill tree. Edit, add or remove steps any time</Text>
                </View>
              </>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

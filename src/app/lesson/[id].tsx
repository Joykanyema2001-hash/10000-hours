import { router, useLocalSearchParams } from 'expo-router';
import BookOpen from 'lucide-react-native/icons/book-open';
import Brain from 'lucide-react-native/icons/brain';
import Check from 'lucide-react-native/icons/check';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import Dumbbell from 'lucide-react-native/icons/dumbbell';
import Ear from 'lucide-react-native/icons/ear';
import Eye from 'lucide-react-native/icons/eye';
import Flag from 'lucide-react-native/icons/flag';
import Footprints from 'lucide-react-native/icons/footprints';
import Hand from 'lucide-react-native/icons/hand';
import Heart from 'lucide-react-native/icons/heart';
import Lightbulb from 'lucide-react-native/icons/lightbulb';
import Repeat from 'lucide-react-native/icons/repeat';
import Rocket from 'lucide-react-native/icons/rocket';
import Scale from 'lucide-react-native/icons/scale';
import Target from 'lucide-react-native/icons/target';
import Timer from 'lucide-react-native/icons/timer';
import Wind from 'lucide-react-native/icons/wind';
import X from 'lucide-react-native/icons/x';
import Zap from 'lucide-react-native/icons/zap';
import { useCallback, useEffect, useState, type ComponentType } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { diagramFrames, LessonDiagram } from '../../components/LessonDiagram';
import { AppleSignInButton } from '../../components/AppleSignInButton';
import { Button } from '../../components/Button';
import { Text } from '../../components/Text';
import { CoachError, getLesson, reportLesson, type Diagram, type Lesson, type Scene, type SceneKind, type Visual } from '../../lib/coach';
import { haptics } from '../../lib/haptics';
import { notify } from '../../lib/notify';
import { startSession } from '../../lib/session';
import { useStore } from '../../store';
import { colors, fonts, springs } from '../../theme';
import { RouteError } from '../../components/RouteError';

type IconType = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
const VISUAL_ICONS: Record<Visual, IconType> = {
  target: Target, lightbulb: Lightbulb, eye: Eye, hand: Hand, footprints: Footprints, wind: Wind, ear: Ear, brain: Brain,
  heart: Heart, repeat: Repeat, timer: Timer, zap: Zap, book: BookOpen, dumbbell: Dumbbell, scale: Scale, rocket: Rocket,
};
const KIND_LABEL: Record<SceneKind, string> = {
  hook: 'Why it matters',
  idea: 'The key idea',
  steps: 'How to do it',
  mistakes: 'Common mistakes',
  drill: 'Your drill',
};

/** The scene's picture: a lime tile that floats gently, like a looping short. */
function Visual({ visual, active }: { visual: Visual; active: boolean }) {
  const reduce = useReducedMotion();
  const Icon = VISUAL_ICONS[visual] ?? Lightbulb;
  const float = useSharedValue(0);
  useEffect(() => {
    if (!active || reduce) {
      float.value = 0;
      return;
    }
    float.value = withRepeat(withSequence(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sin) })), -1);
  }, [active, reduce, float]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -8 * float.value }, { rotate: `${-4 + 8 * float.value}deg` }] }));
  return (
    <Animated.View entering={reduce ? undefined : ZoomIn.springify().dampingRatio(0.7).duration(500)} style={style}>
      <View style={{ width: 96, height: 96, borderRadius: 28, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: colors.paper }}>
        <Icon size={48} color={colors.ink} strokeWidth={2.25} />
      </View>
    </Animated.View>
  );
}

/** "How to do it" as a flow: numbered stops joined by a line that draws downward. */
function StepFlow({ items, delay, active = null, onPick }: { items: string[]; delay: number; active?: number | null; onPick?: (i: number) => void }) {
  const reduce = useReducedMotion();
  const grow = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (!reduce) grow.value = withDelay(delay, withTiming(1, { duration: 260 * items.length, easing: Easing.out(Easing.cubic) }));
  }, [reduce, grow, delay, items.length]);
  const line = useAnimatedStyle(() => ({ transform: [{ scaleY: grow.value }] }));
  return (
    <View>
      <Animated.View style={[{ position: 'absolute', left: 15, top: 16, bottom: 16, width: 3, borderRadius: 2, backgroundColor: colors.lime, transformOrigin: 'top' }, line]} />
      <View style={{ gap: 14 }}>
        {items.map((b, i) => (
          <Animated.View key={b + i} entering={reduce ? FadeIn.duration(200) : FadeInDown.delay(delay + i * 260).springify().dampingRatio(0.8).duration(380)}>
            <Pressable
              onPress={onPick ? () => onPick(i) : undefined}
              disabled={!onPick}
              accessibilityRole={onPick ? 'button' : undefined}
              accessibilityLabel={onPick ? `Show step ${i + 1}: ${b}` : undefined}
              style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}
            >
              {/* Solid circles (dimmed by colour, not opacity) so the connecting line never shows through. */}
              <View style={{ width: 33, height: 33, borderRadius: 17, backgroundColor: active == null || active === i ? colors.lime : '#4E6620', borderWidth: 3, borderColor: active === i ? colors.paper : colors.ink, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: fonts.display, fontSize: 16, lineHeight: 20, color: colors.ink }}>{i + 1}</Text>
              </View>
              <Text style={{ flex: 1, fontFamily: fonts.bodyBold, fontSize: active == null ? 17 : 16, lineHeight: 22, color: colors.paper, opacity: active == null || active === i ? 1 : 0.45 }}>{b}</Text>
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

/** A mistake and its fix, split at "Mistake: fix" (or a dash) when the coach wrote it that way. */
function DontDo({ text }: { text: string }) {
  const m = text.match(/^(.+?)(?::\s+|\s+[—–-]\s+)(.+)$/);
  const dont = m ? m[1] : text;
  const fix = m ? m[2].charAt(0).toUpperCase() + m[2].slice(1) : null;
  return (
    <View style={{ borderRadius: 16, borderWidth: 2, borderColor: 'rgba(248,250,238,0.35)', overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 }}>
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' }}>
          <X size={15} color={colors.ink} strokeWidth={3} />
        </View>
        <Text style={{ flex: 1, fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 22, color: colors.paper }}>{dont}</Text>
      </View>
      {fix ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.lime }}>
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
            <Check size={15} color={colors.lime} strokeWidth={3} />
          </View>
          <Text style={{ flex: 1, fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 22, color: colors.ink }}>{fix}</Text>
        </View>
      ) : null}
    </View>
  );
}

const RING = 120;
const RING_STROKE = 12;
const RING_R = (RING - RING_STROKE) / 2;
const RING_C = 2 * Math.PI * RING_R;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** The drill's length as a timer ring that sweeps round once. */
function DrillRing({ minutes }: { minutes: number }) {
  const reduce = useReducedMotion();
  const sweep = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (!reduce) sweep.value = withDelay(200, withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }));
  }, [reduce, sweep]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: RING_C * (1 - sweep.value) }));
  return (
    <Animated.View entering={reduce ? undefined : ZoomIn.springify().dampingRatio(0.7).duration(500)} style={{ width: RING, height: RING }}>
      <Svg width={RING} height={RING} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={RING / 2} cy={RING / 2} r={RING_R} stroke="rgba(248,250,238,0.2)" strokeWidth={RING_STROKE} fill="none" />
        <AnimatedCircle
          cx={RING / 2}
          cy={RING / 2}
          r={RING_R}
          stroke={colors.lime}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={`${RING_C} ${RING_C}`}
          animatedProps={props}
          fill="none"
        />
      </Svg>
      <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 34, lineHeight: 38, color: colors.lime }}>{minutes}</Text>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.paper }}>min</Text>
      </View>
    </Animated.View>
  );
}

function SceneView({ scene, diagram, active, height, isFirst, onDrill }: { scene: Scene; diagram?: Diagram; active: boolean; height: number; isFirst: boolean; onDrill: (minutes: number) => void }) {
  const reduce = useReducedMotion();
  const insets = useSafeAreaInsets();
  // The steps scene plays its diagram frame by frame; the matching step lights up.
  const showDiagram = scene.kind === 'steps' && !!diagram && diagram.type !== 'none' && diagram.frames.length > 0;
  const count = showDiagram ? diagramFrames(diagram!) : 0;
  // Busy scenes skip the icon tile so everything fits on one screen.
  const busy = showDiagram || scene.bullets.length >= 3;
  const [frame, setFrame] = useState(0);
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!active) {
      setFrame(0);
      setAuto(true);
    }
  }, [active]);
  useEffect(() => {
    if (!showDiagram || !active || !auto || count < 2) return;
    const t = setInterval(() => setFrame((f) => (f + 1) % count), diagram!.type === 'code' || diagram!.type === 'terminal' ? 3200 : 2600);
    return () => clearInterval(t);
  }, [showDiagram, active, auto, count, diagram]);
  const pick = (i: number) => {
    haptics.select();
    setAuto(false);
    setFrame(diagram?.type === 'compare' ? i % 2 : Math.min(i, count - 1));
  };
  const enter = (n: number) => (reduce ? FadeIn.duration(200) : FadeInDown.delay(120 + n * 90).springify().dampingRatio(1).duration(420));
  const nudge = useSharedValue(0);
  useEffect(() => {
    if (!isFirst || !active || reduce) return;
    nudge.value = withRepeat(withSequence(withTiming(-6, { duration: 500 }), withSpring(0, springs.ui)), -1);
  }, [isFirst, active, reduce, nudge]);
  const nudgeStyle = useAnimatedStyle(() => ({ transform: [{ translateY: nudge.value }] }));

  return (
    <View style={{ height, paddingHorizontal: 24, paddingTop: insets.top + 64, paddingBottom: insets.bottom + 36 }}>
      {/* Spacers centre short scenes; tall ones start right under the header instead of hiding behind it. */}
      <View style={{ flexGrow: 1, flexShrink: 1, minHeight: 0 }} />
      {/* Remount on activation so each scene animates in when you reach it. */}
      {active ? (
        <View style={{ gap: showDiagram ? 14 : 18, flexShrink: 0 }}>
          {scene.kind === 'drill' ? <DrillRing minutes={scene.minutes ?? 10} /> : busy ? null : <Visual visual={scene.visual} active={active} />}
          <Animated.View entering={enter(0)} style={{ alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 2, borderColor: colors.lime }}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: colors.lime }}>{KIND_LABEL[scene.kind]}</Text>
          </Animated.View>
          <Animated.View entering={enter(1)}>
            <Text style={{ fontFamily: fonts.display, fontSize: busy ? 28 : 32, lineHeight: busy ? 32 : 36, color: colors.paper }} accessibilityRole="header">{scene.title}</Text>
          </Animated.View>
          {showDiagram ? (
            <Animated.View entering={enter(2)}>
              <LessonDiagram diagram={diagram!} frame={frame} />
            </Animated.View>
          ) : (
            <Animated.View entering={enter(2)}>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 18, lineHeight: 26, color: colors.paper, opacity: 0.9 }}>{scene.body}</Text>
            </Animated.View>
          )}
          {scene.kind === 'steps' && scene.bullets.length ? (
            <StepFlow
              items={scene.bullets}
              delay={120 + 3 * 90}
              active={showDiagram && diagram!.type !== 'compare' ? frame : null}
              onPick={showDiagram ? pick : undefined}
            />
          ) : scene.kind === 'mistakes' && scene.bullets.length ? (
            <View style={{ gap: 10 }}>
              {scene.bullets.map((b, i) => (
                <Animated.View key={b + i} entering={enter(3 + i)}>
                  <DontDo text={b} />
                </Animated.View>
              ))}
            </View>
          ) : scene.bullets.length ? (
            <View style={{ gap: 10 }}>
              {scene.bullets.map((b, i) => (
                <Animated.View key={b + i} entering={enter(3 + i)} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={18} color={colors.ink} strokeWidth={3} />
                  </View>
                  <Text style={{ flex: 1, fontFamily: fonts.bodyBold, fontSize: 17, lineHeight: 24, color: colors.paper }}>{b}</Text>
                </Animated.View>
              ))}
            </View>
          ) : null}
          {scene.kind === 'drill' ? (
            <Animated.View entering={enter(4 + scene.bullets.length)} style={{ marginTop: 8 }}>
              <Button variant="lime" label={`Start a ${scene.minutes ?? 10}-minute drill`} onPress={() => onDrill(scene.minutes ?? 10)} />
            </Animated.View>
          ) : null}
        </View>
      ) : null}
      <View style={{ flexGrow: 1, flexShrink: 1, minHeight: 0 }} />
      {isFirst && active ? (
        <Animated.View entering={FadeIn.delay(900)} style={[{ position: 'absolute', bottom: 20, left: 0, right: 0, alignItems: 'center' }, nudgeStyle]}>
          <ChevronUp size={22} color={colors.lime} strokeWidth={2.5} />
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.lime }}>Swipe up</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** A short lesson for one step of a skill tree, as a vertical swipe feed. id = step (node) id. */
export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const node = useStore((s) => s.nodes.find((n) => n.id === id));
  const skill = useStore((s) => s.skills.find((k) => k.id === node?.skillId));
  const updateNode = useStore((s) => s.updateNode);
  const [state, setState] = useState<{ at: 'loading' } | { at: 'error'; code: string; message: string } | { at: 'ready'; key: string; lesson: Lesson }>({ at: 'loading' });
  const [height, setHeight] = useState(0);
  const [index, setIndex] = useState(0);

  const load = useCallback(() => {
    if (!node || !skill) return;
    setState({ at: 'loading' });
    getLesson(skill.name, node.title, node.notes)
      .then((r) => setState({ at: 'ready', ...r }))
      .catch((e) => setState({ at: 'error', code: e instanceof CoachError ? e.code : 'error', message: e instanceof CoachError ? e.message : 'Couldn’t load this lesson.' }));
  }, [node?.id, skill?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(load, [load]);

  if (!node || !skill) return null;

  const onLayout = (e: LayoutChangeEvent) => setHeight(e.nativeEvent.layout.height);
  const onPage = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!height) return;
    const i = Math.round(e.nativeEvent.contentOffset.y / height);
    if (i !== index) {
      haptics.select();
      setIndex(i);
    }
  };

  const drill = () => {
    if (node.status === 'todo') updateNode(node.id, { status: 'learning' });
    router.back();
    startSession(skill.id);
  };

  const report = () => {
    if (state.at !== 'ready') return;
    Alert.alert('Report this lesson?', 'Tell us if it’s wrong, unsafe or unhelpful. Lessons with several reports are taken down and rewritten.', [
      { text: 'Cancel', style: 'cancel' },
      ...(['It’s wrong', 'It’s unsafe', 'It’s not helpful'] as const).map((reason) => ({
        text: reason,
        onPress: () => {
          reportLesson(state.key, reason)
            .then(() => notify({ kind: 'info', title: 'Thanks for the report', body: 'We’ll look at this lesson.' }))
            .catch(() => notify({ kind: 'info', title: 'Couldn’t send the report', body: 'Check your connection and try again.' }));
        },
      })),
    ]);
  };

  const scenes = state.at === 'ready' ? state.lesson.scenes : [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.ink }}>
      <View style={{ flex: 1 }} onLayout={onLayout}>
        {state.at === 'ready' && height ? (
          <ScrollView pagingEnabled showsVerticalScrollIndicator={false} onScroll={onPage} scrollEventThrottle={32} decelerationRate="fast">
            {scenes.map((s, i) => (
              <SceneView key={i} scene={s} diagram={state.at === 'ready' ? state.lesson.diagram : undefined} active={i === index} height={height} isFirst={i === 0} onDrill={drill} />
            ))}
          </ScrollView>
        ) : state.at === 'loading' ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 }} accessibilityLiveRegion="polite">
            <ActivityIndicator color={colors.lime} size="large" />
            <Text style={{ fontFamily: fonts.displaySemi, fontSize: 20, color: colors.lime, textAlign: 'center' }}>Making your lesson</Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 15, color: colors.paper, opacity: 0.8, textAlign: 'center' }}>{node.title}</Text>
          </View>
        ) : state.at === 'error' ? (
          <View style={{ flex: 1, justifyContent: 'center', gap: 16, padding: 24 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 28, lineHeight: 32, color: colors.lime }}>{state.code === 'signin' ? 'Sign in for lessons' : 'No lesson yet'}</Text>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 16, lineHeight: 22, color: colors.paper }}>{state.message}</Text>
            {state.code === 'signin' ? <AppleSignInButton onDone={load} /> : <Button variant="lime" label="Try again" onPress={load} />}
          </View>
        ) : null}
      </View>

      {/* Story-style progress, close and report sit above the feed. */}
      <SafeAreaView edges={['top']} pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
        <View pointerEvents="box-none" style={{ paddingHorizontal: 16, paddingTop: 8, gap: 10 }}>
          {scenes.length ? (
            <View style={{ flexDirection: 'row', gap: 4 }} accessibilityLabel={`Scene ${index + 1} of ${scenes.length}`}>
              {scenes.map((_, i) => (
                <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= index ? colors.lime : 'rgba(248,250,238,0.25)' }} />
              ))}
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close lesson" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <X size={26} color={colors.paper} strokeWidth={2.5} />
            </Pressable>
            <Text numberOfLines={1} style={{ flex: 1, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 14, color: colors.paper, opacity: 0.85 }}>
              {skill.name} · {node.title}
            </Text>
            {state.at === 'ready' ? (
              <Pressable onPress={report} hitSlop={12} accessibilityRole="button" accessibilityLabel="Report this lesson" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Flag size={20} color={colors.paper} strokeWidth={2.25} />
              </Pressable>
            ) : (
              <View style={{ width: 44 }} />
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

export { RouteError as ErrorBoundary };

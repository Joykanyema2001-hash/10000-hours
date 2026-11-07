import Check from 'lucide-react-native/icons/check';
import X from 'lucide-react-native/icons/x';
import { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInLeft, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import type { Diagram, DiagramFrame } from '../lib/coach';
import { colors, fonts } from '../theme';
import { Text } from './Text';

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });
const PANEL = '#1A1942';
const FAINT = 'rgba(248,250,238,0.22)';

/** How many frames the diagram steps through (compare always toggles between two). */
export const diagramFrames = (d: Diagram) => (d.type === 'compare' ? 2 : d.frames.length);

/**
 * A small animated diagram for a lesson's steps. `frame` is driven from outside so the
 * diagram and the numbered steps move together.
 */
export function LessonDiagram({ diagram, frame }: { diagram: Diagram; frame: number }) {
  switch (diagram.type) {
    case 'code':
      return <Editor frames={diagram.frames} frame={frame} />;
    case 'terminal':
      return <Terminal frames={diagram.frames} frame={frame} />;
    case 'cycle':
      return <Cycle frames={diagram.frames} frame={frame} />;
    case 'intervals':
      return <Intervals frames={diagram.frames} frame={frame} />;
    case 'compare':
      return <Compare frames={diagram.frames} frame={frame % 2} />;
    default:
      return null;
  }
}

function WindowBar({ title }: { title: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: FAINT }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: i === 0 ? colors.lime : FAINT }} />
      ))}
      <Text numberOfLines={1} style={{ flex: 1, marginLeft: 6, fontFamily: fonts.bodyBold, fontSize: 12, color: colors.paper, opacity: 0.8 }}>{title}</Text>
    </View>
  );
}

/** Code built up step by step: earlier lines stay, this step's lines slide in highlighted. */
function Editor({ frames, frame }: { frames: DiagramFrame[]; frame: number }) {
  const reduce = useReducedMotion();
  const rows: { text: string; current: boolean; key: string }[] = [];
  frames.slice(0, frame + 1).forEach((f, fi) => f.lines.forEach((text, li) => rows.push({ text, current: fi === frame, key: `${fi}-${li}` })));
  const shown = rows.slice(-9);
  let fresh = 0;
  return (
    <View style={{ borderRadius: 16, backgroundColor: PANEL, borderWidth: 2, borderColor: FAINT, overflow: 'hidden' }}>
      <WindowBar title={`Step ${frame + 1} · ${frames[frame]?.label ?? ''}`} />
      <View style={{ paddingVertical: 10, minHeight: 120 }}>
        {shown.map((r, i) => (
          <Animated.View
            key={r.key}
            entering={r.current && !reduce ? FadeInLeft.delay(120 + fresh++ * 140).duration(260) : undefined}
            style={{ flexDirection: 'row', paddingHorizontal: 10, backgroundColor: r.current ? 'rgba(198,255,43,0.14)' : 'transparent' }}
          >
            <Text style={{ width: 22, fontFamily: MONO, fontSize: 12, lineHeight: 20, color: colors.paper, opacity: 0.35 }}>{rows.length - shown.length + i + 1}</Text>
            <Text style={{ flex: 1, fontFamily: MONO, fontSize: 13, lineHeight: 20, color: r.current ? colors.lime : colors.paper, opacity: r.current ? 1 : 0.7 }}>{r.text}</Text>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

/** Types a line out character by character. */
function Typed({ text, delay = 0, style }: { text: string; delay?: number; style: object }) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? text.length : 0);
  useEffect(() => {
    if (reduce) return setN(text.length);
    setN(0);
    let i = 0;
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      timer = setInterval(() => {
        i += 1;
        setN(i);
        if (i >= text.length && timer) clearInterval(timer);
      }, 28);
    }, delay);
    return () => {
      clearTimeout(start);
      if (timer) clearInterval(timer);
    };
  }, [text, delay, reduce]);
  return <Text style={style}>{text.slice(0, n)}{n < text.length ? '▌' : ''}</Text>;
}

/** A command per step: it types out, then its output appears. */
function Terminal({ frames, frame }: { frames: DiagramFrame[]; frame: number }) {
  const blocks = frames.slice(0, frame + 1).slice(-3);
  const offset = Math.max(0, frame + 1 - 3);
  return (
    <View style={{ borderRadius: 16, backgroundColor: '#05050F', borderWidth: 2, borderColor: FAINT, overflow: 'hidden' }}>
      <WindowBar title={`Terminal · step ${frame + 1}`} />
      <View style={{ padding: 12, gap: 6, minHeight: 120 }}>
        {blocks.map((f, bi) => {
          const current = offset + bi === frame;
          const [cmd = '', ...out] = f.lines;
          const typeMs = cmd.length * 28 + 150;
          return (
            <View key={offset + bi} style={{ gap: 2, opacity: current ? 1 : 0.55 }}>
              {current ? (
                <Typed text={`$ ${cmd}`} delay={150} style={{ fontFamily: MONO, fontSize: 13, lineHeight: 19, color: colors.lime }} />
              ) : (
                <Text style={{ fontFamily: MONO, fontSize: 13, lineHeight: 19, color: colors.lime }}>$ {cmd}</Text>
              )}
              {out.map((o, i) => (
                <Animated.View key={i} entering={current ? FadeIn.delay(typeMs + 150 + i * 120).duration(200) : undefined}>
                  <Text style={{ fontFamily: MONO, fontSize: 12, lineHeight: 18, color: colors.paper, opacity: 0.8 }}>{o}</Text>
                </Animated.View>
              ))}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const CYCLE = 200;
const ORBIT = 78;

/** Phases around a ring; a pointer sweeps to the current phase, named in the middle. */
function Cycle({ frames, frame }: { frames: DiagramFrame[]; frame: number }) {
  const reduce = useReducedMotion();
  const n = Math.max(frames.length, 1);
  // Keep turning forward, even when wrapping from the last phase to the first.
  const turns = useRef(0);
  const last = useRef(frame);
  if (frame < last.current) turns.current += 1;
  last.current = frame;
  const angle = useSharedValue(0);
  useEffect(() => {
    const target = (turns.current * n + frame) * (360 / n);
    angle.value = reduce ? target : withTiming(target, { duration: 700, easing: Easing.inOut(Easing.cubic) });
  }, [frame, n, reduce, angle]);
  const pointer = useAnimatedStyle(() => ({ transform: [{ rotate: `${angle.value}deg` }] }));
  const f = frames[frame];

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: CYCLE, height: CYCLE }}>
        <Svg width={CYCLE} height={CYCLE} style={{ position: 'absolute' }}>
          <Circle cx={CYCLE / 2} cy={CYCLE / 2} r={ORBIT} stroke={FAINT} strokeWidth={3} strokeDasharray="6 8" fill="none" />
        </Svg>
        {/* Pointer arm with a lime head, rotating around the centre. */}
        <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: CYCLE, height: CYCLE, alignItems: 'center' }, pointer]}>
          <View style={{ marginTop: CYCLE / 2 - ORBIT - 21, width: 42, height: 42, borderRadius: 21, borderWidth: 3, borderColor: colors.lime }} />
        </Animated.View>
        {frames.map((p, i) => {
          const a = ((i * 360) / n - 90) * (Math.PI / 180);
          const x = CYCLE / 2 + ORBIT * Math.cos(a) - 15;
          const y = CYCLE / 2 + ORBIT * Math.sin(a) - 15;
          const on = i === frame;
          return (
            <View key={i} style={{ position: 'absolute', left: x, top: y, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.lime : PANEL, borderWidth: 2, borderColor: on ? colors.lime : FAINT }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 14, lineHeight: 18, color: on ? colors.ink : colors.paper }}>{i + 1}</Text>
            </View>
          );
        })}
        <View style={{ position: 'absolute', left: 40, right: 40, top: 60, bottom: 60, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View key={frame} entering={reduce ? undefined : FadeIn.duration(250)} style={{ alignItems: 'center' }}>
            <Text numberOfLines={2} style={{ fontFamily: fonts.displaySemi, fontSize: 16, lineHeight: 19, color: colors.paper, textAlign: 'center' }}>{f?.label}</Text>
            {f?.value ? <Text style={{ fontFamily: fonts.display, fontSize: 22, lineHeight: 26, color: colors.lime }}>{f.value}s</Text> : null}
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

/** Timed blocks as a bar; a playhead moves to the current block. */
function Intervals({ frames, frame }: { frames: DiagramFrame[]; frame: number }) {
  const reduce = useReducedMotion();
  const [width, setWidth] = useState(0);
  const sizes = frames.map((f) => Math.max(0.5, f.value ?? 1));
  const total = sizes.reduce((a, b) => a + b, 0);
  const before = sizes.slice(0, frame).reduce((a, b) => a + b, 0);
  const mid = width ? ((before + sizes[frame] / 2) / total) * width : 0;
  const head = useSharedValue(0);
  useEffect(() => {
    head.value = reduce ? mid : withSpring(mid, { dampingRatio: 0.9, duration: 600 });
  }, [mid, reduce, head]);
  const headStyle = useAnimatedStyle(() => ({ transform: [{ translateX: head.value - 7 }] }));
  const f = frames[frame];
  return (
    <View style={{ gap: 12 }}>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', height: 48, borderRadius: 14, overflow: 'hidden', borderWidth: 2, borderColor: FAINT }}>
        {frames.map((b, i) => (
          <View
            key={i}
            style={{ flex: sizes[i], alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, backgroundColor: i === frame ? colors.lime : i % 2 === 0 ? PANEL : 'rgba(248,250,238,0.08)', borderLeftWidth: i ? 1 : 0, borderLeftColor: FAINT }}
          >
            <Text numberOfLines={1} style={{ fontFamily: fonts.bodyBold, fontSize: 11, color: i === frame ? colors.ink : colors.paper }}>{b.label}</Text>
          </View>
        ))}
      </View>
      <View style={{ height: 14 }}>
        <Animated.View style={[{ width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderBottomWidth: 12, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: colors.lime }, headStyle]} />
      </View>
      <Animated.View key={frame} entering={reduce ? undefined : FadeIn.duration(250)} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
        <Text style={{ fontFamily: fonts.displaySemi, fontSize: 20, lineHeight: 24, color: colors.paper }}>{f?.label}</Text>
        {f?.value ? <Text style={{ fontFamily: fonts.display, fontSize: 20, lineHeight: 24, color: colors.lime }}>{f.value} min</Text> : null}
      </Animated.View>
    </View>
  );
}

/** Wrong way and right way, the current one lit up. */
function Compare({ frames, frame }: { frames: DiagramFrame[]; frame: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {frames.slice(0, 2).map((f, i) => (
        <CompareCard key={i} f={f} good={i === 1} on={i === frame} />
      ))}
    </View>
  );
}

function CompareCard({ f, good, on }: { f: DiagramFrame; good: boolean; on: boolean }) {
  const reduce = useReducedMotion();
  const lit = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    lit.value = reduce ? (on ? 1 : 0) : withTiming(on ? 1 : 0, { duration: 300 });
  }, [on, reduce, lit]);
  const style = useAnimatedStyle(() => ({ opacity: 0.45 + 0.55 * lit.value, transform: [{ scale: 0.96 + 0.04 * lit.value }] }));
  return (
    <Animated.View style={[{ flex: 1, borderRadius: 16, borderWidth: 2, borderColor: good ? colors.lime : FAINT, backgroundColor: good ? 'rgba(198,255,43,0.12)' : PANEL, padding: 12, gap: 8 }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: good ? colors.lime : colors.paper }}>
          {good ? <Check size={14} color={colors.ink} strokeWidth={3} /> : <X size={14} color={colors.ink} strokeWidth={3} />}
        </View>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: good ? colors.lime : colors.paper }}>{good ? 'Like this' : 'Not like this'}</Text>
      </View>
      <Text style={{ fontFamily: fonts.displaySemi, fontSize: 15, lineHeight: 19, color: colors.paper }}>{f.label}</Text>
      {f.lines.map((l, i) => (
        <Text key={i} style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.paper, opacity: 0.85 }}>{l}</Text>
      ))}
    </Animated.View>
  );
}

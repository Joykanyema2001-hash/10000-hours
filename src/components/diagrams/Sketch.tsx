import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedProps, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import type { DiagramFrame } from '../../lib/coach';
import { colors, fonts } from '../../theme';
import { Text } from '../Text';
import { FrameStrip, Panel, type DiagramProps } from './shared';

const AnimatedPath = Animated.createAnimatedComponent(Path);
type Stroke = { d: string; len: number };

const dist = (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1);

/** One drawing instruction in 0–100 canvas units → an SVG path and its length. */
function parse(line: string, k: number): Stroke | null {
  const t = line.trim().toLowerCase().split(/[\s,]+/);
  const n = t.slice(1).map((v) => Number(v) * k);
  if (n.some((v) => Number.isNaN(v))) return null;
  switch (t[0]) {
    case 'circle': {
      const [cx, cy, r] = n;
      if (!(r > 0)) return null;
      return { d: `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0`, len: 2 * Math.PI * r };
    }
    case 'ellipse':
    case 'oval': {
      const [cx, cy, rx, ry] = n;
      if (!(rx > 0 && ry > 0)) return null;
      const len = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
      return { d: `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${2 * rx} 0 a${rx} ${ry} 0 1 0 ${-2 * rx} 0`, len };
    }
    case 'line': {
      const [x1, y1, x2, y2] = n;
      return { d: `M${x1} ${y1} L${x2} ${y2}`, len: dist(x1, y1, x2, y2) };
    }
    case 'curve': {
      const [x1, y1, cx, cy, x2, y2] = n;
      if (n.length < 6) return null;
      return { d: `M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`, len: (dist(x1, y1, x2, y2) + dist(x1, y1, cx, cy) + dist(cx, cy, x2, y2)) / 2 };
    }
    case 'arc': {
      const [cx, cy, r] = n;
      const a0 = Number(t[4]);
      const a1 = Number(t[5]);
      if (!(r > 0) || Number.isNaN(a0) || Number.isNaN(a1)) return null;
      const rad = Math.PI / 180;
      const sx = cx + r * Math.cos(a0 * rad);
      const sy = cy + r * Math.sin(a0 * rad);
      const ex = cx + r * Math.cos(a1 * rad);
      const ey = cy + r * Math.sin(a1 * rad);
      const span = a1 - a0;
      return { d: `M${sx} ${sy} A${r} ${r} 0 ${Math.abs(span) > 180 ? 1 : 0} ${span > 0 ? 1 : 0} ${ex} ${ey}`, len: Math.abs(span) * rad * r };
    }
    case 'rect': {
      const [x, y, w, h] = n;
      return { d: `M${x} ${y} h${w} v${h} h${-w} Z`, len: 2 * (Math.abs(w) + Math.abs(h)) };
    }
    default:
      return null;
  }
}

/** A stroke that draws itself, like a pen moving. */
function Live({ s, delay }: { s: Stroke; delay: number }) {
  const reduce = useReducedMotion();
  const p = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (!reduce) p.value = withDelay(delay, withTiming(1, { duration: Math.min(1100, 300 + s.len * 3), easing: Easing.inOut(Easing.quad) }));
  }, [delay, reduce, p, s.len]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: s.len * (1 - p.value) }));
  return <AnimatedPath d={s.d} stroke={colors.lime} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray={`${s.len} ${s.len}`} animatedProps={props} />;
}

/** A drawing built up stroke by stroke: earlier strokes stay as light guide lines. */
export function Sketch({ frames, frame }: DiagramProps) {
  const reduce = useReducedMotion();
  const [w, setW] = useState(0);
  const size = Math.min(w, 250);
  const k = size / 100;
  const strokes = (f: DiagramFrame) => f.lines.map((l) => parse(l, k)).filter((s): s is Stroke => !!s);
  const before = frames.slice(0, frame).flatMap(strokes);
  const now = frames[frame] ? strokes(frames[frame]) : [];
  const f = frames[frame];
  return (
    <Panel>
      <FrameStrip frames={frames} frame={frame} />
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ alignItems: 'center' }}>
        {size ? (
          <View style={{ width: size, height: size, borderRadius: 14, backgroundColor: '#12112E', borderWidth: 2, borderColor: 'rgba(248,250,238,0.12)' }}>
            <Svg key={frame} width={size} height={size}>
              {before.map((s, i) => (
                <Path key={`b${i}`} d={s.d} stroke="rgba(248,250,238,0.35)" strokeWidth={2} strokeLinecap="round" fill="none" />
              ))}
              {now.map((s, i) => (
                <Live key={`n${i}`} s={{ ...s }} delay={200 + i * 500} />
              ))}
            </Svg>
          </View>
        ) : null}
      </View>
      <Animated.View key={frame} entering={reduce ? undefined : FadeIn.delay(200).duration(250)}>
        <Text style={{ fontFamily: fonts.display, fontSize: 20, lineHeight: 24, color: colors.paper }}>{f?.label}</Text>
      </Animated.View>
    </Panel>
  );
}

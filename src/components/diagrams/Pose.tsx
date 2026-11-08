import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedProps, useDerivedValue, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { FOCUS, LEN, POSES, type Pose as PoseAngles } from '../../lib/poses';
import { colors, fonts } from '../../theme';
import { Text } from '../Text';
import { DIM, FAINT, FrameStrip, Panel, type DiagramProps } from './shared';

const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const HEIGHT = 210;
const NEAR = colors.paper;
const FAR = 'rgba(248,250,238,0.45)';

// Joints: 0 hip, 1 neck/shoulder, 2 head, 3 elbowFar, 4 handFar, 5 elbowNear, 6 handNear, 7 kneeFar, 8 footFar, 9 kneeNear, 10 footNear, 11 mid-back
function solve(a: number[], width: number, water: boolean): number[] {
  'worklet';
  const r = Math.PI / 180;
  const out: number[] = [];
  const add = (x: number, y: number) => out.push(x, y);
  const step = (i: number, deg: number, len: number) => {
    add(out[i * 2] + Math.sin(deg * r) * len, out[i * 2 + 1] + Math.cos(deg * r) * len);
  };
  add(0, 0); // hip
  step(0, a[0], LEN.torso); // neck
  step(1, a[0], LEN.neck + LEN.head - 2); // head centre
  step(1, a[1], LEN.upperArm); // elbow far
  step(3, a[2], LEN.forearm); // hand far
  step(1, a[3], LEN.upperArm); // elbow near
  step(5, a[4], LEN.forearm); // hand near
  step(0, a[5], LEN.thigh); // knee far
  step(7, a[6], LEN.shin); // foot far
  step(0, a[7], LEN.thigh); // knee near
  step(9, a[8], LEN.shin); // foot near
  add((out[0] + out[2]) / 2, (out[1] + out[3]) / 2); // mid-back
  // Fit and place: feet (or hands) on the floor, or the hips just under the water line.
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  for (let i = 0; i < out.length; i += 2) {
    minX = Math.min(minX, out[i]);
    maxX = Math.max(maxX, out[i]);
    minY = Math.min(minY, out[i + 1] - (i === 4 ? LEN.head : 0));
    maxY = Math.max(maxY, out[i + 1]);
  }
  const s = Math.min(1.55, (width - 40) / Math.max(1, maxX - minX), (HEIGHT - 30) / Math.max(1, maxY - minY));
  const ox = width / 2 - ((minX + maxX) / 2) * s;
  const oy = water ? HEIGHT * 0.42 : HEIGHT - 16 - maxY * s;
  for (let i = 0; i < out.length; i += 2) {
    out[i] = ox + out[i] * s;
    out[i + 1] = oy + out[i + 1] * s;
  }
  out.push(s);
  return out;
}

function Bone({ p, a, b, color, width }: { p: SharedValue<number[]>; a: number; b: number; color: string; width: number }) {
  const props = useAnimatedProps(() => ({ x1: p.value[a * 2], y1: p.value[a * 2 + 1], x2: p.value[b * 2], y2: p.value[b * 2 + 1] }));
  return <AnimatedLine animatedProps={props} stroke={color} strokeWidth={width} strokeLinecap="round" />;
}

/**
 * A figure that moves from pose to pose, so the shape of a movement is easy to copy.
 * Each frame names a preset pose, a short cue and, optionally, the body part to watch.
 */
export function PoseDiagram({ frames, frame, meta }: DiagramProps) {
  const reduce = useReducedMotion();
  const [w, setW] = useState(0);
  const water = (meta[0] ?? '').toLowerCase() === 'water';
  const f = frames[frame];
  const name = (f?.lines[0] ?? '').trim().toLowerCase();
  const target: PoseAngles = POSES[name] ?? POSES[(frames.find((x) => POSES[(x.lines[0] ?? '').toLowerCase()])?.lines[0] ?? 'stand').toLowerCase()] ?? POSES.stand;
  const focus = FOCUS.find((x) => x === (f?.lines[2] ?? '').trim().toLowerCase());
  const focusJoint = focus ? { head: 2, shoulders: 1, elbows: 5, hands: 6, back: 11, hips: 0, knees: 9, feet: 10 }[focus] : -1;

  const from = useSharedValue<number[]>([...target]);
  const to = useSharedValue<number[]>([...target]);
  const t = useSharedValue(1);
  const width = useSharedValue(0);
  const first = useRef(true);
  useEffect(() => {
    width.value = w;
  }, [w, width]);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    from.value = from.value.map((x, i) => x + (to.value[i] - x) * t.value);
    to.value = [...target];
    t.value = 0;
    t.value = reduce ? 1 : withTiming(1, { duration: 700, easing: Easing.inOut(Easing.cubic) });
  }, [frame]); // eslint-disable-line react-hooks/exhaustive-deps

  const pts = useDerivedValue(() => {
    const a = from.value.map((x, i) => x + (to.value[i] - x) * t.value);
    return solve(a, width.value || 300, water);
  });
  const head = useAnimatedProps(() => ({ cx: pts.value[4], cy: pts.value[5], r: LEN.head * pts.value[24] }));
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (!reduce) pulse.value = withRepeat(withSequence(withTiming(1.25, { duration: 600 }), withTiming(1, { duration: 600 })), -1);
  }, [reduce, pulse]);
  const ring = useAnimatedProps(() => ({
    cx: focusJoint >= 0 ? pts.value[focusJoint * 2] : -100,
    cy: focusJoint >= 0 ? pts.value[focusJoint * 2 + 1] : -100,
    r: 13 * pulse.value,
  }));

  return (
    <Panel>
      <FrameStrip frames={frames} frame={frame} />
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: HEIGHT, borderRadius: 12, overflow: 'hidden', backgroundColor: water ? '#10224A' : 'transparent' }}>
        {w ? (
          <Svg width={w} height={HEIGHT}>
            {water ? (
              <Path d={`M0 ${HEIGHT * 0.36} q ${w / 16} -6 ${w / 8} 0 t ${w / 8} 0 t ${w / 8} 0 t ${w / 8} 0 t ${w / 8} 0 t ${w / 8} 0 t ${w / 8} 0 t ${w / 8} 0`} stroke="rgba(248,250,238,0.5)" strokeWidth={2} fill="none" />
            ) : (
              <Line x1={8} y1={HEIGHT - 14} x2={w - 8} y2={HEIGHT - 14} stroke={FAINT} strokeWidth={3} strokeLinecap="round" />
            )}
            <Bone p={pts} a={1} b={3} color={FAR} width={6} />
            <Bone p={pts} a={3} b={4} color={FAR} width={6} />
            <Bone p={pts} a={0} b={7} color={FAR} width={7} />
            <Bone p={pts} a={7} b={8} color={FAR} width={7} />
            <Bone p={pts} a={0} b={1} color={NEAR} width={9} />
            <AnimatedCircle animatedProps={head} fill={NEAR} />
            <Bone p={pts} a={0} b={9} color={NEAR} width={7} />
            <Bone p={pts} a={9} b={10} color={NEAR} width={7} />
            <Bone p={pts} a={1} b={5} color={NEAR} width={6} />
            <Bone p={pts} a={5} b={6} color={NEAR} width={6} />
            {focusJoint >= 0 ? <AnimatedCircle animatedProps={ring} stroke={colors.lime} strokeWidth={3} fill="rgba(198,255,43,0.15)" /> : null}
          </Svg>
        ) : null}
      </View>
      <Animated.View key={frame} entering={reduce ? undefined : FadeIn.delay(300).duration(250)} style={{ gap: 2 }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 20, lineHeight: 24, color: colors.paper }}>{f?.label}</Text>
        {f?.lines[1] ? <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 19, color: colors.lime }}>{f.lines[1]}</Text> : null}
        {focus ? <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: DIM }}>Watch your {focus}</Text> : null}
      </Animated.View>
    </Panel>
  );
}

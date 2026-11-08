import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G, Line, Polygon, Rect } from 'react-native-svg';
import type { DiagramFrame } from '../../lib/coach';
import { colors, fonts } from '../../theme';
import { Text } from '../Text';
import { DIM, FrameStrip, Panel, type DiagramProps } from './shared';

type Surface = 'soccer' | 'basketball' | 'tennis' | 'map';
const ASPECT: Record<Surface, number> = { soccer: 0.64, basketball: 0.54, tennis: 0.5, map: 0.72 };
const LINE = 'rgba(248,250,238,0.35)';

type Arrow = { x1: number; y1: number; x2: number; y2: number; dashed: boolean };
type Zone = { x: number; y: number; r: number };
type State = { pos: Map<string, [number, number]>; arrows: Arrow[]; zones: Zone[] };

const ENTITY = /^(a\d*|b\d*|ally\d*|enemy\d*|me|you|ball|cone\d*|target)$/i;
const clamp = (v: number) => Math.max(0, Math.min(100, Number(v) || 0));

/** Positions carry over between frames; arrows and zones belong to the frame that draws them. */
function stateAt(frames: DiagramFrame[], frame: number): State {
  const pos = new Map<string, [number, number]>();
  let arrows: Arrow[] = [];
  let zones: Zone[] = [];
  frames.slice(0, frame + 1).forEach((f, fi) => {
    const here: Arrow[] = [];
    const zs: Zone[] = [];
    for (const line of f.lines) {
      const t = line.trim().split(/[\s,]+/);
      const head = t[0]?.toLowerCase();
      if (!head) continue;
      if (['arrow', 'pass', 'shot', 'run', 'move', 'path'].includes(head) && t.length >= 5) {
        here.push({ x1: clamp(+t[1]), y1: clamp(+t[2]), x2: clamp(+t[3]), y2: clamp(+t[4]), dashed: head === 'run' || head === 'move' || head === 'path' });
      } else if (head === 'zone' && t.length >= 4) {
        zs.push({ x: clamp(+t[1]), y: clamp(+t[2]), r: Math.max(3, Math.min(50, Number(t[3]) || 10)) });
      } else if (ENTITY.test(head) && t.length >= 3) {
        pos.set(head, [clamp(+t[1]), clamp(+t[2])]);
      }
    }
    if (fi === frame) {
      arrows = here;
      zones = zs;
    }
  });
  return { pos, arrows, zones };
}

function Markings({ surface, w, h }: { surface: Surface; w: number; h: number }) {
  const sw = 2;
  if (surface === 'soccer')
    return (
      <>
        <Rect x={4} y={4} width={w - 8} height={h - 8} stroke={LINE} strokeWidth={sw} fill="none" rx={4} />
        <Line x1={w / 2} y1={4} x2={w / 2} y2={h - 4} stroke={LINE} strokeWidth={sw} />
        <Circle cx={w / 2} cy={h / 2} r={h * 0.16} stroke={LINE} strokeWidth={sw} fill="none" />
        <Rect x={4} y={h * 0.25} width={w * 0.15} height={h * 0.5} stroke={LINE} strokeWidth={sw} fill="none" />
        <Rect x={w - 4 - w * 0.15} y={h * 0.25} width={w * 0.15} height={h * 0.5} stroke={LINE} strokeWidth={sw} fill="none" />
        <Rect x={0} y={h * 0.42} width={4} height={h * 0.16} fill={colors.paper} />
        <Rect x={w - 4} y={h * 0.42} width={4} height={h * 0.16} fill={colors.paper} />
      </>
    );
  if (surface === 'basketball')
    return (
      <>
        <Rect x={4} y={4} width={w - 8} height={h - 8} stroke={LINE} strokeWidth={sw} fill="none" rx={4} />
        <Line x1={w / 2} y1={4} x2={w / 2} y2={h - 4} stroke={LINE} strokeWidth={sw} />
        <Circle cx={w / 2} cy={h / 2} r={h * 0.14} stroke={LINE} strokeWidth={sw} fill="none" />
        <Rect x={4} y={h * 0.33} width={w * 0.19} height={h * 0.34} stroke={LINE} strokeWidth={sw} fill="none" />
        <Rect x={w - 4 - w * 0.19} y={h * 0.33} width={w * 0.19} height={h * 0.34} stroke={LINE} strokeWidth={sw} fill="none" />
        <Circle cx={w * 0.06} cy={h / 2} r={h * 0.42} stroke={LINE} strokeWidth={sw} fill="none" />
        <Circle cx={w * 0.94} cy={h / 2} r={h * 0.42} stroke={LINE} strokeWidth={sw} fill="none" />
        <Circle cx={w * 0.055} cy={h / 2} r={5} stroke={colors.lime} strokeWidth={2} fill="none" />
        <Circle cx={w * 0.945} cy={h / 2} r={5} stroke={colors.lime} strokeWidth={2} fill="none" />
      </>
    );
  if (surface === 'tennis')
    return (
      <>
        <Rect x={4} y={4} width={w - 8} height={h - 8} stroke={LINE} strokeWidth={sw} fill="none" />
        <Rect x={4} y={h * 0.13} width={w - 8} height={h * 0.74} stroke={LINE} strokeWidth={sw} fill="none" />
        <Line x1={w / 2} y1={0} x2={w / 2} y2={h} stroke={colors.paper} strokeWidth={3} />
        <Line x1={w * 0.27} y1={h * 0.13} x2={w * 0.27} y2={h * 0.87} stroke={LINE} strokeWidth={sw} />
        <Line x1={w * 0.73} y1={h * 0.13} x2={w * 0.73} y2={h * 0.87} stroke={LINE} strokeWidth={sw} />
        <Line x1={w * 0.27} y1={h / 2} x2={w * 0.73} y2={h / 2} stroke={LINE} strokeWidth={sw} />
      </>
    );
  return (
    <>
      {Array.from({ length: 9 }, (_, i) => (
        <Line key={`v${i}`} x1={(w * (i + 1)) / 10} y1={0} x2={(w * (i + 1)) / 10} y2={h} stroke="rgba(248,250,238,0.08)" strokeWidth={1} />
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <Line key={`h${i}`} x1={0} y1={(h * (i + 1)) / 7} x2={w} y2={(h * (i + 1)) / 7} stroke="rgba(248,250,238,0.08)" strokeWidth={1} />
      ))}
    </>
  );
}

/** A player, ball or marker that glides to its new spot each frame. */
function Token({ id, x, y }: { id: string; x: number; y: number }) {
  const reduce = useReducedMotion();
  const tx = useSharedValue(x);
  const ty = useSharedValue(y);
  useEffect(() => {
    tx.value = reduce ? x : withTiming(x, { duration: 900 });
    ty.value = reduce ? y : withTiming(y, { duration: 900 });
  }, [x, y, reduce, tx, ty]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }, { translateY: ty.value }] }));
  const kind = id.replace(/\d+$/, '');
  const num = id.match(/\d+$/)?.[0] ?? '';
  const friendly = kind === 'a' || kind === 'ally' || kind === 'me' || kind === 'you';
  const size = kind === 'ball' ? 12 : kind === 'cone' ? 14 : 24;
  return (
    <Animated.View style={[{ position: 'absolute', left: -size / 2, top: -size / 2 }, style]}>
      {kind === 'cone' ? (
        <View style={{ width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderBottomWidth: 14, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#FF9F1C' }} />
      ) : kind === 'target' ? (
        <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 3, borderColor: colors.lime }} />
      ) : (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: kind === 'ball' ? colors.white : friendly ? colors.lime : '#FF6B6B',
            borderWidth: kind === 'me' || kind === 'you' ? 3 : 2,
            borderColor: kind === 'me' || kind === 'you' ? colors.paper : colors.ink,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {kind === 'me' || kind === 'you' ? (
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 9, color: colors.ink }}>YOU</Text>
          ) : num ? (
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, color: colors.ink }}>{num}</Text>
          ) : null}
        </View>
      )}
    </Animated.View>
  );
}

/** A top-down pitch, court or map: players and ball move between frames, with pass and run arrows. */
export function Field({ frames, frame, meta }: DiagramProps) {
  const reduce = useReducedMotion();
  const raw = (meta[0] ?? 'map').toLowerCase();
  const surface: Surface = raw === 'football' ? 'soccer' : (['soccer', 'basketball', 'tennis', 'map'] as const).find((s) => s === raw) ?? 'map';
  const [w, setW] = useState(0);
  const h = w * ASPECT[surface];
  const { pos, arrows, zones } = stateAt(frames, frame);
  const X = (v: number) => (v / 100) * w;
  const Y = (v: number) => (v / 100) * h;
  const f = frames[frame];
  return (
    <Panel>
      <FrameStrip frames={frames} frame={frame} />
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: h || 160, borderRadius: 12, overflow: 'hidden', backgroundColor: surface === 'map' ? '#12112E' : '#16301F' }}>
        {w ? (
          <>
            <Svg width={w} height={h} style={{ position: 'absolute' }}>
              <Markings surface={surface} w={w} h={h} />
              {zones.map((z, i) => (
                <Circle key={`z${frame}-${i}`} cx={X(z.x)} cy={Y(z.y)} r={(z.r / 100) * w} fill="rgba(198,255,43,0.12)" stroke={colors.lime} strokeWidth={2} strokeDasharray="5 5" />
              ))}
            </Svg>
            <Animated.View key={`a${frame}`} entering={reduce ? undefined : FadeIn.delay(700).duration(300)} style={{ position: 'absolute', left: 0, top: 0 }}>
              <Svg width={w} height={h}>
                {arrows.map((a, i) => {
                  const [x1, y1, x2, y2] = [X(a.x1), Y(a.y1), X(a.x2), Y(a.y2)];
                  const ang = Math.atan2(y2 - y1, x2 - x1);
                  const hx = x2 - 10 * Math.cos(ang);
                  const hy = y2 - 10 * Math.sin(ang);
                  const p1 = `${hx + 5 * Math.sin(ang)},${hy - 5 * Math.cos(ang)}`;
                  const p2 = `${hx - 5 * Math.sin(ang)},${hy + 5 * Math.cos(ang)}`;
                  return (
                    <G key={i}>
                      <Line x1={x1} y1={y1} x2={hx} y2={hy} stroke={colors.lime} strokeWidth={2.5} strokeDasharray={a.dashed ? '6 5' : undefined} />
                      <Polygon points={`${x2},${y2} ${p1} ${p2}`} fill={colors.lime} />
                    </G>
                  );
                })}
              </Svg>
            </Animated.View>
            {[...pos.entries()].map(([id, [x, y]]) => (
              <Token key={id} id={id} x={X(x)} y={Y(y)} />
            ))}
          </>
        ) : null}
      </View>
      <Animated.View key={frame} entering={reduce ? undefined : FadeIn.delay(200).duration(250)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 18, lineHeight: 22, color: colors.paper }}>{f?.label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: colors.lime }} />
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, color: DIM }}>you / your side</Text>
          <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: '#FF6B6B', marginLeft: 6 }} />
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, color: DIM }}>opponents</Text>
        </View>
      </Animated.View>
    </Panel>
  );
}

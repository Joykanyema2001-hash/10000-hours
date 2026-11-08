import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Polygon, Text as SvgText } from 'react-native-svg';
import type { DiagramFrame } from '../../lib/coach';
import { colors, fonts } from '../../theme';
import { Text } from '../Text';
import { DIM, FAINT, FrameStrip, Panel, type DiagramProps } from './shared';

type Kind = 'floor' | 'wall' | 'ramp' | 'cone' | 'cube' | 'player';
type Piece = { kind: Kind; x: number; y: number; z: number; dir: 'n' | 'e' | 's' | 'w' };

const ALIAS: Record<string, Kind> = { floor: 'floor', wall: 'wall', ramp: 'ramp', stairs: 'ramp', stair: 'ramp', cone: 'cone', roof: 'cone', pyramid: 'cone', cube: 'cube', block: 'cube', player: 'player', me: 'player', you: 'player' };
const N = 4; // grid tiles per side
const T = 36; // half tile width
const H = 40; // one level of height
const W = 2 * N * T + 12;
const OX = W / 2;
let OY = 2 * H + 14; // set per render from the tallest piece, so short builds don't float in empty space

/** "wall 1 0 0 n" → a piece. Unknown or out-of-range lines are skipped. */
function parse(line: string): Piece | null {
  const t = line.toLowerCase().split(/[\s,]+/).filter(Boolean);
  const kind = ALIAS[t[0]];
  if (!kind) return null;
  const [x, y, z] = [t[1], t[2], t[3]].map((v) => Math.max(0, Math.min(N - 1, Math.round(Number(v) || 0))));
  const dir = (['n', 'e', 's', 'w'] as const).find((d) => d === t[4]?.[0]) ?? 'n';
  return { kind, x, y, z: Math.min(z, 2), dir };
}

const iso = (x: number, y: number, z: number) => [OX + (x - y) * T, OY + (x + y) * (T / 2) - z * H];
const pts = (...p: number[][]) => p.map(([x, y]) => `${x},${y}`).join(' ');

function faces(p: Piece): { points: string; shade: number }[] {
  const { x, y, z } = p;
  const P = (dx: number, dy: number, dz: number) => iso(x + dx, y + dy, z + dz);
  switch (p.kind) {
    case 'floor':
      return [{ points: pts(P(0, 0, 0), P(1, 0, 0), P(1, 1, 0), P(0, 1, 0)), shade: 0 }];
    case 'wall': {
      const edge = { n: [[0, 0], [1, 0]], e: [[1, 0], [1, 1]], s: [[0, 1], [1, 1]], w: [[0, 0], [0, 1]] }[p.dir];
      const [[ax, ay], [bx, by]] = edge;
      return [{ points: pts(P(ax, ay, 0), P(bx, by, 0), P(bx, by, 1), P(ax, ay, 1)), shade: p.dir === 'e' || p.dir === 'w' ? 2 : 1 }];
    }
    case 'ramp': {
      const r = {
        n: [P(0, 1, 0), P(1, 1, 0), P(1, 0, 1), P(0, 0, 1)],
        s: [P(0, 0, 0), P(1, 0, 0), P(1, 1, 1), P(0, 1, 1)],
        e: [P(0, 0, 0), P(0, 1, 0), P(1, 1, 1), P(1, 0, 1)],
        w: [P(1, 0, 0), P(1, 1, 0), P(0, 1, 1), P(0, 0, 1)],
      }[p.dir];
      return [{ points: pts(...r), shade: 0 }];
    }
    case 'cone': {
      const top = P(0.5, 0.5, 0.7);
      return [
        { points: pts(P(0, 0, 0), P(1, 0, 0), top), shade: 1 },
        { points: pts(P(0, 0, 0), P(0, 1, 0), top), shade: 2 },
        { points: pts(P(1, 0, 0), P(1, 1, 0), top), shade: 2 },
        { points: pts(P(0, 1, 0), P(1, 1, 0), top), shade: 1 },
      ];
    }
    case 'cube':
      return [
        { points: pts(P(0, 1, 0), P(1, 1, 0), P(1, 1, 1), P(0, 1, 1)), shade: 1 },
        { points: pts(P(1, 0, 0), P(1, 1, 0), P(1, 1, 1), P(1, 0, 1)), shade: 2 },
        { points: pts(P(0, 0, 1), P(1, 0, 1), P(1, 1, 1), P(0, 1, 1)), shade: 0 },
      ];
    default:
      return [];
  }
}

const order = (p: Piece) => (p.x + p.y) * 10 + p.z * 3 + (p.kind === 'floor' ? 0 : p.kind === 'player' ? 2 : 1);
const LIME = ['#C6FF2B', '#A9DB1F', '#8CB817'];
const GHOST = ['rgba(248,250,238,0.20)', 'rgba(248,250,238,0.14)', 'rgba(248,250,238,0.10)'];

function Pieces({ pieces, current }: { pieces: Piece[]; current: boolean }) {
  return (
    <>
      {[...pieces].sort((a, b) => order(a) - order(b)).map((p, i) =>
        p.kind === 'player' ? (
          (() => {
            const [cx, cy] = iso(p.x + 0.5, p.y + 0.5, p.z + 0.55);
            return (
              <Circle key={i} cx={cx} cy={cy} r={9} fill={current ? colors.paper : 'rgba(248,250,238,0.5)'} stroke={colors.ink} strokeWidth={2} />
            );
          })()
        ) : (
          faces(p).map((f, j) => (
            <Polygon key={`${i}-${j}`} points={f.points} fill={current ? LIME[f.shade] : GHOST[f.shade]} stroke={current ? colors.ink : 'rgba(248,250,238,0.45)'} strokeWidth={1.5} strokeLinejoin="round" />
          ))
        ),
      )}
    </>
  );
}

/** An isometric build grid: each step's pieces drop into place on top of what's already built. */
export function Build({ frames, frame }: DiagramProps) {
  const reduce = useReducedMotion();
  const before = frames.slice(0, frame).flatMap((f: DiagramFrame) => f.lines.map(parse).filter((p): p is Piece => !!p));
  const now = (frames[frame]?.lines ?? []).map(parse).filter((p): p is Piece => !!p);
  // Room above the grid only for as many storeys as the whole build reaches.
  const everything = frames.flatMap((f: DiagramFrame) => f.lines.map(parse).filter((p): p is Piece => !!p));
  const levels = Math.max(1, ...everything.map((p) => p.z + (p.kind === 'floor' ? 0 : 1)));
  OY = levels * H + 16;
  const HEIGHT = N * T + levels * H + 28;
  const drop = useSharedValue(0);
  const fade = useSharedValue(1);
  useEffect(() => {
    drop.value = reduce ? 0 : -22;
    if (!reduce) drop.value = withSpring(0, { dampingRatio: 0.55, duration: 520 });
    fade.value = reduce ? 1 : 0;
    if (!reduce) fade.value = withTiming(1, { duration: 220 });
  }, [frame, reduce]); // eslint-disable-line react-hooks/exhaustive-deps
  const dropStyle = useAnimatedStyle(() => ({ transform: [{ translateY: drop.value }], opacity: fade.value }));
  const f = frames[frame];

  return (
    <Panel>
      <FrameStrip frames={frames} frame={frame} />
      <View style={{ alignItems: 'center' }}>
        <View style={{ width: W, height: HEIGHT }}>
          <Svg width={W} height={HEIGHT} style={{ position: 'absolute' }}>
            {Array.from({ length: N * N }, (_, i) => {
              const x = i % N;
              const y = Math.floor(i / N);
              return <Polygon key={i} points={pts(iso(x, y, 0), iso(x + 1, y, 0), iso(x + 1, y + 1, 0), iso(x, y + 1, 0))} fill="none" stroke={FAINT} strokeWidth={1} />;
            })}
            <SvgText x={iso(0, 0, 0)[0]} y={iso(0, 0, 0)[1] - 6} fill={DIM} fontSize={10} fontWeight="bold" textAnchor="middle">N</SvgText>
            <Pieces pieces={before} current={false} />
          </Svg>
          <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, dropStyle]}>
            <Svg width={W} height={HEIGHT}>
              <Pieces pieces={now} current />
            </Svg>
          </Animated.View>
        </View>
      </View>
      <Animated.View key={frame} entering={reduce ? undefined : FadeIn.delay(250).duration(250)}>
        <Text style={{ fontFamily: fonts.display, fontSize: 20, lineHeight: 24, color: colors.paper }}>{f?.label}</Text>
      </Animated.View>
    </Panel>
  );
}

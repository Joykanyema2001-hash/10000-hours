import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import type { DiagramFrame } from '../../lib/coach';
import { colors, fonts } from '../../theme';
import { Text } from '../Text';
import { DIM, FrameStrip, Panel, type DiagramProps } from './shared';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
const GLYPH: Record<string, string> = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const LIGHT = '#E7EFC8';
const DARK = '#8EA84A';

type Piece = { id: number; type: string; white: boolean; sq: number }; // sq: 0 = a8 … 63 = h1
const sqOf = (s: string) => {
  const m = s.match(/^([a-h])([1-8])$/);
  return m ? (8 - Number(m[2])) * 8 + (m[1].charCodeAt(0) - 97) : -1;
};

function fromFen(fen: string): Piece[] {
  const board = (fen.trim().split(' ')[0] || START).split('/');
  if (board.length !== 8) return fromFen(START);
  const out: Piece[] = [];
  board.forEach((row, r) => {
    let c = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) c += Number(ch);
      else if (GLYPH[ch.toLowerCase()]) out.push({ id: out.length, type: ch.toLowerCase(), white: ch === ch.toUpperCase(), sq: r * 8 + c++ });
    }
  });
  return out;
}

/**
 * Plays moves given as coordinates ("e2e4", "e7e8q") from a position. Handles castling,
 * promotion and en passant. Stops at the first move that doesn't fit the board.
 */
function play(fen: string, frames: DiagramFrame[], upTo: number) {
  let pieces = fromFen(fen);
  let last: [number, number] | null = null;
  let broken = false;
  for (const f of frames.slice(0, upTo + 1)) {
    const mv = (f.lines[0] ?? '').trim().toLowerCase().match(/^([a-h][1-8])-?([a-h][1-8])([qrbn])?$/);
    const from = mv ? sqOf(mv[1]) : -1;
    const to = mv ? sqOf(mv[2]) : -1;
    const piece = pieces.find((p) => p.sq === from);
    if (!piece || to < 0) {
      broken = true;
      break;
    }
    const target = pieces.find((p) => p.sq === to);
    if (target && target.white === piece.white) {
      broken = true;
      break;
    }
    pieces = pieces.filter((p) => p !== target);
    // En passant: a pawn moving diagonally onto an empty square takes the pawn beside it.
    if (piece.type === 'p' && !target && from % 8 !== to % 8) pieces = pieces.filter((p) => p.sq !== (from - (from % 8)) + (to % 8));
    // Castling: the king moves two files and the rook jumps over.
    if (piece.type === 'k' && Math.abs((to % 8) - (from % 8)) === 2) {
      const kingside = to % 8 > from % 8;
      const rook = pieces.find((p) => p.sq === from - (from % 8) + (kingside ? 7 : 0));
      if (rook) rook.sq = to + (kingside ? -1 : 1);
    }
    piece.sq = to;
    if (mv?.[3] && piece.type === 'p') piece.type = mv[3];
    else if (piece.type === 'p' && (to < 8 || to >= 56)) piece.type = 'q';
    last = [from, to];
    pieces = pieces.map((p) => ({ ...p }));
  }
  return { pieces, last, broken };
}

function Man({ p, size }: { p: Piece; size: number }) {
  const reduce = useReducedMotion();
  const x = (p.sq % 8) * size;
  const y = Math.floor(p.sq / 8) * size;
  const tx = useSharedValue(x);
  const ty = useSharedValue(y);
  useEffect(() => {
    tx.value = reduce ? x : withTiming(x, { duration: 450 });
    ty.value = reduce ? y : withTiming(y, { duration: 450 });
  }, [x, y, reduce, tx, ty]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }, { translateY: ty.value }] }));
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Text
        style={{
          fontSize: size * 0.78,
          lineHeight: size * 0.95,
          color: p.white ? colors.white : colors.ink,
          textShadowColor: p.white ? colors.ink : 'transparent',
          textShadowRadius: p.white ? 2 : 0,
          textShadowOffset: { width: 0, height: 0 },
        }}
        allowFontScaling={false}
      >
        {GLYPH[p.type]}
        {'︎'}
      </Text>
    </Animated.View>
  );
}

/** A chessboard that plays a line move by move, highlighting each move's squares. */
export function Chess({ frames, frame, meta }: DiagramProps) {
  const reduce = useReducedMotion();
  const [w, setW] = useState(0);
  const size = w / 8;
  const fen = meta[0] && meta[0].includes('/') ? meta[0] : START;
  const { pieces, last, broken } = play(fen, frames, frame);
  const f = frames[frame];
  return (
    <Panel>
      <FrameStrip frames={frames} frame={frame} />
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: w || 280, borderRadius: 8, overflow: 'hidden' }}>
        {w
          ? Array.from({ length: 64 }, (_, i) => {
              const r = Math.floor(i / 8);
              const c = i % 8;
              const hl = last && (last[0] === i || last[1] === i);
              return (
                <View key={i} style={{ position: 'absolute', left: c * size, top: r * size, width: size, height: size, backgroundColor: hl ? (last![1] === i ? colors.lime : '#D9F27A') : (r + c) % 2 ? DARK : LIGHT }}>
                  {c === 0 ? <Text style={{ position: 'absolute', left: 2, top: 1, fontSize: 9, fontFamily: fonts.bodyBold, color: (r + c) % 2 ? LIGHT : DARK }}>{8 - r}</Text> : null}
                  {r === 7 ? <Text style={{ position: 'absolute', right: 3, bottom: 1, fontSize: 9, fontFamily: fonts.bodyBold, color: (r + c) % 2 ? LIGHT : DARK }}>{String.fromCharCode(97 + c)}</Text> : null}
                </View>
              );
            })
          : null}
        {w ? pieces.map((p) => <Man key={p.id} p={p} size={size} />) : null}
      </View>
      <Animated.View key={frame} entering={reduce ? undefined : FadeIn.delay(300).duration(250)} style={{ gap: 2 }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 20, lineHeight: 24, color: colors.paper }}>{f?.label}</Text>
        {f?.lines[1] ? <Text style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: DIM }}>{f.lines[1]}</Text> : null}
        {broken ? <Text style={{ fontFamily: fonts.body, fontSize: 12, color: DIM }}>The rest of this line couldn’t be shown on the board</Text> : null}
      </Animated.View>
    </Panel>
  );
}

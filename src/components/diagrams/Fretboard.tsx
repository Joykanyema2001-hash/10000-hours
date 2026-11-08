import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, useReducedMotion, ZoomIn } from 'react-native-reanimated';
import { chordShape, STRINGS, type Instrument } from '../../lib/music';
import { colors, fonts } from '../../theme';
import { Text } from '../Text';
import { DIM, FAINT, FrameStrip, Panel, type DiagramProps } from './shared';

const GAP = 30; // between strings
const ROW = 32; // between frets
const ROWS = 5;
const DOT = 24;

/**
 * Chord chart: strings run top to bottom, frets across. Finger dots drop in one by one,
 * then the strum pattern pulses in time. Shapes come from our chord library.
 */
export function Fretboard({ frames, frame, meta }: DiagramProps) {
  const reduce = useReducedMotion();
  const instrument: Instrument = (['guitar', 'bass', 'ukulele'] as const).find((i) => i === meta[0]?.toLowerCase()) ?? 'guitar';
  const f = frames[frame];
  const name = f?.lines[0] || f?.label || '';
  const shape = chordShape(name, instrument);
  const strum = (f?.lines[1] ?? '').toUpperCase().split(/[\s,]+/).filter((t) => /^[DUX\-.]$/.test(t));
  const strings = STRINGS[instrument];
  const width = GAP * (strings.length - 1);

  const frets = shape ? shape.frets.split('').map((c) => (c === 'x' ? -1 : Number(c))) : [];
  const pressed = frets.filter((n) => n > 0);
  const base = pressed.length && Math.max(...pressed) > ROWS ? Math.min(...pressed) : 1;
  const fingers = shape?.fingers?.split('') ?? [];

  // Strum: a beat moves across the pattern.
  const [beat, setBeat] = useState(-1);
  useEffect(() => {
    setBeat(-1);
    if (!strum.length || reduce) return;
    let i = -1;
    const start = setTimeout(() => {
      const t = setInterval(() => {
        i = (i + 1) % strum.length;
        setBeat(i);
      }, 380);
      cleanup = () => clearInterval(t);
    }, 900);
    let cleanup = () => {};
    return () => {
      clearTimeout(start);
      cleanup();
    };
  }, [frame, strum.length, reduce]);

  return (
    <Panel>
      <FrameStrip frames={frames} frame={frame} />
      <View style={{ flexDirection: 'row', gap: 18, alignItems: 'center' }}>
        <View key={frame} style={{ width: width + DOT + 8, paddingTop: 22, paddingLeft: DOT / 2 + 4 }}>
          {/* Open / muted markers above the nut */}
          {frets.map((n, s) =>
            n <= 0 ? (
              <Text key={`m${s}`} style={{ position: 'absolute', top: 0, left: DOT / 2 + 4 + s * GAP - 6, width: 12, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 13, color: n === 0 ? colors.lime : DIM }}>
                {n === 0 ? '○' : '×'}
              </Text>
            ) : null,
          )}
          <View style={{ width, height: ROW * ROWS }}>
            {/* Nut (or the position number when the shape sits higher up) */}
            <View style={{ position: 'absolute', top: -3, left: 0, width, height: base === 1 ? 6 : 2, borderRadius: 2, backgroundColor: base === 1 ? colors.paper : FAINT }} />
            {base > 1 ? <Text style={{ position: 'absolute', left: -DOT - 6, top: ROW / 2 - 9, fontFamily: fonts.bodyBold, fontSize: 12, color: DIM }}>{base}fr</Text> : null}
            {Array.from({ length: ROWS }, (_, r) => (
              <View key={`f${r}`} style={{ position: 'absolute', top: (r + 1) * ROW, left: 0, width, height: 2, backgroundColor: FAINT }} />
            ))}
            {strings.map((_, s) => (
              <View key={`s${s}`} style={{ position: 'absolute', left: s * GAP - 1, top: 0, width: 2 + (strings.length - 1 - s) * 0.4, height: ROW * ROWS, backgroundColor: 'rgba(248,250,238,0.6)' }} />
            ))}
            {shape?.barre ? (
              <Animated.View
                entering={reduce ? undefined : FadeIn.delay(100).duration(300)}
                style={{ position: 'absolute', top: (shape.barre - base) * ROW + ROW / 2 - DOT / 2, left: frets.findIndex((n) => n === shape.barre) * GAP - DOT / 2, right: -DOT / 2, height: DOT, borderRadius: DOT / 2, backgroundColor: colors.lime, opacity: 0.55 }}
              />
            ) : null}
            {frets.map((n, s) =>
              n > 0 ? (
                <Animated.View
                  key={`d${s}`}
                  entering={reduce ? undefined : ZoomIn.delay(200 + s * 140).springify().dampingRatio(0.6).duration(380)}
                  style={{ position: 'absolute', top: (n - base) * ROW + ROW / 2 - DOT / 2, left: s * GAP - DOT / 2, width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' }}
                >
                  {fingers[s] && fingers[s] !== '0' && fingers[s] !== 'x' ? (
                    <Text style={{ fontFamily: fonts.display, fontSize: 13, lineHeight: 16, color: colors.ink }}>{fingers[s]}</Text>
                  ) : null}
                </Animated.View>
              ) : null,
            )}
          </View>
          <View style={{ flexDirection: 'row', width, justifyContent: 'space-between', marginTop: 6, marginLeft: -6 }}>
            {strings.map((s, i) => (
              <Text key={i} style={{ width: 12, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 11, color: DIM }}>{s}</Text>
            ))}
          </View>
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Animated.View key={frame} entering={reduce ? undefined : FadeIn.duration(250)}>
            <Text style={{ fontFamily: fonts.display, fontSize: 38, lineHeight: 42, color: colors.lime }} numberOfLines={1} adjustsFontSizeToFit>{name}</Text>
          </Animated.View>
          {shape ? (
            <Text style={{ fontFamily: fonts.body, fontSize: 12, lineHeight: 16, color: DIM }}>1 index · 2 middle · 3 ring · 4 pinky</Text>
          ) : (
            <Text style={{ fontFamily: fonts.body, fontSize: 12, lineHeight: 16, color: DIM }}>Shape not in our chord library yet</Text>
          )}
          {f?.label && f.label !== name ? <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: colors.paper }}>{f.label}</Text> : null}
        </View>
      </View>
      {strum.length ? (
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: DIM, marginRight: 4 }}>Strum</Text>
          {strum.map((t, i) => (
            <View key={i} style={{ flex: 1, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: i === beat ? colors.lime : 'transparent', borderWidth: 2, borderColor: i === beat ? colors.lime : FAINT }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 18, lineHeight: 22, color: i === beat ? colors.ink : colors.paper }}>{t === 'D' ? '↓' : t === 'U' ? '↑' : '·'}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Panel>
  );
}

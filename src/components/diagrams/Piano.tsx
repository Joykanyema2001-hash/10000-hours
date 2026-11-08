import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { chordNotes, midi, NOTE_NAMES } from '../../lib/music';
import { colors, fonts } from '../../theme';
import { Text } from '../Text';
import { DIM, FrameStrip, Panel, type DiagramProps } from './shared';

const BLACK = new Set([1, 3, 6, 8, 10]);

/** A keyboard whose keys light up in order: chords, scales and melodies. */
export function Piano({ frames, frame }: DiagramProps) {
  const reduce = useReducedMotion();
  const [width, setWidth] = useState(0);
  const f = frames[frame];
  const fromLines = (f?.lines ?? []).map(midi).filter((n): n is number => n != null);
  const notes = fromLines.length ? fromLines : (chordNotes(f?.label ?? '') ?? []);
  // Show two octaves from the C at or below the lowest note across all frames, so the keyboard doesn't jump.
  const all = frames.flatMap((x) => {
    const l = x.lines.map(midi).filter((n): n is number => n != null);
    return l.length ? l : (chordNotes(x.label) ?? []);
  });
  const low = all.length ? Math.floor(Math.min(...all) / 12) * 12 : 60;
  const high = Math.max(low + 23, all.length ? Math.ceil((Math.max(...all) + 1) / 12) * 12 - 1 : low + 23);
  const keys = Array.from({ length: high - low + 1 }, (_, i) => low + i);
  const whites = keys.filter((k) => !BLACK.has(k % 12));
  const kw = width ? width / whites.length : 0;
  const order = new Map(notes.map((n, i) => [n, i]));

  return (
    <Panel>
      <FrameStrip frames={frames} frame={frame} />
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: 120 }}>
        {kw
          ? whites.map((k, i) => (
              <View key={k} style={{ position: 'absolute', left: i * kw, top: 0, width: kw - 2, height: 120, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, backgroundColor: colors.paper, overflow: 'hidden' }}>
                {order.has(k) ? (
                  <Animated.View key={`${frame}-${k}`} entering={reduce ? undefined : FadeIn.delay(150 + order.get(k)! * 220).duration(220)} style={{ flex: 1, backgroundColor: colors.lime, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 6 }}>
                    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 10, color: colors.ink }}>{NOTE_NAMES[k % 12]}</Text>
                  </Animated.View>
                ) : k % 12 === 0 ? (
                  <Text style={{ position: 'absolute', bottom: 6, width: '100%', textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 10, color: DIM }}>C{Math.floor(k / 12) - 1}</Text>
                ) : null}
              </View>
            ))
          : null}
        {kw
          ? keys
              .filter((k) => BLACK.has(k % 12))
              .map((k) => {
                const whitesBefore = keys.filter((x) => x < k && !BLACK.has(x % 12)).length;
                return (
                  <View key={k} style={{ position: 'absolute', left: whitesBefore * kw - kw * 0.3 - 1, top: 0, width: kw * 0.6, height: 74, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, backgroundColor: '#05050F', overflow: 'hidden' }}>
                    {order.has(k) ? (
                      <Animated.View key={`${frame}-${k}`} entering={reduce ? undefined : FadeIn.delay(150 + order.get(k)! * 220).duration(220)} style={{ flex: 1, backgroundColor: colors.lime }} />
                    ) : null}
                  </View>
                );
              })
          : null}
      </View>
      <Animated.View key={frame} entering={reduce ? undefined : FadeInDown.delay(150 + notes.length * 220).duration(300)} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 22, lineHeight: 26, color: colors.lime }}>{f?.label}</Text>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: colors.paper }}>{notes.map((n) => NOTE_NAMES[n % 12]).join(' · ')}</Text>
      </Animated.View>
    </Panel>
  );
}

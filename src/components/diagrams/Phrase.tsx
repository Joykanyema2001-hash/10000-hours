import { View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { colors, fonts } from '../../theme';
import { Text } from '../Text';
import { DIM, FAINT, Panel, type DiagramProps } from './shared';

/**
 * A phrase built word by word: pronunciation above each word, meaning below, then the
 * whole translation. Lines are "word | pronunciation | meaning".
 */
export function Phrase({ frames, frame, meta }: DiagramProps) {
  const reduce = useReducedMotion();
  const f = frames[frame];
  const words = (f?.lines ?? []).map((l) => {
    const [word = '', reading = '', gloss = ''] = l.split('|').map((x) => x.trim());
    return { word, reading, gloss };
  }).filter((w) => w.word);
  const rtl = (meta[1] ?? '').toLowerCase() === 'rtl';
  return (
    <Panel padding={14}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {meta[0] ? (
          <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 2, borderColor: FAINT }}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: colors.paper }}>{meta[0]}</Text>
          </View>
        ) : <View />}
        <View style={{ flexDirection: 'row', gap: 5 }}>
          {frames.map((_, i) => (
            <View key={i} style={{ width: i === frame ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: i <= frame ? colors.lime : FAINT }} />
          ))}
        </View>
      </View>
      <View key={frame} style={{ flexDirection: rtl ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 10, paddingVertical: 6 }}>
        {words.map((w, i) => (
          <Animated.View key={i} entering={reduce ? undefined : FadeInDown.delay(150 + i * 320).springify().dampingRatio(0.75).duration(380)} style={{ alignItems: 'center', gap: 2, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(198,255,43,0.10)' }}>
            {w.reading ? <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: colors.lime }}>{w.reading}</Text> : null}
            <Text style={{ fontFamily: fonts.display, fontSize: 26, lineHeight: 32, color: colors.paper }}>{w.word}</Text>
            {w.gloss ? <Text style={{ fontFamily: fonts.body, fontSize: 12, color: DIM }}>{w.gloss}</Text> : null}
          </Animated.View>
        ))}
      </View>
      <Animated.View key={`t${frame}`} entering={reduce ? undefined : FadeIn.delay(250 + words.length * 320).duration(300)} style={{ flexDirection: 'row', gap: 8, alignItems: 'baseline' }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 18, color: colors.lime }}>=</Text>
        <Text style={{ flex: 1, fontFamily: fonts.displaySemi, fontSize: 18, lineHeight: 23, color: colors.paper }}>{f?.label}</Text>
      </Animated.View>
    </Panel>
  );
}

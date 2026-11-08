import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withSpring, withTiming, ZoomIn } from 'react-native-reanimated';
import { colors, fonts } from '../../theme';
import { Text } from '../Text';
import { DIM, FAINT, FrameStrip, Panel, type DiagramProps } from './shared';

const ROUND = /^(a|b|x|y|cross|circle|square|triangle|l3|r3|ls|rs)$/i;

/** One key or button: drops in, then presses down like a real keystroke. */
function Cap({ label, round, delay }: { label: string; round: boolean; delay: number }) {
  const reduce = useReducedMotion();
  const press = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    press.value = withDelay(delay + 350, withSequence(withTiming(1, { duration: 90 }), withSpring(0, { dampingRatio: 0.5, duration: 300 })));
  }, [delay, reduce, press]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: press.value * 5 }], shadowOpacity: 1 - press.value }));
  const wide = label.length > 2;
  return (
    <Animated.View entering={reduce ? undefined : ZoomIn.delay(delay).springify().dampingRatio(0.7).duration(320)}>
      <View style={{ paddingBottom: 5 }}>
        <View style={{ position: 'absolute', left: 0, right: 0, top: 5, bottom: 0, borderRadius: round ? 32 : 12, backgroundColor: '#5C7A1F' }} />
        <Animated.View
          style={[
            { minWidth: round ? 60 : 56, height: round ? 60 : 56, paddingHorizontal: wide && !round ? 14 : 0, borderRadius: round ? 30 : 12, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.ink },
            style,
          ]}
        >
          <Text style={{ fontFamily: fonts.display, fontSize: wide ? 16 : 22, lineHeight: wide ? 20 : 26, color: colors.ink }}>{label}</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

/** Keyboard keys, controller buttons or mouse clicks, pressed in order: a build, combo or shortcut. */
export function Keys({ frames, frame, meta }: DiagramProps) {
  const reduce = useReducedMotion();
  const device = (meta[0] ?? 'keyboard').toLowerCase();
  const f = frames[frame];
  const keys = (f?.lines ?? []).filter(Boolean).slice(0, 4);
  return (
    <Panel>
      <FrameStrip frames={frames} frame={frame} />
      <View key={frame} style={{ alignItems: 'center', gap: 12, paddingVertical: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          {keys.map((k, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {i > 0 ? <Text style={{ fontFamily: fonts.display, fontSize: 20, color: DIM }}>+</Text> : null}
              <Cap label={k} round={device !== 'keyboard' && ROUND.test(k)} delay={i * 160} />
            </View>
          ))}
        </View>
        <Animated.View entering={reduce ? undefined : FadeIn.delay(300 + keys.length * 160).duration(250)} style={{ alignItems: 'center', gap: 2 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 22, lineHeight: 26, color: colors.paper, textAlign: 'center' }}>{f?.label}</Text>
          {f?.value ? <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.lime }}>within {f.value}s</Text> : null}
        </Animated.View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
        {frames.map((_, i) => (
          <View key={i} style={{ width: i === frame ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i <= frame ? colors.lime : FAINT }} />
        ))}
      </View>
    </Panel>
  );
}

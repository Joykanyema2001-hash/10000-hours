import { View, type TextStyle } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, FadeOutUp, useReducedMotion } from 'react-native-reanimated';
import { Text } from './Text';

/**
 * Odometer-style text: each changed character rolls up into place while the
 * others stay put. Slots are fixed-width so the string never jitters as
 * proportional digits change. Reduce Motion → a plain cross-fade.
 */
export function RollingText({ text, fontSize, style, accessibilityLabel }: {
  text: string;
  fontSize: number;
  style?: TextStyle;
  accessibilityLabel?: string;
}) {
  const reduce = useReducedMotion();
  const lineHeight = Math.round(fontSize * 1.1);
  const enter = reduce ? FadeIn.duration(150) : FadeInDown.springify().dampingRatio(1).duration(260);
  const exit = reduce ? FadeOut.duration(150) : FadeOutUp.duration(180);

  return (
    <View accessible accessibilityRole="text" accessibilityLabel={accessibilityLabel ?? text} style={{ flexDirection: 'row' }}>
      {text.split('').map((ch, i) => {
        const narrow = !/[0-9]/.test(ch);
        return (
          <View key={i} style={{ width: fontSize * (narrow ? 0.3 : 0.6), height: lineHeight, overflow: 'hidden' }}>
            <Animated.View key={ch} entering={enter} exiting={exit} style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center' }}>
              <Text style={[{ fontSize, lineHeight, letterSpacing: 0 }, style]} maxFontSizeMultiplier={1}>
                {ch}
              </Text>
            </Animated.View>
          </View>
        );
      })}
    </View>
  );
}

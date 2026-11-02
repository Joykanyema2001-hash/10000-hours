import { Text as RNText, StyleSheet, type TextProps, type TextStyle } from 'react-native';
import { colors, fonts, track } from '../theme';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'bodyMedium' | 'label' | 'caption';

const base: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.display, fontSize: 56, lineHeight: 58 },
  title: { fontFamily: fonts.display, fontSize: 36, lineHeight: 40 },
  heading: { fontFamily: fonts.displaySemi, fontSize: 22, lineHeight: 28 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21 },
  bodyMedium: { fontFamily: fonts.bodyMedium, fontSize: 18, lineHeight: 25 },
  label: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: fonts.body, fontSize: 14, lineHeight: 19, color: colors.muted },
};

/**
 * Text with the app's type ramp. Tracking is derived from the final size, so a
 * 72pt number gets tighter tracking than 15pt body (skill §15). Dynamic Type is
 * respected, but huge display numbers are capped so they never wrap mid-number.
 */
export function Text({ variant = 'body', style, maxFontSizeMultiplier, ...rest }: TextProps & { variant?: Variant }) {
  const v = base[variant];
  const size = StyleSheet.flatten([v, style])?.fontSize ?? 15;
  return (
    <RNText
      {...rest}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? (size >= 40 ? 1.15 : size >= 22 ? 1.4 : 2)}
      style={[{ color: colors.ink, letterSpacing: track(size) }, v, style]}
    />
  );
}

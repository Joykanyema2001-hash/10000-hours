import { Easing, type WithSpringConfig } from 'react-native-reanimated';

/** Brand colours — same tokens as the Figma file (10K Colors collection). */
export const colors = {
  lime: '#C6FF2B',
  ink: '#0C0B2B',
  paper: '#F8FAEE',
  muted: '#55573F',
  white: '#FFFFFF',
  track: '#E6E9D6',
  divider: '#D9DCC6',
} as const;

export const fonts = {
  display: 'Fredoka_700Bold',
  displaySemi: 'Fredoka_600SemiBold',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodyBold: 'DMSans_700Bold',
} as const;

/**
 * Springs follow Apple's two-parameter model (damping ratio + response).
 * Reanimated's `duration` is perceptual, so ~300ms ≈ Apple's 0.3–0.4s response.
 * Critically damped by default; bounce only where momentum or celebration earns it.
 */
export const springs = {
  ui: { dampingRatio: 1, duration: 320 } satisfies WithSpringConfig,
  snappy: { dampingRatio: 1, duration: 220 } satisfies WithSpringConfig,
  rotation: { dampingRatio: 0.8, duration: 420 } satisfies WithSpringConfig,
  celebrate: { dampingRatio: 0.6, duration: 500 } satisfies WithSpringConfig,
};

/** Instant, short press-down response (skill §1: feedback on touch-down). */
export const pressIn = { duration: 90, easing: Easing.out(Easing.quad) };

export const radius = { sm: 14, md: 18, lg: 20, xl: 28 } as const;
export const space = { gutter: 24 } as const;

/**
 * Size-specific tracking: large display text gets negative tracking (~-0.02em),
 * body text stays near 0 (skill §15).
 */
export const track = (fontSize: number) => (fontSize >= 40 ? -0.02 * fontSize : fontSize >= 24 ? -0.01 * fontSize : 0);

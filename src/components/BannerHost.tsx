import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { haptics } from '../lib/haptics';
import { useNotify, type BannerKind } from '../lib/notify';
import { colors, fonts, springs } from '../theme';
import { CheckCircle, ClockIcon, FlagIcon, PlayIcon } from './Icons';
import { Text } from './Text';

const HIDDEN = -160;
const SHOW_MS = 4200;

function Glyph({ kind }: { kind: BannerKind }) {
  if (kind === 'goal' || kind === 'logged') return <CheckCircle size={28} />;
  if (kind === 'nudge') return <PlayIcon size={22} color={colors.ink} />;
  if (kind === 'hour') return <ClockIcon size={28} weight={2.5} />;
  return <FlagIcon size={26} weight={2.5} />;
}

/**
 * Branded banner that drops in from the top of the app.
 * - Enters with a critically damped spring; exits back up the same path (spatial consistency).
 * - Swipe up to dismiss: tracks the finger 1:1, rubber-bands if pulled down,
 *   and a flick hands its velocity to the exit spring (skill §2, §5, §9).
 * - Haptic fires on the same frame the banner starts moving.
 */
export function BannerHost() {
  const banner = useNotify((s) => s.banner);
  const next = useNotify((s) => s.next);
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const y = useSharedValue(HIDDEN);
  const opacity = useSharedValue(0);

  const hide = (velocity = 0) => {
    if (reduce) opacity.value = withTiming(0, { duration: 150 }, (done) => done && scheduleOnRN(next));
    else y.value = withSpring(HIDDEN, { ...springs.ui, velocity }, (done) => done && scheduleOnRN(next));
  };

  useEffect(() => {
    if (!banner) return;
    banner.kind === 'hour' || banner.kind === 'goal' || banner.kind === 'logged' ? haptics.success() : haptics.tick();
    if (reduce) {
      y.value = 0;
      opacity.value = withTiming(1, { duration: 150 });
    } else {
      opacity.value = 1;
      y.value = HIDDEN;
      y.value = withSpring(0, springs.ui);
    }
    const t = setTimeout(() => hide(), SHOW_MS);
    return () => clearTimeout(t);
  }, [banner?.id]);

  const pan = usePanGesture({
    onUpdate: (e) => {
      'worklet';
      const dy = e.translationY;
      // 1:1 upward; resist downward drags progressively (rubber band).
      y.value = dy < 0 ? dy : (dy * 60 * 0.55) / (60 + 0.55 * dy);
    },
    onDeactivate: (e) => {
      'worklet';
      const projected = y.value + (e.velocityY / 1000) * 0.998 / (1 - 0.998);
      if (projected < -40) y.value = withSpring(HIDDEN, { ...springs.ui, velocity: e.velocityY }, (done) => done && scheduleOnRN(next));
      else y.value = withSpring(0, { ...springs.ui, velocity: e.velocityY });
    },
  });

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }], opacity: opacity.value }));

  if (!banner) return null;
  const open = () => {
    if (banner.href) router.push(banner.href as Href);
    hide();
  };

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { paddingTop: insets.top + 8, paddingHorizontal: 12 }]}>
      <GestureDetector gesture={pan}>
        <Animated.View style={style} accessibilityLiveRegion="polite">
          <Pressable
            onPress={open}
            accessibilityRole={banner.href ? 'button' : 'alert'}
            accessibilityLabel={`${banner.title}. ${banner.body ?? ''}`}
            accessibilityHint="Swipe up to dismiss"
            style={styles.card}
          >
            <View style={styles.glyph}>
              <Glyph kind={banner.kind} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: fonts.displaySemi, fontSize: 18, lineHeight: 22 }} numberOfLines={2}>
                {banner.title}
              </Text>
              {banner.body ? (
                <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 19 }} numberOfLines={2}>
                  {banner.body}
                </Text>
              ) : null}
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    paddingRight: 18,
    backgroundColor: colors.lime,
    borderWidth: 3,
    borderColor: colors.ink,
    borderRadius: 22,
    shadowColor: colors.ink,
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  glyph: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.white, borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
});

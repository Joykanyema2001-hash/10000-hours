import { useEffect } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { haptics } from '../lib/haptics';
import { withArticle } from '../lib/levels';
import { useNotify } from '../lib/notify';
import { withCommas } from '../lib/time';
import { colors, fonts, springs } from '../theme';
import { Button } from './Button';
import { Text } from './Text';

/** One ring that bursts outward once from the badge (not a loop). */
function Ring({ delay, show }: { delay: number; show: boolean }) {
  const p = useSharedValue(0);
  useEffect(() => {
    if (show) p.value = withDelay(delay, withTiming(1, { duration: 900 }));
  }, [show]);
  const style = useAnimatedStyle(() => ({ opacity: (1 - p.value) * 0.9, transform: [{ scale: 1 + p.value * 0.8 }] }));
  return <Animated.View pointerEvents="none" style={[styles.ring, style]} />;
}

/**
 * Milestone pop-up: dims the app, the card springs up from the badge with a little
 * overshoot (it's a celebration — the one place bounce is earned), rings burst once.
 */
export function CelebrationHost() {
  const c = useNotify((s) => s.celebration);
  const close = useNotify((s) => s.closeCelebration);
  const reduce = useReducedMotion();
  const scrim = useSharedValue(0);
  const card = useSharedValue(0);

  useEffect(() => {
    if (!c) return;
    haptics.success();
    scrim.value = withTiming(1, { duration: 220 });
    card.value = reduce ? withTiming(1, { duration: 180 }) : withSpring(1, springs.celebrate);
  }, [c?.id]);

  const dismiss = () => {
    scrim.value = withTiming(0, { duration: 200 });
    card.value = withTiming(0, { duration: 180 }, (done) => done && scheduleOnRN(close));
  };

  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.value * 0.7 }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, card.value * 1.5),
    transform: reduce ? [] : [{ scale: 0.8 + 0.2 * card.value }, { translateY: (1 - card.value) * 40 }],
  }));

  if (!c) return null;
  const { level, skillName } = c;

  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} accessibilityLabel="Close">
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.ink }, scrimStyle]} />
      </Pressable>
      <View pointerEvents="box-none" style={styles.center}>
        <Animated.View style={[styles.card, cardStyle]} accessibilityRole="alert">
          <View style={styles.badgeWrap}>
            <Ring delay={150} show={!reduce} />
            <Ring delay={350} show={!reduce} />
            <View style={styles.badge}>
              <Text style={{ fontFamily: fonts.display, fontSize: 34, lineHeight: 38, color: colors.ink }} maxFontSizeMultiplier={1}>
                {withCommas(level.hours)}
              </Text>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink }} maxFontSizeMultiplier={1}>
                HOURS
              </Text>
            </View>
          </View>
          <Text style={{ fontFamily: fonts.display, fontSize: 32, lineHeight: 36, color: colors.lime, textAlign: 'center' }}>
            You're {withArticle(level.name)}
          </Text>
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 17, lineHeight: 24, color: colors.paper, textAlign: 'center' }}>
            {withCommas(level.hours)} hours of {skillName}. Every one of them counted.
          </Text>
          <View style={{ alignSelf: 'stretch', gap: 10, marginTop: 8 }}>
            <Button
              label="Share it"
              size="md"
              variant="lime"
              onPress={() => Share.share({ message: `${withCommas(level.hours)} hours of ${skillName}. I'm ${withArticle(level.name)} on the way to 10,000.` }).catch(() => {})}
            />
            <Pressable onPress={dismiss} accessibilityRole="button" style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: fonts.displaySemi, fontSize: 18, color: colors.lime }}>Keep going</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, backgroundColor: colors.ink, borderRadius: 32, borderWidth: 3, borderColor: colors.lime, padding: 24, alignItems: 'center', gap: 12 },
  badgeWrap: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  badge: { width: 128, height: 128, borderRadius: 64, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center', borderWidth: 6, borderColor: colors.paper },
  ring: { position: 'absolute', width: 128, height: 128, borderRadius: 64, borderWidth: 4, borderColor: colors.lime },
});

import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion, ZoomIn } from 'react-native-reanimated';
import { haptics } from '../lib/haptics';
import { useNow } from '../lib/hooks';
import { confirmStillGoing, discardSession, finishSession, needsCheck } from '../lib/session';
import { formatDuration, MINUTE } from '../lib/time';
import { elapsedOf, useStore } from '../store';
import { colors, fonts } from '../theme';
import { Button } from './Button';
import { Text } from './Text';

const STEP = 30 * MINUTE;

/**
 * Forgotten-timer check. After 3 hours of unconfirmed timing (or on opening the
 * app after that), ask whether the person is still practising, and let them save
 * the time they really did instead of an overnight 12 hours.
 */
export function StillGoingCheck() {
  const reduce = useReducedMotion();
  const active = useStore((s) => s.active);
  const skills = useStore((s) => s.skills);
  const now = useNow(30_000, active?.runningSince != null);
  const [trimming, setTrimming] = useState(false);
  const [, force] = useState(0);

  // Re-check the moment the app comes back to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => st === 'active' && force((n) => n + 1));
    return () => sub.remove();
  }, []);

  const show = needsCheck(active, Date.now());
  useEffect(() => {
    if (show) haptics.warning();
    else setTrimming(false);
  }, [show]);
  if (!show || !active) return null;

  const skill = skills.find((k) => k.id === active.skillId);
  const elapsed = elapsedOf(active, now);
  // Half-hour choices from 30m up to the time on the clock: a forgotten timer usually
  // means the real practice was short, so the small numbers come first.
  const options: number[] = [];
  for (let ms = STEP; ms <= elapsed && options.length < 24; ms += STEP) options.push(ms);

  const save = (ms: number) => {
    finishSession(ms);
    setTrimming(false);
    router.navigate('/(tabs)');
  };

  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={[StyleSheet.absoluteFill, { backgroundColor: colors.ink, opacity: 0.7 }]} />
      <View pointerEvents="box-none" style={styles.center}>
        <Animated.View entering={reduce ? FadeIn : ZoomIn.springify().dampingRatio(0.85).duration(380)} style={styles.card} accessibilityRole="alert">
          <Text style={{ fontFamily: fonts.display, fontSize: 28, lineHeight: 32, color: colors.lime, textAlign: 'center' }}>
            Still practising{skill ? ` ${skill.name}` : ''}?
          </Text>
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 16, lineHeight: 22, color: colors.paper, textAlign: 'center' }}>
            Your timer has been running for {formatDuration(elapsed)}. If you stopped a while ago, save the time you really did.
          </Text>

          {trimming ? (
            <View style={{ alignSelf: 'stretch', gap: 10 }}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: colors.lime, textAlign: 'center' }}>How long did you practise?</Text>
              <ScrollView style={{ maxHeight: 240 }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {options.map((ms) => (
                  <Pressable
                    key={ms}
                    onPress={() => save(ms)}
                    accessibilityRole="button"
                    accessibilityLabel={`Save ${formatDuration(ms)}`}
                    style={({ pressed }) => [styles.chip, pressed && { backgroundColor: colors.lime }]}
                  >
                    {({ pressed }) => <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: pressed ? colors.ink : colors.lime }}>{formatDuration(ms)}</Text>}
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable
                onPress={() => {
                  discardSession();
                  setTrimming(false);
                }}
                accessibilityRole="button"
                style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: colors.paper, textDecorationLine: 'underline' }}>Discard this session</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ alignSelf: 'stretch', gap: 10, marginTop: 6 }}>
              <Button variant="lime" size="md" label="Yes, keep going" onPress={confirmStillGoing} />
              <Pressable
                onPress={() => {
                  haptics.select();
                  setTrimming(true);
                }}
                accessibilityRole="button"
                style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontFamily: fonts.displaySemi, fontSize: 18, color: colors.lime }}>I stopped earlier</Text>
              </Pressable>
            </View>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, backgroundColor: colors.ink, borderRadius: 32, borderWidth: 3, borderColor: colors.lime, padding: 24, alignItems: 'center', gap: 12 },
  chip: { minWidth: 88, height: 48, paddingHorizontal: 14, borderRadius: 14, borderWidth: 2.5, borderColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
});

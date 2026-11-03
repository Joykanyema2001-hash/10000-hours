import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';
import { colors, fonts } from '../theme';
import { Hand } from './ClockFace';

const SIZE = 200; // must match imageWidth of the native splash in app.json
const k = SIZE / 1024;

/**
 * Takes over from the native splash with the same logo in the same place, so the
 * switch is invisible. The clock's minute hand sweeps one lap (time passing), then
 * the logo zooms through and fades to reveal the app. ~0.9s; a plain fade with
 * Reduce Motion. Shown once per cold start.
 */
export function SplashHandoff({ ready }: { ready: boolean }) {
  const reduce = useReducedMotion();
  const [done, setDone] = useState(false);
  const lap = useSharedValue(0);
  const scale = useSharedValue(1);
  const fade = useSharedValue(1);

  useEffect(() => {
    if (!ready) return;
    // Native splash and this overlay look identical, so hiding it now is seamless.
    SplashScreen.hideAsync().catch(() => {});
    const finish = () => setDone(true);
    if (reduce) {
      fade.value = withDelay(150, withTiming(0, { duration: 220 }, (f) => f && scheduleOnRN(finish)));
      return;
    }
    lap.value = withSpring(1, { dampingRatio: 0.8, duration: 650 });
    scale.value = withSequence(withTiming(1, { duration: 520 }), withTiming(1.5, { duration: 320 }));
    fade.value = withDelay(560, withTiming(0, { duration: 300 }, (f) => f && scheduleOnRN(finish)));
  }, [ready]);

  const minute = useDerivedValue(() => lap.value * 360);
  const wrap = useAnimatedStyle(() => ({ opacity: fade.value }));
  const markStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (done) return null;
  const cx = 596 * k;
  const cy = 512 * k;
  const box = 200 * k;

  return (
    <Animated.View pointerEvents={ready ? 'none' : 'auto'} style={[StyleSheet.absoluteFill, styles.bg, wrap]}>
      <Animated.View style={[{ width: SIZE, height: SIZE }, markStyle]}>
        <Svg width={SIZE} height={SIZE} viewBox="0 0 1024 1024">
          <Rect x={168} y={168} width={688} height={688} rx={176} fill="none" stroke={colors.ink} strokeWidth={68} />
          <SvgText x={350} y={652} textAnchor="middle" fontFamily={fonts.display} fontSize={400} fill={colors.ink}>
            1
          </SvgText>
          <Circle cx={596} cy={512} r={132} fill="none" stroke={colors.ink} strokeWidth={52} />
          <Path d="M596 512 L657 556" stroke={colors.ink} strokeWidth={46} strokeLinecap="round" fill="none" />
        </Svg>
        {/* Minute hand, animated around the clock centre */}
        <View style={{ position: 'absolute', left: cx - box / 2, top: cy - box / 2, width: box, height: box }}>
          <Hand box={box} length={68 * k} width={46 * k} angle={minute} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bg: { backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
});

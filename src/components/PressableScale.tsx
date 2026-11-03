import { useEffect } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { pressIn, springs } from '../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; scaleTo?: number };

/**
 * Every tappable surface: highlights on touch-DOWN (instant, ~90ms) and springs
 * back from its live value on release, so a fast tap-tap never jumps (skill §1, §3).
 * Pressable already cancels when the finger drags away and back (hysteresis).
 */
export function PressableScale({ style, scaleTo = 0.97, onPressIn, onPressOut, disabled, ...rest }: Props) {
  const reduce = useReducedMotion();
  const scale = useSharedValue(1);
  const dim = useSharedValue(disabled ? 0.45 : 1);
  useEffect(() => {
    dim.value = withTiming(disabled ? 0.45 : 1, { duration: 160 });
  }, [disabled]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: dim.value }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        if (reduce) dim.value = withTiming(0.7, pressIn);
        else scale.value = withTiming(scaleTo, pressIn);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, springs.ui);
        dim.value = withTiming(disabled ? 0.45 : 1, { duration: 160 });
        onPressOut?.(e);
      }}
      style={[style, anim]}
    />
  );
}

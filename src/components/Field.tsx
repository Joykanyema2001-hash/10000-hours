import { forwardRef, useState } from 'react';
import { TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, fonts } from '../theme';
import { Text } from './Text';

type Props = TextInputProps & { label: string; helper?: string };

/** Labelled input; a lime focus ring fades in so the active field is obvious. */
export const Field = forwardRef<TextInputInstance, Props>(function Field({ label, helper, onFocus, onBlur, ...rest }, ref) {
  const [focused, setFocused] = useState(false);
  const ring = useSharedValue(0);
  const ringStyle = useAnimatedStyle(() => ({ opacity: ring.value }));
  return (
    <View style={{ gap: 8 }}>
      <Text variant="label" nativeID={`${label}-label`}>{label}</Text>
      <View>
        <TextInput
          ref={ref}
          {...rest}
          accessibilityLabel={label}
          accessibilityLabelledBy={`${label}-label`}
          placeholderTextColor={colors.muted}
          selectionColor={colors.ink}
          cursorColor={colors.ink}
          onFocus={(e) => { setFocused(true); ring.value = withTiming(1, { duration: 120 }); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); ring.value = withTiming(0, { duration: 160 }); onBlur?.(e); }}
          style={{
            minHeight: 56,
            paddingHorizontal: 16,
            borderWidth: 3,
            borderColor: colors.ink,
            borderRadius: 16,
            backgroundColor: colors.white,
            color: colors.ink,
            fontFamily: fonts.body,
            fontSize: 18,
          }}
        />
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', inset: -4, borderRadius: 20, borderWidth: 3, borderColor: colors.lime }, ringStyle]} />
      </View>
      {helper ? <Text variant="caption" style={{ color: focused ? colors.ink : colors.muted }}>{helper}</Text> : null}
    </View>
  );
});

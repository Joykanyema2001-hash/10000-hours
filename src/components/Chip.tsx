import { useEffect } from 'react';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, fonts } from '../theme';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export function Chip({ label, selected, onPress, accessibilityLabel }: { label: string; selected: boolean; onPress: () => void; accessibilityLabel?: string }) {
  const on = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    on.value = withTiming(selected ? 1 : 0, { duration: 160 });
  }, [selected]);
  const bg = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(on.value, [0, 1], [colors.white, colors.lime]) }));
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.94}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={{ flex: 1 }}
    >
      <Animated.View style={[{ height: 52, borderWidth: 3, borderColor: colors.ink, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, bg]}>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15 }}>{label}</Text>
      </Animated.View>
    </PressableScale>
  );
}

import { useEffect } from 'react';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, fonts } from '../theme';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

/** fit: size to the label (for wrapping lists of options) instead of sharing a row equally. */
export function Chip({ label, selected, onPress, accessibilityLabel, fit = false }: { label: string; selected: boolean; onPress: () => void; accessibilityLabel?: string; fit?: boolean }) {
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
      style={fit ? { maxWidth: '100%' } : { flex: 1 }}
    >
      <Animated.View
        style={[
          { borderWidth: 3, borderColor: colors.ink, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
          fit ? { minHeight: 48, paddingHorizontal: 16, paddingVertical: 10 } : { height: 52 },
          bg,
        ]}
      >
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, textAlign: 'center' }}>{label}</Text>
      </Animated.View>
    </PressableScale>
  );
}

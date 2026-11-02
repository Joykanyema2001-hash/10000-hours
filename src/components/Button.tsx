import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fonts } from '../theme';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'outline' | 'lime';
  size?: 'lg' | 'md' | 'sm';
  icon?: ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

const SIZES = { lg: { h: 60, fs: 20, r: 18 }, md: { h: 56, fs: 18, r: 18 }, sm: { h: 48, fs: 17, r: 14 } } as const;

export function Button({ label, onPress, variant = 'primary', size = 'lg', icon, disabled, style, accessibilityHint }: Props) {
  const s = SIZES[size];
  const primary = variant === 'primary';
  const fill = primary ? { backgroundColor: colors.ink } : variant === 'lime' ? { backgroundColor: colors.lime } : { borderWidth: 3, borderColor: colors.ink };
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      style={[
        styles.base,
        { minHeight: s.h, borderRadius: s.r },
        fill,
        style,
      ]}
    >
      <View style={styles.row}>
        {icon}
        <Text style={{ fontFamily: fonts.displaySemi, fontSize: s.fs, lineHeight: s.fs * 1.25, color: primary ? colors.lime : colors.ink }} maxFontSizeMultiplier={1.3}>
          {label}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});

import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptics } from '../lib/haptics';
import { useReduceTransparency } from '../lib/hooks';
import { colors, fonts, springs } from '../theme';
import { ClockIcon, FlagIcon } from './Icons';
import { Text } from './Text';

export const TAB_BAR_HEIGHT = 76;

const ICONS: Record<string, typeof ClockIcon> = { index: ClockIcon, milestones: FlagIcon };
const LABELS: Record<string, string> = { index: 'Today', milestones: 'Milestones' };

function Tab({ name, focused, onPress }: { name: string; focused: boolean; onPress: () => void }) {
  const reduce = useReducedMotion();
  const bump = useSharedValue(1);
  useEffect(() => {
    if (focused && !reduce) bump.value = withSequence(withTiming(0.88, { duration: 80 }), withSpring(1, springs.celebrate));
  }, [focused]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: bump.value }] }));
  const Icon = ICONS[name] ?? ClockIcon;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={LABELS[name]}
      style={styles.tab}
    >
      <Animated.View style={style}>
        <Icon weight={focused ? 2.5 : 2} />
      </Animated.View>
      <Text style={{ fontFamily: focused ? fonts.bodyBold : fonts.bodyMedium, fontSize: 14, lineHeight: 18 }} maxFontSizeMultiplier={1.3}>
        {LABELS[name]}
      </Text>
    </Pressable>
  );
}

/**
 * Brand tab bar as a translucent material: lime tint over a blur so content
 * scrolls underneath (skill §12). Solid lime when Reduce Transparency is on.
 */
export function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const solid = useReduceTransparency();
  return (
    <View style={[styles.bar, { height: TAB_BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom }]}>
      {solid ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.lime }]} />
      ) : (
        <>
          <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.lime, opacity: 0.86 }]} />
        </>
      )}
      {state.routes.map((route, i) => {
        const focused = state.index === i;
        return (
          <Tab
            key={route.key}
            name={route.name}
            focused={focused}
            onPress={() => {
              const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                haptics.select();
                navigateToTab(route.key);
              }
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', borderTopWidth: 3, borderTopColor: colors.ink, overflow: 'hidden' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
});

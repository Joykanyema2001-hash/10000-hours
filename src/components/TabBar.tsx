import type { BottomTabBarProps } from 'expo-router/tabs';
import House from 'lucide-react-native/icons/house';
import Sparkles from 'lucide-react-native/icons/sparkles';
import User from 'lucide-react-native/icons/user';
import Waypoints from 'lucide-react-native/icons/waypoints';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptics } from '../lib/haptics';
import { colors, fonts, springs } from '../theme';
import { Text } from './Text';

/** Space screens leave at the bottom so content can scroll clear of the floating bar. */
export const TAB_BAR_HEIGHT = 92;
const BAR_H = 68;

const TABS: Record<string, { label: string; Icon: typeof House }> = {
  index: { label: 'Home', Icon: House },
  skills: { label: 'Skills', Icon: Waypoints },
  coach: { label: 'Coach', Icon: Sparkles },
  profile: { label: 'Profile', Icon: User },
};

function Tab({ name, focused, onPress }: { name: string; focused: boolean; onPress: () => void }) {
  const reduce = useReducedMotion();
  const bump = useSharedValue(1);
  useEffect(() => {
    if (focused && !reduce) bump.value = withSequence(withTiming(0.86, { duration: 70 }), withSpring(1, springs.celebrate));
  }, [focused]);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: bump.value }] }));
  const t = TABS[name] ?? TABS.index;
  return (
    <Pressable onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={t.label} style={styles.tab}>
      <Animated.View style={iconStyle}>
        <t.Icon size={22} color={focused ? colors.ink : colors.paper} strokeWidth={focused ? 2.6 : 2.1} />
      </Animated.View>
      <Text
        style={{ fontFamily: focused ? fonts.bodyBold : fonts.bodyMedium, fontSize: 11, lineHeight: 14, color: focused ? colors.ink : colors.paper, opacity: focused ? 1 : 0.75 }}
        maxFontSizeMultiplier={1.2}
      >
        {t.label}
      </Text>
    </Pressable>
  );
}

/**
 * Floating navy pill with a lime highlight that springs to the active tab
 * (critically damped, starting from wherever it is, so rapid taps never jump).
 */
export function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const [width, setWidth] = useState(0);
  const count = state.routes.length;
  const tabW = width / Math.max(1, count);
  const x = useSharedValue(0);

  useEffect(() => {
    if (!tabW) return;
    const target = state.index * tabW;
    x.value = reduce ? withTiming(target, { duration: 120 }) : withSpring(target, springs.ui);
  }, [state.index, tabW]);

  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) }]}>
      <View
        style={styles.bar}
        onLayout={(e: LayoutChangeEvent) => {
          const w = e.nativeEvent.layout.width - 12;
          setWidth(w);
          x.value = state.index * (w / Math.max(1, count));
        }}
      >
        {tabW ? <Animated.View pointerEvents="none" style={[styles.pill, { width: tabW }, pill]} /> : null}
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16 },
  bar: {
    height: BAR_H,
    borderRadius: BAR_H / 2,
    backgroundColor: colors.ink,
    flexDirection: 'row',
    padding: 6,
    shadowColor: colors.ink,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  pill: { position: 'absolute', left: 6, top: 6, bottom: 6, borderRadius: (BAR_H - 12) / 2, backgroundColor: colors.lime },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
});

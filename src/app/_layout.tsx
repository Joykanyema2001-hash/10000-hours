import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { scheduleNudge, setupNotificationChannel } from '../lib/notifications';
import { todayMs, useStore } from '../store';
import { colors } from '../theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function useHydrated() {
  const [done, setDone] = useState(useStore.persist.hasHydrated());
  useEffect(() => useStore.persist.onFinishHydration(() => setDone(true)), []);
  return done;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Fredoka_600SemiBold, Fredoka_700Bold, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold });
  const hydrated = useHydrated();
  const ready = fontsLoaded && hydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Keep the single evening nudge accurate whenever the app comes back.
  useEffect(() => {
    setupNotificationChannel().catch(() => {});
    const replan = () => {
      const s = useStore.getState();
      if (s.skills.length) scheduleNudge(todayMs(s), s.dailyGoalMin * 60_000).catch(() => {});
    };
    replan();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && replan());
    return () => sub.remove();
  }, []);

  // Tapping a notification opens the running session (or Today).
  useEffect(() => {
    const open = (r: Notifications.NotificationResponse | null) => {
      if (!r) return;
      const hasActive = !!useStore.getState().active;
      router.push(hasActive ? '/timer' : '/');
    };
    Notifications.getLastNotificationResponseAsync().then(open).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, []);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="welcome" options={{ contentStyle: { backgroundColor: colors.lime }, animation: 'fade' }} />
        <Stack.Screen name="add-skill" />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="skill/[id]" />
        {/* A sheet: swipe down to tuck the running session away (native, velocity-aware, interruptible). */}
        <Stack.Screen name="timer" options={{ presentation: 'modal', contentStyle: { backgroundColor: colors.lime } }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

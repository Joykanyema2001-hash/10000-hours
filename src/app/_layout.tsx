import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { AppState, Platform, View } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BannerHost } from '../components/BannerHost';
import { CelebrationHost } from '../components/CelebrationHost';
import { SessionWatcher } from '../components/SessionWatcher';
import { SplashHandoff } from '../components/SplashHandoff';
import { StillGoingCheck } from '../components/StillGoingCheck';
import { startAuth, useAuth } from '../lib/auth';
import { startNativeSync, syncNative } from '../lib/nativeSync';
import { startSync, syncNow } from '../lib/sync';
import { notify } from '../lib/notify';
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


  // Keep the single evening nudge accurate whenever the app comes back.
  useEffect(() => {
    setupNotificationChannel().catch(() => {});
    const replan = () => {
      const s = useStore.getState();
      if (s.skills.length) scheduleNudge(todayMs(s), s.dailyGoalMin * 60_000, s.reminderHour).catch(() => {});
    };
    replan();
    const sub = AppState.addEventListener('change', (st) => {
      if (st !== 'active') return;
      replan();
      syncNative(); // refresh the hour window and today's widget after time away
      if (useAuth.getState().session) syncNow().catch(() => {});
    });
    return () => sub.remove();
  }, []);

  // Lock screen / Dynamic Island Live Activity and home-screen widget (dev and store builds only).
  useEffect(() => startNativeSync(), []);

  // Account: restore sign-in, then keep data synced with the cloud.
  useEffect(() => {
    const stopAuth = startAuth();
    const stopSync = startSync();
    return () => {
      stopAuth();
      stopSync();
    };
  }, []);

  // A notification that arrives while the app is open becomes a branded banner, not an iOS one.
  // Session alerts are skipped here because SessionWatcher raises those itself.
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((n) => {
      if (n.request.identifier.startsWith('session-')) return;
      const { title, body } = n.request.content;
      notify({ kind: 'nudge', title: title ?? '10,000 Hours', body: body ?? undefined, href: '/' });
    });
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

  if (!ready) return <SplashHandoff ready={false} />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="welcome" options={{ contentStyle: { backgroundColor: colors.lime }, animation: 'fade' }} />
        <Stack.Screen name="add-skill" />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="skill/[id]" />
        <Stack.Screen name="skill/edit/[id]" options={{ presentation: 'modal', contentStyle: { backgroundColor: colors.paper } }} />
        <Stack.Screen name="log/[id]" options={{ presentation: 'modal', contentStyle: { backgroundColor: colors.paper } }} />
        <Stack.Screen name="tree/[id]" />
        <Stack.Screen name="step/[id]" options={{ presentation: 'modal', contentStyle: { backgroundColor: colors.paper } }} />
        <Stack.Screen name="session-note/[id]" options={{ gestureEnabled: false }} />
        <Stack.Screen name="milestones" />
        <Stack.Screen name="coach/new" options={{ presentation: 'modal', contentStyle: { backgroundColor: colors.paper } }} />
        <Stack.Screen name="lesson/[id]" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', contentStyle: { backgroundColor: colors.ink } }} />
        <Stack.Screen name="settings" />
        <Stack.Screen name="import" options={{ presentation: 'modal', contentStyle: { backgroundColor: colors.paper } }} />
        {/* A sheet: swipe down to tuck the running session away (native, velocity-aware, interruptible). */}
        <Stack.Screen name="timer" options={{ presentation: 'modal', contentStyle: { backgroundColor: colors.lime } }} />
      </Stack>
      <SessionWatcher />
      <Overlay>
        <CelebrationHost />
        <StillGoingCheck />
        <BannerHost />
      </Overlay>
      <SplashHandoff ready />
    </GestureHandlerRootView>
  );
}

/**
 * Pop-ups must sit above everything, including the timer sheet (a native modal).
 * On iOS FullWindowOverlay renders in its own window above modals; it needs its
 * own gesture root so the banner can be swiped.
 */
function Overlay({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== 'ios') {
    return <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>{children}</View>;
  }
  return (
    <FullWindowOverlay>
      <GestureHandlerRootView pointerEvents="box-none" style={{ flex: 1 }}>
        {children}
      </GestureHandlerRootView>
    </FullWindowOverlay>
  );
}

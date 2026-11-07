import { router, type ErrorBoundaryProps } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { Button } from './Button';
import { Text } from './Text';

/**
 * Shown instead of a blank screen when a screen crashes: what went wrong, and a
 * way out. Export it from a route as `ErrorBoundary`.
 */
export function RouteError({ error, retry }: ErrorBoundaryProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 16, flexGrow: 1, justifyContent: 'center' }}>
        <Text variant="title" accessibilityRole="header">Something went wrong</Text>
        <Text variant="body" style={{ color: colors.muted }}>Your data is safe. Go back and try again, and if it keeps happening, send a screenshot of this screen.</Text>
        <View style={{ padding: 12, borderRadius: 14, borderWidth: 2, borderColor: colors.divider, backgroundColor: colors.white }}>
          <Text selectable style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.ink }}>{error?.message ?? String(error)}</Text>
        </View>
        <Button label="Go back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />
        <Button variant="outline" size="md" label="Try again" onPress={retry} />
      </ScrollView>
    </SafeAreaView>
  );
}

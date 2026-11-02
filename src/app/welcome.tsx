import { router } from 'expo-router';
import { View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo';
import { Text } from '../components/Text';
import { colors, fonts } from '../theme';

export default function Welcome() {
  const reduce = useReducedMotion();
  const rise = (d: number) => (reduce ? undefined : FadeInDown.delay(d).springify().dampingRatio(1).duration(420));
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.lime }}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 16, alignItems: 'center' }}>
        <Animated.View entering={reduce ? undefined : ZoomIn.springify().dampingRatio(0.85).duration(520)}>
          <Logo />
        </Animated.View>
        <Animated.View entering={rise(180)}>
          <Text accessibilityRole="header" style={{ marginTop: 48, fontFamily: fonts.display, fontSize: 44, lineHeight: 46, letterSpacing: 0.5 }} maxFontSizeMultiplier={1.1}>
            10,000 HOURS
          </Text>
        </Animated.View>
        <Animated.View entering={rise(260)}>
          <Text variant="bodyMedium" style={{ marginTop: 20, fontSize: 19, lineHeight: 27, textAlign: 'center', maxWidth: 300 }}>
            Miss a day and nothing resets. Every hour you put in stays counted.
          </Text>
        </Animated.View>
        <View style={{ flex: 1 }} />
        <Animated.View entering={rise(360)} style={{ alignSelf: 'stretch' }}>
          <Button label="Pick your first skill" onPress={() => router.push('/add-skill')} />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

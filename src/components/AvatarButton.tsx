import { router } from 'expo-router';
import User from 'lucide-react-native/icons/user';
import { View } from 'react-native';
import { initials, useAuth } from '../lib/auth';
import { useSync } from '../lib/sync';
import { colors, fonts } from '../theme';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

/** Top-right profile button: your initials when signed in, with a small dot if sync failed. */
export function AvatarButton() {
  const session = useAuth((s) => s.session);
  const name = useAuth((s) => s.profile?.displayName);
  const syncError = useSync((s) => s.error);
  const letters = initials(name);
  return (
    <PressableScale
      onPress={() => router.navigate('/(tabs)/profile')}
      scaleTo={0.9}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={session ? `Profile${syncError ? ', sync problem' : ''}` : 'Profile, not signed in'}
      style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: session ? colors.lime : colors.white, borderWidth: 2.5, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}
    >
      {session && letters ? (
        <Text style={{ fontFamily: fonts.display, fontSize: 15, lineHeight: 18 }} maxFontSizeMultiplier={1}>{letters}</Text>
      ) : (
        <User size={20} color={colors.ink} strokeWidth={2.25} />
      )}
      {session && syncError ? (
        <View style={{ position: 'absolute', top: -2, right: -2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#B3261E', borderWidth: 2, borderColor: colors.paper }} />
      ) : null}
    </PressableScale>
  );
}

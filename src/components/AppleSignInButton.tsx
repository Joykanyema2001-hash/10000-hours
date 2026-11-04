import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { appleSignInAvailable, signInWithApple } from '../lib/auth';
import { haptics } from '../lib/haptics';
import { notify } from '../lib/notify';
import { syncNow } from '../lib/sync';
import { colors } from '../theme';
import { Text } from './Text';

/**
 * Apple's own button (required by Apple's guidelines). After signing in, the first
 * sync runs right away so cloud data appears before `onDone` is called.
 */
export function AppleSignInButton({ type = 'continue', onDone }: { type?: 'continue' | 'signIn'; onDone?: () => void }) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    appleSignInAvailable().then(setAvailable);
  }, []);

  if (available === false) {
    return <Text variant="caption" style={{ textAlign: 'center' }}>Sign in with Apple works in the iPhone app.</Text>;
  }
  if (available === null) return <View style={{ height: 56 }} />;

  const press = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await signInWithApple();
    if (result === null) {
      await syncNow().catch(() => {});
      haptics.success();
      notify({ kind: 'info', title: 'Signed in', body: 'Your hours are backed up to your account.' });
      onDone?.();
    } else if (result !== 'cancelled') {
      haptics.warning();
      setError(result);
    }
    setBusy(false);
  };

  return (
    <View style={{ gap: 8 }}>
      <View>
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={type === 'signIn' ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN : AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={18}
          style={{ width: '100%', height: 56, opacity: busy ? 0.6 : 1 }}
          onPress={press}
        />
        {busy ? <ActivityIndicator color={colors.lime} style={{ position: 'absolute', right: 18, top: 18 }} /> : null}
      </View>
      {error ? (
        <Text variant="caption" style={{ color: colors.ink, textAlign: 'center' }} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

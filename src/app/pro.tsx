import { router } from 'expo-router';
import Check from 'lucide-react-native/icons/check';
import Sparkles from 'lucide-react-native/icons/sparkles';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppleSignInButton } from '../components/AppleSignInButton';
import { Button } from '../components/Button';
import { IconButton } from '../components/IconButton';
import { PressableScale } from '../components/PressableScale';
import { RouteError } from '../components/RouteError';
import { Text } from '../components/Text';
import { useAuth } from '../lib/auth';
import { haptics } from '../lib/haptics';
import { openLegal, PRIVACY_URL, TERMS_URL } from '../lib/legal';
import { notify } from '../lib/notify';
import { buy, loadPackages, manageSubscription, restore, usePro } from '../lib/pro';
import { colors, fonts } from '../theme';

const PERKS = [
  ['Up to 30 AI plans a month', 'Map any skill from beginner to mastery'],
  ['300 new lessons a month', 'With animated diagrams for every step'],
  ['Unlimited everything else', 'Tracking, trees, sync and widgets stay free for everyone'],
  ['Support an indie app', 'Keeps the coach running and improving'],
];

const isAnnual = (p: PurchasesPackage) => p.packageType === 'ANNUAL' || /year|annual/i.test(p.identifier);
const perMonth = (p: PurchasesPackage) => (isAnnual(p) ? p.product.price / 12 : p.product.price);

function Option({ pkg, selected, onPress, saving }: { pkg: PurchasesPackage; selected: boolean; onPress: () => void; saving: number | null }) {
  const annual = isAnnual(pkg);
  const trial = pkg.product.introPrice && pkg.product.introPrice.price === 0 ? `${pkg.product.introPrice.periodNumberOfUnits} ${pkg.product.introPrice.periodUnit.toLowerCase()}${pkg.product.introPrice.periodNumberOfUnits === 1 ? '' : 's'} free, then ` : '';
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${annual ? 'Yearly' : 'Monthly'}, ${trial}${pkg.product.priceString} a ${annual ? 'year' : 'month'}`}
      style={{ padding: 16, borderRadius: 20, borderWidth: 3, borderColor: colors.ink, backgroundColor: selected ? colors.lime : colors.white, gap: 4 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: fonts.displaySemi, fontSize: 20 }}>{annual ? 'Yearly' : 'Monthly'}</Text>
        {annual && saving ? (
          <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: colors.ink }}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: colors.lime }}>Save {saving}%</Text>
          </View>
        ) : null}
      </View>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16 }}>
        {trial}
        {pkg.product.priceString} a {annual ? 'year' : 'month'}
      </Text>
      {annual ? <Text variant="caption" style={{ color: colors.ink }}>Works out at {pkg.product.currencyCode} {perMonth(pkg).toFixed(2)} a month</Text> : null}
    </PressableScale>
  );
}

/** "Go Pro": what you get, the plans, and everything Apple asks a subscription screen to show. */
export default function ProScreen() {
  const reduce = useReducedMotion();
  const signedIn = useAuth((s) => !!s.session);
  const { available, pro, until, willRenew, packages } = usePro();
  const sorted = [...packages].sort((a, b) => Number(isAnnual(b)) - Number(isAnnual(a)));
  const [choice, setChoice] = useState<string | null>(null);
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const selected = sorted.find((p) => p.identifier === choice) ?? sorted[0];
  const monthly = sorted.find((p) => !isAnnual(p));
  const annual = sorted.find(isAnnual);
  const saving = monthly && annual ? Math.round((1 - annual.product.price / (monthly.product.price * 12)) * 100) : null;

  useEffect(() => {
    if (available && !packages.length) loadPackages();
  }, [available, packages.length]);

  const purchase = async () => {
    if (!selected || busy) return;
    setBusy('buy');
    const r = await buy(selected);
    setBusy(null);
    if (r === null) {
      haptics.success();
      notify({ kind: 'goal', title: 'Welcome to Pro', body: 'Your coach limits are raised. Go map something new.' });
      router.back();
    } else if (r !== 'cancelled') {
      haptics.warning();
      notify({ kind: 'info', title: 'Purchase didn’t complete', body: r });
    }
  };

  const doRestore = async () => {
    if (busy) return;
    setBusy('restore');
    const ok = await restore();
    setBusy(null);
    notify({ kind: 'info', title: ok ? 'Pro restored' : 'Nothing to restore', body: ok ? 'Your subscription is active on this account.' : 'No active subscription was found for this Apple ID.' });
  };

  const rise = (n: number) => (reduce ? undefined : FadeInDown.delay(60 + n * 60).springify().dampingRatio(1).duration(380));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <IconButton kind="close" onPress={() => router.back()} label="Close" />
      </View>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 8, gap: 18, paddingBottom: 40 }}>
        <Animated.View entering={rise(0)} style={{ gap: 10 }}>
          <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={28} color={colors.lime} strokeWidth={2.25} />
          </View>
          <Text variant="title" accessibilityRole="header">{pro ? 'You’re Pro' : '10K Pro'}</Text>
          <Text variant="bodyMedium">{pro ? (until ? `${willRenew ? 'Renews' : 'Ends'} on ${new Date(until).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}.` : 'Thanks for supporting 10,000 Hours.') : 'More coaching, for every skill you’re building.'}</Text>
        </Animated.View>

        <Animated.View entering={rise(1)} style={{ gap: 12 }}>
          {PERKS.map(([t, d]) => (
            <View key={t} style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.lime, borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                <Check size={15} color={colors.ink} strokeWidth={3} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="label">{t}</Text>
                <Text variant="caption">{d}</Text>
              </View>
            </View>
          ))}
        </Animated.View>

        {pro ? (
          <Button variant="outline" label="Manage subscription" onPress={manageSubscription} />
        ) : !available ? (
          <Text variant="body" style={{ color: colors.muted }}>Pro isn’t available in this version yet. It’s coming soon.</Text>
        ) : !signedIn ? (
          <View style={{ gap: 10 }}>
            <Text variant="label">Sign in first, so Pro stays with your account on every device.</Text>
            <AppleSignInButton />
          </View>
        ) : sorted.length === 0 ? (
          <ActivityIndicator color={colors.ink} />
        ) : (
          <Animated.View entering={rise(2)} style={{ gap: 10 }} accessibilityRole="radiogroup">
            {sorted.map((p) => (
              <Option key={p.identifier} pkg={p} selected={p.identifier === selected?.identifier} onPress={() => setChoice(p.identifier)} saving={saving} />
            ))}
            <Button label={busy === 'buy' ? 'One moment…' : 'Continue'} disabled={!!busy} onPress={purchase} />
          </Animated.View>
        )}

        {available && !pro ? (
          <PressableScale onPress={doRestore} accessibilityRole="button" style={{ alignSelf: 'center', padding: 8 }}>
            <Text variant="label" style={{ textDecorationLine: 'underline' }}>{busy === 'restore' ? 'Restoring…' : 'Restore purchases'}</Text>
          </PressableScale>
        ) : null}

        <Text variant="caption" style={{ textAlign: 'center' }}>
          Payment is charged to your Apple ID. Subscriptions renew automatically unless cancelled at least 24 hours before the end of the current period. Manage or cancel any time in Settings → Apple ID → Subscriptions.
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
          <Text variant="caption" style={{ textDecorationLine: 'underline', color: colors.ink }} accessibilityRole="link" onPress={() => openLegal(TERMS_URL)}>Terms of Service</Text>
          <Text variant="caption" style={{ textDecorationLine: 'underline', color: colors.ink }} accessibilityRole="link" onPress={() => openLegal(PRIVACY_URL)}>Privacy Policy</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export { RouteError as ErrorBoundary };

import { Platform } from 'react-native';
import Purchases, { PURCHASES_ERROR_CODE, type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';
import { create } from 'zustand';
import { useAuth } from './auth';

/**
 * RevenueCat's public iOS SDK key (starts with "appl_"). It's meant to ship inside the
 * app. Leave empty until RevenueCat is set up; Pro then simply shows as unavailable.
 */
export const REVENUECAT_IOS_KEY = '';
/** The entitlement id set up in RevenueCat. */
export const ENTITLEMENT = 'pro';

type ProState = {
  /** RevenueCat is configured and reachable on this device. */
  available: boolean;
  pro: boolean;
  /** When Pro renews or ends, if known. */
  until: string | null;
  willRenew: boolean;
  packages: PurchasesPackage[];
};

export const usePro = create<ProState>()(() => ({ available: false, pro: false, until: null, willRenew: false, packages: [] }));

function apply(info: CustomerInfo) {
  const e = info.entitlements.active[ENTITLEMENT];
  usePro.setState({ pro: !!e, until: e?.expirationDate ?? null, willRenew: !!e?.willRenew });
}

let started = false;

/** Call once at startup. Follows sign-in so a purchase belongs to the Supabase account. */
export async function startPro() {
  if (started || Platform.OS !== 'ios' || !REVENUECAT_IOS_KEY) return;
  started = true;
  try {
    Purchases.configure({ apiKey: REVENUECAT_IOS_KEY, appUserID: useAuth.getState().session?.user.id ?? null });
    Purchases.addCustomerInfoUpdateListener(apply);
    usePro.setState({ available: true });
    apply(await Purchases.getCustomerInfo());
    loadPackages();
  } catch {
    usePro.setState({ available: false });
    return;
  }
  let userId = useAuth.getState().session?.user.id ?? null;
  useAuth.subscribe(async (s) => {
    const next = s.session?.user.id ?? null;
    if (next === userId) return;
    userId = next;
    try {
      if (next) apply((await Purchases.logIn(next)).customerInfo);
      else apply(await Purchases.logOut());
    } catch {
      // Logging out an anonymous user throws; nothing to do.
    }
  });
}

export async function loadPackages() {
  try {
    const offerings = await Purchases.getOfferings();
    usePro.setState({ packages: offerings.current?.availablePackages ?? [] });
  } catch {
    usePro.setState({ packages: [] });
  }
}

/** null on success, 'cancelled' if the person backed out, otherwise a message to show. */
export async function buy(pkg: PurchasesPackage): Promise<null | 'cancelled' | string> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    apply(customerInfo);
    return null;
  } catch (e) {
    const err = e as { code?: string; userCancelled?: boolean | null; message?: string };
    if (err.userCancelled || err.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return 'cancelled';
    return err.message || 'The purchase didn’t go through. You haven’t been charged.';
  }
}

/** True if a subscription was found and restored. */
export async function restore(): Promise<boolean> {
  try {
    const info = await Purchases.restorePurchases();
    apply(info);
    return !!info.entitlements.active[ENTITLEMENT];
  } catch {
    return false;
  }
}

export const manageSubscription = () => Purchases.showManageSubscriptions().catch(() => {});

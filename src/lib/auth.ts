import type { Session } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { supabase } from './supabase';

export type Profile = { displayName: string | null; createdAt: string | null };

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  ready: boolean;
};

export const useAuth = create<AuthState>()(() => ({ session: null, profile: null, ready: false }));

async function loadProfile(userId: string) {
  const { data } = await supabase.from('profiles').select('display_name, created_at').eq('id', userId).maybeSingle();
  useAuth.setState({ profile: data ? { displayName: data.display_name, createdAt: data.created_at } : { displayName: null, createdAt: null } });
}

/** Call once at startup: restores a saved sign-in and follows changes. */
export function startAuth() {
  supabase.auth.getSession().then(({ data }) => {
    useAuth.setState({ session: data.session, ready: true });
    if (data.session) loadProfile(data.session.user.id).catch(() => {});
  });
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    useAuth.setState({ session });
    if (session) loadProfile(session.user.id).catch(() => {});
    else useAuth.setState({ profile: null });
  });
  return () => data.subscription.unsubscribe();
}

export async function appleSignInAvailable() {
  if (Platform.OS !== 'ios') return false;
  return AppleAuthentication.isAvailableAsync().catch(() => false);
}

/**
 * Sign in with Apple → Supabase. Apple only shares the name on the very first
 * sign-in, so it's saved to the profile straight away.
 * Returns null on success, 'cancelled', or an error message.
 */
export async function signInWithApple(): Promise<null | 'cancelled' | string> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
    });
    if (!credential.identityToken) return 'Apple did not return a sign-in token. Please try again.';
    const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken });
    if (error || !data.user) return error?.message ?? 'Sign-in failed. Please try again.';

    const name = credential.fullName
      ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ').trim()
      : '';
    // Create the profile row; keep an existing name if Apple sent none this time.
    await supabase.from('profiles').upsert(
      name ? { id: data.user.id, display_name: name } : { id: data.user.id },
      { onConflict: 'id', ignoreDuplicates: !name },
    );
    await loadProfile(data.user.id);
    return null;
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === 'ERR_REQUEST_CANCELED') return 'cancelled';
    return e instanceof Error ? e.message : 'Sign-in failed. Please try again.';
  }
}

export async function updateDisplayName(name: string) {
  const user = useAuth.getState().session?.user;
  if (!user) return;
  const { error } = await supabase.from('profiles').upsert({ id: user.id, display_name: name.trim(), updated_at: new Date().toISOString() });
  if (!error) useAuth.setState((s) => ({ profile: { createdAt: s.profile?.createdAt ?? null, displayName: name.trim() } }));
  return error?.message ?? null;
}

export async function signOut() {
  await supabase.auth.signOut().catch(() => {});
}

/** Permanently deletes the account and all its cloud data (App Store requirement). */
export async function deleteAccount(): Promise<string | null> {
  const { error } = await supabase.rpc('delete_my_account');
  if (error) return error.message;
  await supabase.auth.signOut().catch(() => {});
  return null;
}

/** "Joy Kanyema" → "JK". */
export function initials(name: string | null | undefined) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  return parts.length ? parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join('') : '';
}

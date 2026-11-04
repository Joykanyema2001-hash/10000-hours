import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

// The publishable key is designed to ship inside apps: Row Level Security in
// supabase/schema.sql is what keeps each person's data private.
export const SUPABASE_URL = 'https://jweprragcqwzyvqxyosm.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_morBbiHn97ge-8m3wFxcRQ_7_nySsgO';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresh the sign-in token only while the app is in the foreground.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

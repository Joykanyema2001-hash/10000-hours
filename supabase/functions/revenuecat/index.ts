// RevenueCat webhook: keeps public.entitlements in step with App Store subscriptions.
// Deploy:  npx supabase functions deploy revenuecat --project-ref jweprragcqwzyvqxyosm --no-verify-jwt
// Secret:  REVENUECAT_WEBHOOK_SECRET (the same value goes in RevenueCat's webhook Authorization header).

import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const serviceKey = () => {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) return legacy;
  try {
    return Object.values(JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}'))[0] as string;
  } catch {
    return '';
  }
};
const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey(), { auth: { persistSession: false } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Events after which access continues until the expiry date RevenueCat sends.
const ACTIVE = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'UNCANCELLATION', 'NON_RENEWING_PURCHASE', 'SUBSCRIPTION_EXTENDED', 'TEMPORARY_ENTITLEMENT_GRANT', 'CANCELLATION', 'BILLING_ISSUE']);

type Event = {
  type: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  transferred_to?: string[];
  transferred_from?: string[];
  expiration_at_ms?: number | null;
  product_id?: string;
};

/** Our app logs in to RevenueCat with the Supabase user id, so find the id that looks like one. */
const userIds = (ids: (string | undefined)[]) => [...new Set(ids.filter((x): x is string => !!x && UUID.test(x)))];

Deno.serve(async (req) => {
  const secret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  if (!secret || req.headers.get('Authorization') !== `Bearer ${secret}`) return new Response('unauthorised', { status: 401 });
  let event: Event;
  try {
    event = (await req.json()).event;
  } catch {
    return new Response('bad request', { status: 400 });
  }
  if (!event?.type) return new Response('ok');

  const now = new Date().toISOString();
  const write = (ids: string[], expires: string | null) =>
    ids.length
      ? admin.from('entitlements').upsert(ids.map((user_id) => ({ user_id, expires_at: expires, product_id: event.product_id ?? null, last_event: event.type, updated_at: now })))
      : Promise.resolve({ error: null });

  let result;
  if (event.type === 'TRANSFER') {
    // A purchase moved between accounts (e.g. restored while signed in as someone else).
    await write(userIds(event.transferred_from ?? []), now);
    const { data } = await admin.from('entitlements').select('expires_at').in('user_id', userIds(event.transferred_from ?? [])).limit(1);
    result = await write(userIds(event.transferred_to ?? []), data?.[0]?.expires_at ?? null);
  } else if (event.type === 'EXPIRATION') {
    result = await write(userIds([event.app_user_id, event.original_app_user_id, ...(event.aliases ?? [])]), now);
  } else if (ACTIVE.has(event.type)) {
    const expires = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : '2999-01-01T00:00:00Z';
    result = await write(userIds([event.app_user_id, event.original_app_user_id, ...(event.aliases ?? [])]), expires);
  }
  if (result?.error) {
    console.error(result.error);
    return new Response('retry', { status: 500 }); // RevenueCat retries on errors
  }
  return new Response('ok');
});

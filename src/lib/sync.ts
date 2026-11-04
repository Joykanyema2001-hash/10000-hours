import { create } from 'zustand';
import { useStore } from '../store';
import { useAuth } from './auth';
import { supabase } from './supabase';
import { mergeForSync, type RemoteSession, type RemoteSkill } from './syncMerge';

type SyncState = { syncing: boolean; lastSyncedAt: number | null; error: string | null };
export const useSync = create<SyncState>()(() => ({ syncing: false, lastSyncedAt: null, error: null }));

const PAGE = 1000;

async function fetchAll<T>(table: 'skills' | 'sessions', userId: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select('*').eq('user_id', userId).range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) return rows;
  }
}

async function upsertAll(table: 'skills' | 'sessions', rows: object[]) {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from(table).upsert(rows.slice(i, i + 500), { onConflict: 'user_id,id' });
    if (error) throw new Error(error.message);
  }
}

let running: Promise<void> | null = null;
let again = false;

/**
 * Two-way sync with the cloud. Safe to call often: concurrent calls coalesce,
 * and if local data changes mid-sync the result is discarded and it runs again,
 * so nothing logged during a sync is lost.
 */
export function syncNow(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      await syncOnce();
    } while (again);
  })().finally(() => {
    running = null;
  });
  return running;
}

async function syncOnce() {
  const userId = useAuth.getState().session?.user.id;
  if (!userId) return;
  useSync.setState({ syncing: true });
  try {
    const before = useStore.getState();
    const snapshot = { skills: before.skills, sessions: before.sessions, tombstones: before.tombstones };

    const [remoteSkills, remoteSessions, profileRes] = await Promise.all([
      fetchAll<RemoteSkill>('skills', userId),
      fetchAll<RemoteSession>('sessions', userId),
      supabase.from('profiles').select('daily_goal_min').eq('id', userId).maybeSingle(),
    ]);

    const result = mergeForSync(snapshot, { skills: remoteSkills, sessions: remoteSessions });
    await upsertAll('skills', result.pushSkills.map((r) => ({ ...r, user_id: userId })));
    await upsertAll('sessions', result.pushSessions.map((r) => ({ ...r, user_id: userId })));

    const now = useStore.getState();
    if (now.skills !== snapshot.skills || now.sessions !== snapshot.sessions || now.tombstones !== snapshot.tombstones) {
      again = true; // something changed while we were away; merge again with fresh data
      return;
    }
    // A brand-new phone takes the goal from the account; otherwise this phone's goal is saved.
    const remoteGoal = profileRes.data?.daily_goal_min;
    if (snapshot.skills.length === 0 && typeof remoteGoal === 'number') useStore.getState().setDailyGoal(remoteGoal);
    else await supabase.from('profiles').upsert({ id: userId, daily_goal_min: now.dailyGoalMin });

    useStore.getState().applySync(result.skills, result.sessions, result.sentTombstones);
    useSync.setState({ lastSyncedAt: Date.now(), error: null });
  } catch (e) {
    useSync.setState({ error: e instanceof Error ? e.message : String(e) });
  } finally {
    useSync.setState({ syncing: false });
  }
}

/** Sync when signed in, a few seconds after data changes, and when the app comes back. */
export function startSync() {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const soon = () => {
    if (!useAuth.getState().session) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => syncNow().catch(() => {}), 3000);
  };
  const unsubData = useStore.subscribe((s, p) => {
    if (s.skills !== p.skills || s.sessions !== p.sessions || s.tombstones !== p.tombstones || s.dailyGoalMin !== p.dailyGoalMin) soon();
  });
  const unsubAuth = useAuth.subscribe((s, p) => {
    if (s.session?.user.id && s.session.user.id !== p.session?.user.id) syncNow().catch(() => {});
  });
  return () => {
    unsubData();
    unsubAuth();
    if (timer) clearTimeout(timer);
  };
}

import { create } from 'zustand';
import { useStore } from '../store';
import { useAuth } from './auth';
import { supabase } from './supabase';
import { mergeForSync, type RemoteNode, type RemoteSession, type RemoteSkill } from './syncMerge';

type SyncState = { syncing: boolean; lastSyncedAt: number | null; error: string | null };
export const useSync = create<SyncState>()(() => ({ syncing: false, lastSyncedAt: null, error: null }));

const PAGE = 1000;

async function fetchAll<T>(table: 'skills' | 'sessions' | 'nodes', userId: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select('*').eq('user_id', userId).range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) return rows;
  }
}

async function upsertAll(table: 'skills' | 'sessions' | 'nodes', rows: object[]) {
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
    const snapshot = { skills: before.skills, sessions: before.sessions, nodes: before.nodes, tombstones: before.tombstones };

    const [remoteSkills, remoteSessions, remoteNodes, profileRes] = await Promise.all([
      fetchAll<RemoteSkill>('skills', userId),
      fetchAll<RemoteSession>('sessions', userId),
      fetchAll<RemoteNode>('nodes', userId),
      supabase.from('profiles').select('daily_goal_min').eq('id', userId).maybeSingle(),
    ]);

    const result = mergeForSync(snapshot, { skills: remoteSkills, sessions: remoteSessions, nodes: remoteNodes });
    await upsertAll('skills', result.pushSkills.map((r) => ({ ...r, user_id: userId })));
    await upsertAll('sessions', result.pushSessions.map((r) => ({ ...r, user_id: userId })));
    await upsertAll('nodes', result.pushNodes.map((r) => ({ ...r, user_id: userId })));

    const now = useStore.getState();
    if (now.skills !== snapshot.skills || now.sessions !== snapshot.sessions || now.nodes !== snapshot.nodes || now.tombstones !== snapshot.tombstones) {
      again = true; // something changed while we were away; merge again with fresh data
      return;
    }
    // A brand-new phone takes the goal from the account; otherwise this phone's goal is saved.
    const remoteGoal = profileRes.data?.daily_goal_min;
    if (snapshot.skills.length === 0 && typeof remoteGoal === 'number') useStore.getState().setDailyGoal(remoteGoal);
    else await supabase.from('profiles').upsert({ id: userId, daily_goal_min: now.dailyGoalMin });

    useStore.getState().applySync(result.skills, result.sessions, result.nodes, result.sentTombstones);
    useSync.setState({ lastSyncedAt: Date.now(), error: null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // The skill-tree tables come from supabase/002_skill_trees.sql; say so plainly if it hasn't been run.
    const missingSchema = /nodes|node_id|updated_at_ms|note/.test(msg) && /exist|schema cache|column|relation/i.test(msg);
    useSync.setState({ error: missingSchema ? 'Cloud database needs the skill-tree update (run supabase/002_skill_trees.sql in Supabase).' : msg });
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
    if (s.skills !== p.skills || s.sessions !== p.sessions || s.nodes !== p.nodes || s.tombstones !== p.tombstones || s.dailyGoalMin !== p.dailyGoalMin) soon();
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

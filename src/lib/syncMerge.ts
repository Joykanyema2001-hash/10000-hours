import type { NodeStatus, Session, Skill, SkillNode, Tombstones } from '../store';

/** Rows as stored in Supabase (see supabase/schema.sql). */
export type RemoteSkill = {
  user_id?: string;
  id: string;
  name: string;
  icon: string | null;
  prior_ms: number;
  created_at_ms: number;
  updated_at_ms: number;
  deleted: boolean;
};
export type RemoteSession = {
  user_id?: string;
  id: string;
  skill_id: string;
  start_ms: number;
  end_ms: number;
  ms: number;
  node_id?: string | null;
  note?: string | null;
  updated_at_ms?: number;
  deleted: boolean;
};
export type RemoteNode = {
  user_id?: string;
  id: string;
  skill_id: string;
  parent_id: string | null;
  title: string;
  notes: string | null;
  status: NodeStatus;
  created_at_ms: number;
  updated_at_ms: number;
  mastered_at_ms: number | null;
  deleted: boolean;
};

export type MergeResult = {
  skills: Skill[];
  sessions: Session[];
  nodes: SkillNode[];
  pushSkills: RemoteSkill[];
  pushSessions: RemoteSession[];
  pushNodes: RemoteNode[];
  sentTombstones: Tombstones;
};

const toRemoteSkill = (k: Skill): RemoteSkill => ({
  id: k.id,
  name: k.name,
  icon: k.icon ?? null,
  prior_ms: Math.round(k.priorMs),
  created_at_ms: k.createdAt,
  updated_at_ms: k.updatedAt ?? k.createdAt,
  deleted: false,
});
const fromRemoteSkill = (r: RemoteSkill): Skill => ({
  id: r.id,
  name: r.name,
  icon: r.icon ?? undefined,
  priorMs: Number(r.prior_ms),
  createdAt: Number(r.created_at_ms),
  updatedAt: Number(r.updated_at_ms),
});
const toRemoteSession = (x: Session): RemoteSession => ({
  id: x.id,
  skill_id: x.skillId,
  start_ms: Math.round(x.start),
  end_ms: Math.round(x.end),
  ms: Math.round(x.ms),
  node_id: x.nodeId ?? null,
  note: x.note ?? null,
  updated_at_ms: Math.round(x.updatedAt ?? x.end),
  deleted: false,
});
const fromRemoteSession = (r: RemoteSession): Session => ({
  id: r.id,
  skillId: r.skill_id,
  start: Number(r.start_ms),
  end: Number(r.end_ms),
  ms: Number(r.ms),
  nodeId: r.node_id ?? null,
  note: r.note ?? null,
  updatedAt: Number(r.updated_at_ms ?? r.end_ms),
});
const toRemoteNode = (n: SkillNode): RemoteNode => ({
  id: n.id,
  skill_id: n.skillId,
  parent_id: n.parentId,
  title: n.title,
  notes: n.notes ?? null,
  status: n.status,
  created_at_ms: n.createdAt,
  updated_at_ms: n.updatedAt,
  mastered_at_ms: n.masteredAt ?? null,
  deleted: false,
});
const fromRemoteNode = (r: RemoteNode): SkillNode => ({
  id: r.id,
  skillId: r.skill_id,
  parentId: r.parent_id,
  title: r.title,
  notes: r.notes ?? undefined,
  status: r.status,
  createdAt: Number(r.created_at_ms),
  updatedAt: Number(r.updated_at_ms),
  masteredAt: r.mastered_at_ms == null ? null : Number(r.mastered_at_ms),
});

/**
 * Two-way merge between this phone and the cloud.
 *  - Skills: the most recent edit wins (updatedAt). A skill created separately on two
 *    devices with the same name is merged into one rather than duplicated.
 *  - Sessions never change after they're saved, so they're a union, minus deletions.
 *  - Deletions win: a deletion on either side removes the item on both.
 * Pure function: no network, no store access, so it can be tested on its own.
 */
export function mergeForSync(
  local: { skills: Skill[]; sessions: Session[]; nodes?: SkillNode[]; tombstones: Partial<Tombstones> & { skills: string[]; sessions: string[] } },
  remote: { skills: RemoteSkill[]; sessions: RemoteSession[]; nodes?: RemoteNode[] },
): MergeResult {
  const localNodesIn = local.nodes ?? [];
  const remoteNodesIn = remote.nodes ?? [];
  const nodeTombs = local.tombstones.nodes ?? [];
  const remoteSkills = new Map(remote.skills.map((r) => [r.id, r]));
  const remoteSessions = new Map(remote.sessions.map((r) => [r.id, r]));

  // 1. Same skill name created on two devices: adopt the cloud's id for the local one.
  const remap = new Map<string, string>();
  const localIds = new Set(local.skills.map((k) => k.id));
  const liveRemoteByName = new Map(remote.skills.filter((r) => !r.deleted).map((r) => [r.name.trim().toLowerCase(), r]));
  for (const k of local.skills) {
    if (remoteSkills.has(k.id)) continue;
    const twin = liveRemoteByName.get(k.name.trim().toLowerCase());
    if (twin && !localIds.has(twin.id)) remap.set(k.id, twin.id);
  }
  const mapId = (id: string) => remap.get(id) ?? id;
  const localSkills = local.skills.map((k) => ({ ...k, id: mapId(k.id) }));
  const localSessions = local.sessions.map((x) => ({ ...x, skillId: mapId(x.skillId) }));
  const deadSkills = new Set(local.tombstones.skills.map(mapId));
  const deadSessions = new Set(local.tombstones.sessions);

  // 2. Skills.
  const skills: Skill[] = [];
  const pushSkills: RemoteSkill[] = [];
  const localById = new Map(localSkills.map((k) => [k.id, k]));
  const allSkillIds = new Set([...localById.keys(), ...remoteSkills.keys()]);
  for (const id of allSkillIds) {
    const l = localById.get(id);
    const r = remoteSkills.get(id);
    if (deadSkills.has(id)) {
      if (r && !r.deleted) pushSkills.push({ ...r, deleted: true, updated_at_ms: Date.now() });
      continue;
    }
    if (r?.deleted) continue; // deleted on another device
    if (l && r) {
      const lt = l.updatedAt ?? l.createdAt;
      if (lt > Number(r.updated_at_ms)) {
        skills.push(l);
        pushSkills.push(toRemoteSkill(l));
      } else {
        skills.push(fromRemoteSkill(r));
      }
    } else if (l) {
      skills.push(l);
      pushSkills.push(toRemoteSkill(l));
    } else if (r) {
      skills.push(fromRemoteSkill(r));
    }
  }
  const liveSkillIds = new Set(skills.map((k) => k.id));

  // 3. Sessions.
  const sessions: Session[] = [];
  const pushSessions: RemoteSession[] = [];
  const localSessionsById = new Map(localSessions.map((x) => [x.id, x]));
  const allSessionIds = new Set([...localSessionsById.keys(), ...remoteSessions.keys()]);
  for (const id of allSessionIds) {
    const l = localSessionsById.get(id);
    const r = remoteSessions.get(id);
    const skillId = l?.skillId ?? r?.skill_id;
    const skillGone = !skillId || !liveSkillIds.has(skillId);
    if (deadSessions.has(id) || skillGone) {
      if (r && !r.deleted) pushSessions.push({ ...r, deleted: true });
      continue;
    }
    if (r?.deleted) continue;
    if (l && r) {
      // Sessions only change by gaining a step or a note: the most recent edit wins.
      const lt = l.updatedAt ?? l.end;
      const rt = Number(r.updated_at_ms ?? r.end_ms);
      if (r.skill_id !== l.skillId || lt > rt) {
        sessions.push(l);
        pushSessions.push(toRemoteSession(l));
      } else {
        sessions.push(rt > lt ? fromRemoteSession(r) : l);
      }
    } else if (l) {
      sessions.push(l);
      pushSessions.push(toRemoteSession(l));
    } else if (r) {
      sessions.push(fromRemoteSession(r));
    }
  }

  // 4. Skill-tree steps: same rules as skills (newest edit wins, deletions stick).
  const nodes: SkillNode[] = [];
  const pushNodes: RemoteNode[] = [];
  const deadNodes = new Set(nodeTombs);
  const remoteNodes = new Map(remoteNodesIn.map((r) => [r.id, r]));
  const localNodes = new Map(localNodesIn.map((n) => [n.id, { ...n, skillId: mapId(n.skillId) }]));
  for (const id of new Set([...localNodes.keys(), ...remoteNodes.keys()])) {
    const l = localNodes.get(id);
    const r = remoteNodes.get(id);
    const skillId = l?.skillId ?? r?.skill_id;
    if (deadNodes.has(id) || !skillId || !liveSkillIds.has(skillId)) {
      if (r && !r.deleted) pushNodes.push({ ...r, deleted: true, updated_at_ms: Date.now() });
      continue;
    }
    if (r?.deleted) continue;
    if (l && r) {
      if (l.updatedAt > Number(r.updated_at_ms)) {
        nodes.push(l);
        pushNodes.push(toRemoteNode(l));
      } else nodes.push(fromRemoteNode(r));
    } else if (l) {
      nodes.push(l);
      pushNodes.push(toRemoteNode(l));
    } else if (r) nodes.push(fromRemoteNode(r));
  }
  // A step whose parent vanished (deleted elsewhere) moves up to the top level rather than being lost.
  const liveNodeIds = new Set(nodes.map((n) => n.id));
  for (const n of nodes) {
    if (n.parentId && !liveNodeIds.has(n.parentId)) {
      n.parentId = null;
      n.updatedAt = Date.now();
      const i = pushNodes.findIndex((p) => p.id === n.id);
      if (i >= 0) pushNodes[i] = toRemoteNode(n);
      else pushNodes.push(toRemoteNode(n));
    }
  }

  return {
    skills,
    sessions,
    nodes,
    pushSkills,
    pushSessions,
    pushNodes,
    sentTombstones: { skills: local.tombstones.skills, sessions: local.tombstones.sessions, nodes: nodeTombs },
  };
}

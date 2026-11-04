import type { SkillNode } from '../store';

export const NODE_W = 156;
export const NODE_H = 68;
export const ROOT_W = 188;
export const ROOT_H = 76;
const H_GAP = 22;
const V_GAP = 64;
const PAD = 40;

export const ROOT_ID = '__root';

export type Placed = { id: string; x: number; y: number; w: number; h: number; depth: number; node: SkillNode | null };
export type Edge = { from: Placed; to: Placed };
export type TreeLayout = { placed: Placed[]; byId: Map<string, Placed>; edges: Edge[]; width: number; height: number };

/**
 * Top-down tidy layout. The skill itself is the root; each step sits centred
 * above its children, siblings are ordered by when they were added, and a
 * subtree is exactly as wide as it needs to be, so branches never overlap.
 */
export function layoutTree(nodes: SkillNode[]): TreeLayout {
  const ids = new Set(nodes.map((n) => n.id));
  const children = new Map<string, SkillNode[]>();
  for (const n of nodes) {
    const parent = n.parentId && ids.has(n.parentId) ? n.parentId : ROOT_ID;
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent)!.push(n);
  }
  for (const list of children.values()) list.sort((a, b) => a.createdAt - b.createdAt);

  const widthOf = new Map<string, number>();
  const measure = (id: string, w: number): number => {
    const kids = children.get(id) ?? [];
    const kidsW = kids.reduce((sum, k, i) => sum + measure(k.id, NODE_W) + (i > 0 ? H_GAP : 0), 0);
    const total = Math.max(w, kidsW);
    widthOf.set(id, total);
    return total;
  };
  const totalW = measure(ROOT_ID, ROOT_W);

  const placed: Placed[] = [];
  const byId = new Map<string, Placed>();
  const edges: Edge[] = [];
  let maxBottom = 0;

  const place = (id: string, node: SkillNode | null, left: number, depth: number, parent: Placed | null) => {
    const span = widthOf.get(id)!;
    const w = node ? NODE_W : ROOT_W;
    const h = node ? NODE_H : ROOT_H;
    const y = PAD + (depth === 0 ? 0 : ROOT_H + V_GAP + (depth - 1) * (NODE_H + V_GAP));
    const p: Placed = { id, x: PAD + left + (span - w) / 2, y, w, h, depth, node };
    placed.push(p);
    byId.set(id, p);
    if (parent) edges.push({ from: parent, to: p });
    maxBottom = Math.max(maxBottom, y + h);
    const kids = children.get(id) ?? [];
    const kidsW = kids.reduce((sum, k, i) => sum + widthOf.get(k.id)! + (i > 0 ? H_GAP : 0), 0);
    let cursor = left + (span - kidsW) / 2;
    for (const k of kids) {
      place(k.id, k, cursor, depth + 1, p);
      cursor += widthOf.get(k.id)! + H_GAP;
    }
  };
  place(ROOT_ID, null, 0, 0, null);

  return { placed, byId, edges, width: totalW + PAD * 2, height: maxBottom + PAD + 48 };
}

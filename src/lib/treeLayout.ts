import type { SkillNode } from '../store';

export const NODE_W = 220;
export const NODE_H = 64;
export const ROOT_W = 240;
export const ROOT_H = 72;
/** How far each level steps in from its parent. */
export const INDENT = 40;
/** Room between cards, including the + button under each one. */
const GAP = 30;
const PAD = 24;

export const ROOT_ID = '__root';

export type Placed = { id: string; x: number; y: number; w: number; h: number; depth: number; node: SkillNode | null };
export type Edge = { from: Placed; to: Placed };
export type TreeLayout = { placed: Placed[]; byId: Map<string, Placed>; edges: Edge[]; width: number; height: number };

/**
 * Vertical, indented layout (like an outline). The skill is the root; each step sits
 * below its parent, indented one level, with its own steps directly beneath it.
 * Siblings are ordered by when they were added, so a coach plan reads top to bottom
 * in plan order. Width grows only with depth, so trees stay phone-shaped.
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

  const placed: Placed[] = [];
  const byId = new Map<string, Placed>();
  const edges: Edge[] = [];
  let y = PAD;
  let right = 0;

  // Iterative depth-first walk, so very deep trees can't overflow the stack.
  const stack: { id: string; node: SkillNode | null; depth: number; parent: Placed | null }[] = [{ id: ROOT_ID, node: null, depth: 0, parent: null }];
  while (stack.length) {
    const { id, node, depth, parent } = stack.pop()!;
    if (byId.has(id)) continue; // guards against cycles in synced data
    const w = node ? NODE_W : ROOT_W;
    const h = node ? NODE_H : ROOT_H;
    const p: Placed = { id, x: PAD + depth * INDENT, y, w, h, depth, node };
    placed.push(p);
    byId.set(id, p);
    if (parent) edges.push({ from: parent, to: p });
    y += h + GAP;
    right = Math.max(right, p.x + w);
    const kids = children.get(id) ?? [];
    for (let i = kids.length - 1; i >= 0; i--) stack.push({ id: kids[i].id, node: kids[i], depth: depth + 1, parent: p });
  }

  return { placed, byId, edges, width: right + PAD, height: y - GAP + PAD + 24 };
}

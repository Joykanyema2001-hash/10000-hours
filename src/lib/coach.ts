import AsyncStorage from '@react-native-async-storage/async-storage';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { useStore } from '../store';
import { supabase } from './supabase';

/** Talks to the `coach` Edge Function (supabase/functions/coach). Shapes match it. */

export type CoachQuestion = { question: string; options: string[] };
export type CoachQuestions = { skillName: string; icon: string; questions: CoachQuestion[] };
export type PlanStep = { title: string; notes: string };
export type PlanStage = { title: string; why: string; steps: PlanStep[] };
export type CoachPlan = { skillName: string; icon: string; summary: string; safety: string | null; minutesPerWeek: number; stages: PlanStage[] };

export type SceneKind = 'hook' | 'idea' | 'steps' | 'mistakes' | 'drill';
/** Must match VISUALS in the Edge Function. */
export const VISUALS = ['target', 'lightbulb', 'eye', 'hand', 'footprints', 'wind', 'ear', 'brain', 'heart', 'repeat', 'timer', 'zap', 'book', 'dumbbell', 'scale', 'rocket'] as const;
export type Visual = (typeof VISUALS)[number];
export type Scene = { kind: SceneKind; title: string; body: string; bullets: string[]; visual: Visual; minutes: number | null };
/** Must match DIAGRAMS in the Edge Function. */
export type DiagramType =
  | 'code'
  | 'terminal'
  | 'fretboard'
  | 'piano'
  | 'keys'
  | 'build'
  | 'field'
  | 'chess'
  | 'phrase'
  | 'cycle'
  | 'intervals'
  | 'compare'
  | 'none';
export type DiagramFrame = { label: string; lines: string[]; value: number | null };
/** meta: per-type settings (instrument, device, surface, starting position, language). */
export type Diagram = { type: DiagramType; frames: DiagramFrame[]; meta?: string[] };
export type Lesson = { title: string; scenes: Scene[]; diagram?: Diagram };

export class CoachError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('coach', { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => null);
      const e = payload?.error;
      if (e?.message) throw new CoachError(e.code ?? 'error', e.message);
    }
    throw new CoachError('network', 'Couldn’t reach the coach. Check your connection and try again.');
  }
  return data as T;
}

export const askQuestions = (goal: string) => call<CoachQuestions>({ action: 'questions', goal });

export const makePlan = (goal: string, answers: { question: string; answer: string }[]) => call<CoachPlan>({ action: 'plan', goal, answers });

/** Same normalisation as the Edge Function, so a lesson is found offline by the same key. */
export const lessonKey = (skill: string, step: string) =>
  `v3::${skill}::${step}`.toLowerCase().replace(/[^a-z0-9:]+/g, ' ').replace(/\s+/g, ' ').trim();

const cacheKey = (key: string) => `tenk-lesson:${key}`;

/** Saved on the phone first, then shared by topic on the server, generated only when new. */
export async function getLesson(skill: string, step: string, notes?: string): Promise<{ key: string; lesson: Lesson }> {
  const key = lessonKey(skill, step);
  try {
    const saved = await AsyncStorage.getItem(cacheKey(key));
    if (saved) return { key, lesson: JSON.parse(saved) as Lesson };
  } catch {
    // Fall through to the network.
  }
  const out = await call<{ key: string; lesson: Lesson }>({ action: 'lesson', skill, step, notes });
  AsyncStorage.setItem(cacheKey(out.key), JSON.stringify(out.lesson)).catch(() => {});
  return out;
}

export async function reportLesson(key: string, reason: string) {
  await call({ action: 'report', key, reason });
  // Drop the local copy so a replacement is fetched next time.
  await AsyncStorage.removeItem(cacheKey(key)).catch(() => {});
}

/**
 * Turn an accepted plan into a skill tree. Adds to an existing skill with the same
 * name rather than creating a duplicate. Returns the skill id.
 */
export function applyPlan(plan: CoachPlan): string {
  const s = useStore.getState();
  const existing = s.skills.find((k) => k.name.trim().toLowerCase() === plan.skillName.trim().toLowerCase());
  const skillId = existing?.id ?? s.addSkill(plan.skillName, 0, plan.icon);
  // Distinct, increasing creation times keep stages and steps in plan order after syncing.
  let t = Date.now();
  for (const stage of plan.stages) {
    const stageId = s.addNode(skillId, null, stage.title, { notes: stage.why, createdAt: t++ });
    for (const step of stage.steps) s.addNode(skillId, stageId, step.title, { notes: step.notes, createdAt: t++ });
  }
  return skillId;
}

// 10,000 Hours AI coach. Deploy with:
//   npx supabase functions deploy coach --project-ref jweprragcqwzyvqxyosm --no-verify-jwt
// (the function checks the sign-in itself, below). Needs the ANTHROPIC_API_KEY secret.
//
// Actions (POST JSON { action, ... } with the user's access token):
//   questions { goal }                    → a few questions that shape the plan
//   plan      { goal, answers }           → a staged plan that becomes the skill tree
//   lesson    { skill, step, notes? }     → a short swipeable lesson, shared by topic
//   report    { key, reason? }            → flag a lesson; enough reports hide it

import Anthropic from 'npm:@anthropic-ai/sdk@1.6.0';
import { betaZodOutputFormat } from 'npm:@anthropic-ai/sdk@1.6.0/helpers/beta/zod';
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { z } from 'npm:zod@4.6.7';

// Plans need the most judgement; questions and lessons are short and frequent.
const PLAN_MODEL = Deno.env.get('COACH_PLAN_MODEL') ?? 'claude-sonnet-5-5';
const FAST_MODEL = Deno.env.get('COACH_FAST_MODEL') ?? 'claude-haiku-5-5';
const LIMITS = { ask: 20, plan: 3, lesson: 40 } as const;
// Testers (comma-separated user ids in the COACH_TESTERS secret) get high but still capped limits.
const TESTER_LIMITS = { ask: 500, plan: 100, lesson: 500 } as const;
const TESTERS = new Set((Deno.env.get('COACH_TESTERS') ?? '').split(',').map((s) => s.trim()).filter(Boolean));
const LESSON_HIDE_AFTER = 3;

// Must match SKILL_ICONS in src/lib/skillIcons.ts.
const ICONS = [
  'guitar', 'piano', 'drum', 'mic', 'music', 'languages', 'book', 'feather', 'pen', 'brush', 'palette', 'camera',
  'film', 'code', 'terminal', 'calculator', 'brain', 'chess', 'gamepad', 'football', 'ball', 'running', 'bike',
  'swim', 'gym', 'climb', 'fight', 'activity', 'cooking', 'craft', 'sewing', 'garden', 'driving', 'target', 'trophy',
] as const;
// Must match VISUALS in src/lib/coach.ts.
const VISUALS = ['target', 'lightbulb', 'eye', 'hand', 'footprints', 'wind', 'ear', 'brain', 'heart', 'repeat', 'timer', 'zap', 'book', 'dumbbell', 'scale', 'rocket'] as const;
// Must match DIAGRAMS in src/lib/coach.ts.
const DIAGRAMS = ['code', 'terminal', 'cycle', 'intervals', 'compare', 'none'] as const;

const Questions = z.object({
  skillName: z.string().describe('Short name for the skill, e.g. "Swimming"'),
  icon: z.string().describe(`One of: ${ICONS.join(', ')}`),
  questions: z
    .array(z.object({ question: z.string(), options: z.array(z.string()).describe('2 to 4 short answers') }))
    .describe('2 or 3 questions'),
});

const Plan = z.object({
  skillName: z.string(),
  icon: z.string().describe(`One of: ${ICONS.join(', ')}`),
  summary: z.string().describe('One or two sentences: where this plan takes the learner'),
  safety: z.string().nullable().describe('A short safety note when the skill has physical or real-world risk, otherwise null'),
  minutesPerWeek: z.number().describe('Suggested practice minutes per week'),
  stages: z
    .array(
      z.object({
        title: z.string().describe('2 to 5 words'),
        why: z.string().describe('One sentence on what this stage unlocks'),
        steps: z.array(z.object({ title: z.string().describe('2 to 6 words'), notes: z.string().describe('One or two sentences: what to practise and how you know you have it') })),
      }),
    )
    .describe('3 to 6 stages, beginner to mastery, each with 2 to 4 steps'),
});

const Lesson = z.object({
  title: z.string(),
  scenes: z
    .array(
      z.object({
        kind: z.string().describe('One of: hook, idea, steps, mistakes, drill'),
        title: z.string().describe('At most 8 words'),
        body: z.string().describe('At most 30 words'),
        bullets: z.array(z.string()).describe('0 to 4 items of at most 10 words each'),
        visual: z.string().describe(`One of: ${VISUALS.join(', ')}`),
        minutes: z.number().nullable().describe('Drill length in minutes for the drill scene, otherwise null'),
      }),
    )
    .describe('Exactly 5 scenes in this order: hook, idea, steps, mistakes, drill'),
  diagram: z
    .object({
      type: z.string().describe(`One of: ${DIAGRAMS.join(', ')}`),
      frames: z
        .array(
          z.object({
            label: z.string().describe('At most 5 words'),
            lines: z.array(z.string()).describe('0 to 6 short lines of at most 34 characters'),
            value: z.number().nullable().describe('Seconds for a cycle phase, minutes for an interval block, otherwise null'),
          }),
        )
        .describe('One frame per step of the steps scene, in order (compare: exactly 2 frames, wrong then right)'),
    })
    .describe('A small animated diagram that shows the steps scene, so visual learners can follow along'),
});

const STYLE = `You are the coach inside 10,000 Hours, an app where people track deliberate practice toward mastery.
Write in plain, warm, direct English for a beginner. No hype, no emoji, no exclamation marks.
Be accurate. Teach only well-established technique. If a skill has physical risk (water, heights, weights, fighting, driving, food safety), include practical safety guidance, and recommend a qualified instructor where beginners genuinely need one.
Do not give medical, legal or financial advice. If the request is not a learnable skill or would be harmful to learn, return a plan for the closest safe, learnable skill instead.`;

const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

const serviceKey = () => {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) return legacy;
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
    return Object.values(keys)[0] as string;
  } catch {
    return '';
  }
};
const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey(), { auth: { persistSession: false } });

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const fail = (status: number, code: string, message: string) => reply(status, { error: { code, message } });

class Refused extends Error {}

/**
 * One structured call. Where the model supports it, a refusal is retried server-side on
 * another model (Haiku has no server-side fallback); a final refusal throws.
 */
async function generate<T extends z.ZodType>(model: string, schema: T, prompt: string, effort: 'low' | 'medium', maxTokens = 16000): Promise<z.infer<T>> {
  const fallback = model.startsWith('claude-haiku') ? {} : { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const };
  const response = await client.beta.messages.parse({
    model,
    max_tokens: maxTokens,
    ...fallback,
    output_config: { effort, format: betaZodOutputFormat(schema) },
    system: STYLE,
    messages: [{ role: 'user', content: prompt }],
  });
  if (response.stop_reason === 'refusal') throw new Refused('refused');
  if (response.stop_reason === 'max_tokens' || !response.parsed_output) throw new Error(`incomplete output (${response.stop_reason})`);
  return response.parsed_output as z.infer<T>;
}

const KINDS = ['hook', 'idea', 'steps', 'mistakes', 'drill'] as const;
const pick = <T extends string>(v: string, allowed: readonly T[], fallback: T): T => ((allowed as readonly string[]).includes(v) ? (v as T) : fallback);

const clean = (s: unknown, max: number) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, max) : '');
/** Same normalisation as lessonKey() in src/lib/coach.ts. */
// The "v2" prefix makes lessons regenerate with diagrams; bump it when the lesson shape changes.
const lessonKey = (skill: string, step: string) =>
  `v2::${skill}::${step}`.toLowerCase().replace(/[^a-z0-9:]+/g, ' ').replace(/\s+/g, ' ').trim();

type RawDiagram = { type: string; frames: { label: string; lines: string[]; value: number | null }[] };
/** Keep diagrams small enough for a phone and drop ones that don't fit their type. */
function cleanDiagram(d: RawDiagram | undefined): RawDiagram {
  if (!d) return { type: 'none', frames: [] };
  const type = pick(d.type, DIAGRAMS, 'none');
  const keepSpaces = type === 'code' || type === 'terminal';
  const frames = (d.frames ?? []).slice(0, 6).map((f) => ({
    label: clean(f.label, 40),
    lines: (f.lines ?? []).slice(0, 6).map((l) => (keepSpaces && typeof l === 'string' ? l.replace(/\s+$/, '').slice(0, 44) : clean(l, 60))),
    value: typeof f.value === 'number' && f.value > 0 ? Math.min(600, Math.round(f.value * 10) / 10) : null,
  }));
  if (type === 'none' || frames.length === 0 || (type === 'compare' && frames.length !== 2)) return { type: 'none', frames: [] };
  return { type, frames };
}

async function take(userId: string, kind: keyof typeof LIMITS) {
  const limit = TESTERS.has(userId) ? TESTER_LIMITS[kind] : LIMITS[kind];
  const { data, error } = await admin.rpc('coach_take', { p_user: userId, p_kind: kind, p_limit: limit });
  if (error) throw new Error(`usage: ${error.message}`);
  return data === true;
}
async function refund(userId: string, kind: keyof typeof LIMITS) {
  await admin.rpc('coach_refund', { p_user: userId, p_kind: kind });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return fail(405, 'method', 'Use POST');

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth } = await admin.auth.getUser(token);
  const user = auth?.user;
  if (!user) return fail(401, 'signin', 'Sign in to use the coach.');

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail(400, 'bad_request', 'Expected JSON.');
  }
  const action = body.action;

  let kind: keyof typeof LIMITS | null = null;
  try {
    if (action === 'questions') {
      const goal = clean(body.goal, 200);
      if (goal.length < 2) return fail(400, 'bad_request', 'Say what you want to learn.');
      kind = 'ask';
      if (!(await take(user.id, kind))) return fail(429, 'limit', 'You have used this month’s coach questions. They reset on the 1st.');
      const out = await generate(
        FAST_MODEL,
        Questions,
        `Someone wants to learn: "${goal}".\nAsk 2 or 3 multiple-choice questions whose answers would most change their plan, such as current level, what they have access to, how much time they have, or what they want it for. Give each 2 to 4 short options.`,
        'low',
        4000,
      );
      out.icon = pick(out.icon, ICONS, 'target');
      out.questions = out.questions.slice(0, 3).map((q) => ({ question: clean(q.question, 140), options: q.options.slice(0, 4).map((o) => clean(o, 60)) }));
      return reply(200, out);
    }

    if (action === 'plan') {
      const goal = clean(body.goal, 200);
      const answers = Array.isArray(body.answers) ? body.answers.slice(0, 4) : [];
      if (goal.length < 2) return fail(400, 'bad_request', 'Say what you want to learn.');
      kind = 'plan';
      if (!(await take(user.id, kind))) return fail(429, 'limit', `You can make ${LIMITS.plan} new plans a month. More on the 1st.`);
      const context = answers.map((a: { question?: unknown; answer?: unknown }) => `- ${clean(a?.question, 140)}: ${clean(a?.answer, 140)}`).join('\n');
      const out = await generate(
        PLAN_MODEL,
        Plan,
        `Build a learning plan for: "${goal}".\nWhat they told us:\n${context || '- nothing yet'}\n\nGo from where they are now to genuine mastery, in 3 to 6 stages with 2 to 4 concrete, practisable steps each. Each step should be something they can work on in a session and clearly tell when they have it. Order matters: each stage builds on the last.`,
        'medium',
      );
      out.icon = pick(out.icon, ICONS, 'target');
      out.stages = out.stages.slice(0, 6).map((s) => ({
        title: clean(s.title, 60),
        why: clean(s.why, 200),
        steps: s.steps.slice(0, 4).map((st) => ({ title: clean(st.title, 60), notes: clean(st.notes, 300) })),
      }));
      return reply(200, out);
    }

    if (action === 'lesson') {
      const skill = clean(body.skill, 60);
      const step = clean(body.step, 80);
      const notes = clean(body.notes, 300);
      if (!skill || !step) return fail(400, 'bad_request', 'Missing skill or step.');
      const key = lessonKey(skill, step);

      const { data: cached } = await admin.from('lessons').select('lesson, hidden').eq('key', key).maybeSingle();
      if (cached && !cached.hidden) return reply(200, { key, lesson: cached.lesson, cached: true });

      kind = 'lesson';
      if (!(await take(user.id, kind))) return fail(429, 'limit', 'You have reached this month’s new-lesson limit. Saved lessons still work.');
      const lesson = await generate(
        FAST_MODEL,
        Lesson,
        `Make a short swipeable lesson for one step of learning ${skill}.\nStep: "${step}"${notes ? `\nAbout this step: ${notes}` : ''}\n\nFive scenes, like a great short teaching video broken into cards:\n1. hook: why this step matters, in a way that makes them want to try it\n2. idea: the one key idea or feel to aim for\n3. steps: how to do it, as up to 4 short ordered bullets\n4. mistakes: the most common mistakes, as up to 4 short bullets saying what to do instead\n5. drill: one specific practice drill with a length in minutes\nGive every scene a specific title about this step, never a generic one like "How to do it" or "Common mistakes" (the app already labels each scene). Pick the visual that best fits each scene.

Also make one small animated diagram for the steps scene, with one frame per step in the same order, so a visual learner can follow along:
- code: writing code. Each frame's lines are the code added at that step, with real indentation (2 spaces). Keep lines under 34 characters.
- terminal: command-line steps. Each frame: the command first, then up to 2 lines of the output it prints.
- cycle: a repeated movement, rhythm or loop (a stroke, breathing, a practice loop). Each frame is one phase with a short label; value is its length in seconds if timing matters.
- intervals: timed blocks (run and walk, practice blocks, rests). Each frame is one block; value is its length in minutes.
- compare: getting a position, form or setup right. Exactly 2 frames: first the wrong way, then the right way, each with 2 to 4 short lines describing it.
- none: only if none of these would genuinely help.
Diagram text must be accurate and match the steps.`,
        'low',
        6000,
      );
      lesson.scenes = lesson.scenes.slice(0, 6).map((s, i) => ({
        ...s,
        kind: pick(s.kind, KINDS, KINDS[Math.min(i, 4)]),
        visual: pick(s.visual, VISUALS, 'lightbulb'),
        title: clean(s.title, 80),
        body: clean(s.body, 260),
        bullets: s.bullets.slice(0, 4).map((b) => clean(b, 90)),
        minutes: pick(s.kind, KINDS, KINDS[Math.min(i, 4)]) === 'drill' && typeof s.minutes === 'number' ? Math.max(1, Math.min(60, Math.round(s.minutes))) : null,
      }));
      lesson.diagram = cleanDiagram(lesson.diagram);
      // A hidden (reported) lesson is regenerated and replaces the old one.
      await admin.from('lessons').upsert({ key, skill, step, lesson, reports: 0, hidden: false });
      return reply(200, { key, lesson, cached: false });
    }

    if (action === 'report') {
      const key = clean(body.key, 200);
      if (!key) return fail(400, 'bad_request', 'Missing lesson.');
      await admin.from('lesson_reports').insert({ user_id: user.id, lesson_key: key, reason: clean(body.reason, 300) || null });
      const { count } = await admin.from('lesson_reports').select('id', { count: 'exact', head: true }).eq('lesson_key', key);
      await admin.from('lessons').update({ reports: count ?? 0, hidden: (count ?? 0) >= LESSON_HIDE_AFTER }).eq('key', key);
      return reply(200, { ok: true });
    }

    return fail(400, 'bad_request', 'Unknown action.');
  } catch (e) {
    if (kind) await refund(user.id, kind).catch(() => {});
    if (e instanceof Refused) return fail(422, 'refused', 'The coach can’t help with that one. Try describing a different skill.');
    if (e instanceof Anthropic.RateLimitError) return fail(503, 'busy', 'The coach is busy. Try again in a minute.');
    if (e instanceof Anthropic.AuthenticationError) return fail(500, 'config', 'The coach isn’t set up yet (missing or invalid API key).');
    if (e instanceof Anthropic.APIError) return fail(502, 'upstream', `The coach hit an error (${e.status}). Try again.`);
    console.error(e);
    return fail(500, 'internal', 'Something went wrong. Try again.');
  }
});

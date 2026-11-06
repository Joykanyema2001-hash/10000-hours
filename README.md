# 10,000 Hours

Track the hours you put into a skill. Miss a day and nothing resets.

Built with Expo (SDK 58) + Expo Router, Reanimated, react-native-svg, expo-haptics and expo-notifications.
Design source: the "10,000 Hours Screens" Figma file. Motion follows Apple's fluid-interface principles
(critically damped springs by default, feedback on touch-down, haptics on the same frame as the visual, Reduce Motion respected).

## Run it on your iPhone (no Mac needed)

1. Install **Expo Go** from the App Store (it must support SDK 58).
2. On your computer:

   ```bash
   npm install
   npx expo start
   ```

3. Scan the QR code with the iPhone Camera app.

Haptics only work on a physical device. Notifications are local (no server), so they work in Expo Go.

## What's where

| Path | What it does |
| --- | --- |
| `src/app/` | Screens (Expo Router): `welcome`, `add-skill`, `(tabs)/index` (Today), `(tabs)/milestones`, `timer` (sheet), `skill/[id]` |
| `src/components/ClockFace.tsx` | Live session clock. Hands are driven on the UI thread every frame from timestamps: long hand = one lap per hour practised, short hand = 1/12 per hour, sweeping second hand. Pulses once on each completed hour. |
| `src/components/RollingText.tsx` | Odometer-style digits for the timer |
| `src/lib/haptics.ts` | All haptics in one place (select, commit, soft, minute tick, success) |
| `src/lib/notifications.ts` | Hour reached / milestone reached / daily goal reached during a session, plus one gentle 7pm nudge |
| `src/lib/session.ts` | Start / pause / finish, keeping store + haptics + notifications in step |
| `src/store.ts` | Zustand store persisted to AsyncStorage. Sessions are stored as timestamps, so the timer survives backgrounding. |
| `src/theme.ts` | Colours (same tokens as Figma), fonts, spring presets, size-based letter-spacing |

## Checks

```bash
npm run typecheck
npx expo export --platform ios   # bundles the app; catches import/Babel errors
```

## iPhone build (Live Activity, Dynamic Island, widgets)

These need a development build instead of Expo Go. EAS builds it in the cloud; no Xcode needed.

| Path | What it is |
| --- | --- |
| `targets/widget/` | Widget extension (SwiftUI): home-screen widget (small, medium), lock-screen widgets, and the session Live Activity / Dynamic Island |
| `modules/tenk-activity/` | Local Expo module that starts, updates and ends the Live Activity (ActivityKit) |
| `src/lib/nativeSync.ts` | Sends the running session to the Live Activity and today's data to the widget (shared App Group) |

One-time setup on your Mac:

```bash
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest device:create
```

Build and install:

```bash
npx eas-cli@latest build --platform ios --profile development
```

Then run `npx expo start` and open the 10,000 Hours app (not Expo Go) on the phone.

## Accounts and sync

Sign in with Apple + Supabase. Data is saved on the phone first and synced in the background.

| Path | What it is |
| --- | --- |
| `supabase/schema.sql` | Tables, row-level security (each person sees only their rows) and `delete_my_account()`. Run once in the Supabase SQL editor |
| `src/lib/syncMerge.ts` | Pure two-way merge: newest skill edit wins, sessions are a union, deletions stick, same-name skills merge |
| `src/lib/sync.ts` | Runs the sync (on sign-in, after changes, on app open) |
| `src/lib/auth.ts` | Sign in with Apple, profile, sign out, delete account |

## TestFlight

From the Mac, once:

```bash
npx eas-cli@latest build --platform ios --profile production --auto-submit
```

This creates the App Store signing (app + widget, with Sign in with Apple), builds in the cloud and uploads to TestFlight. After that, later builds can also be started from expo.dev.

## Skill trees

Each skill has a tree of steps (e.g. Open chords → G, C, D → Barre chords), each to learn / learning / mastered, with notes.
Sessions can be tagged with the step they were spent on, plus a note.

| Path | What it is |
| --- | --- |
| `src/lib/treeLayout.ts` | Pure top-down layout: parents centred over children, no overlaps |
| `src/components/TreeCanvas.tsx` | Pan / pinch / double-tap canvas (gesture-handler + Reanimated) |
| `src/app/tree/[id].tsx`, `src/app/step/[id].tsx` | Tree screen and step editor |
| `src/app/session-note/[id].tsx` | "What did you work on?" after finishing a session |
| `supabase/002_skill_trees.sql` | Cloud tables for steps and session notes. **Run once in Supabase** |

## Over-the-air updates (EAS Update)

JavaScript, styling, text and image changes can ship without a new build or App Store review:

```bash
npx eas-cli@latest update --channel production --message "What changed"
```

Installed apps download it in the background and use it the next time they're opened.
`runtimeVersion` uses the **fingerprint** policy: any native change (Swift in `targets/` or `modules/`,
a new native library, native config) changes the fingerprint, so older builds stop receiving updates
until a new build is installed. Native changes always need `eas build`.

## AI coach

Coach tab → **Learn something new**: the coach asks a couple of questions, builds a staged plan, and turns it into a skill tree. Every step has a short swipeable lesson (Watch the lesson on the step screen).

- Server: `supabase/functions/coach` (Supabase Edge Function, Claude API). The API key lives only in Supabase secrets (`ANTHROPIC_API_KEY`); the app never sees it.
- Database: run `supabase/003_coach.sql` once. Lessons are stored by topic and shared, so each one is generated once.
- Limits per person per month: 20 question rounds, 3 new plans, 40 new lessons (saved lessons are free). Change `LIMITS` in the function.
- Model: `claude-opus-5-5` by default; set a `COACH_MODEL` secret to change it.
- Deploy: `npx supabase functions deploy coach --project-ref jweprragcqwzyvqxyosm --no-verify-jwt` (the function checks sign-in itself).
- Lessons with 3 reports are hidden and regenerated on next view.

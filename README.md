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

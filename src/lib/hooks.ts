import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/** Re-renders every `intervalMs`, aligned to the wall-clock second so digits change in step. */
export function useNow(intervalMs = 1000, enabled = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      timer = setTimeout(tick, intervalMs - (t % intervalMs) + 5);
    };
    tick();
    return () => clearTimeout(timer);
  }, [intervalMs, enabled]);
  return now;
}

/** iOS "Reduce Transparency": swap translucent materials for solid fills. */
export function useReduceTransparency(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'ios') return; // iOS-only setting
    AccessibilityInfo.isReduceTransparencyEnabled().then(setOn).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setOn);
    return () => sub.remove();
  }, []);
  return on;
}

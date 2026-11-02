import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import type { TextStyle } from 'react-native';
import { withCommas } from '../lib/time';
import { Text } from './Text';

/** Counts from `from` to `value` with an ease-out, e.g. hours ticking up after a session. */
export function AnimatedNumber({ value, from, suffix = '', style, duration = 900 }: {
  value: number;
  from?: number;
  suffix?: string;
  style?: TextStyle;
  duration?: number;
}) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce || from == null ? value : from);
  const prev = useRef(shown);

  useEffect(() => {
    const start = prev.current;
    if (reduce || start === value) {
      setShown(value);
      prev.current = value;
      return;
    }
    const t0 = Date.now();
    let raf = 0;
    const step = () => {
      const p = Math.min(1, (Date.now() - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = Math.round(start + (value - start) * eased);
      setShown(v);
      prev.current = v;
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <Text variant="display" style={style} accessibilityLabel={`${withCommas(value)}${suffix}`}>
      {withCommas(shown)}
      {suffix}
    </Text>
  );
}

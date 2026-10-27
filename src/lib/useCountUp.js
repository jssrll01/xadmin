import { useEffect, useRef, useState } from 'react';

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Animates from the currently shown value to `target`.
// First reveal is longer; later live updates are short and subtle.
export default function useCountUp(target, duration = 900) {
  const first = useRef(true);
  const cur = useRef(reduced() ? target : 0);
  const [val, setVal] = useState(cur.current);

  useEffect(() => {
    if (reduced()) { cur.current = target; setVal(target); return undefined; }
    const from = cur.current;
    if (from === target) return undefined;
    const dur = first.current ? duration : Math.min(duration, 450);
    first.current = false;
    const t0 = performance.now();
    let raf = 0;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      cur.current = p < 1 ? from + (target - from) * e : target;
      setVal(cur.current);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return val;
}

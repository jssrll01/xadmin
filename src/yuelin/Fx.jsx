import React, { useEffect, useRef, useState } from 'react';

export function CountUp({ value, ms = 1000 }) {
  const [n, setN] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const to = Number(value) || 0;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(to); from.current = to; return undefined; }
    const f0 = from.current;
    const t0 = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      setN(Math.round(f0 + (to - f0) * e));
      if (p < 1) raf = requestAnimationFrame(tick); else from.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return <>{n.toLocaleString()}</>;
}

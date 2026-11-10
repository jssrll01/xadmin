import { useEffect } from 'react';

// Clears a filter box 5 seconds after the admin stops typing. The timer restarts on every keystroke.
export default function useAutoClear(value, setValue, ms = 5000) {
  useEffect(() => {
    if (!value) return undefined;
    const t = setTimeout(() => setValue(''), ms);
    return () => clearTimeout(t);
  }, [value, setValue, ms]);
}

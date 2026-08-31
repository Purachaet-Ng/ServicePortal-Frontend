import { useEffect, useState } from "react";

/**
 * Delay a fast-changing value — a search box, mainly — so it does not fire a
 * request per keystroke.
 */
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

import { useEffect, useState } from "react";
export function useDebounce<T>(value: T, delay?: number): T | undefined {
  const [debouncedValue, setDebouncedValue] = useState<T | undefined>(undefined);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay || 300);
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

import React from "react";

export function useDebounceValue<T>(value: T, delay?: number): T | undefined {
  const [debouncedValue, setDebouncedValue] = React.useState<T | undefined>(undefined);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay || 300);
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function useDebounce<T>(
  callback: (args: T) => void,
  delay?: number
): {
  run: (args: T) => void;
  isPending: boolean;
} {
  const callbackRef = React.useRef<ReturnType<typeof setTimeout>>(null);
  const [pending, setPending] = React.useState(false);

  const run = (args: T) => {
    if (callbackRef.current) {
      clearTimeout(callbackRef.current);
    }
    callbackRef.current = setTimeout(() => {
      callback(args);
      setPending(false);
    }, delay || 300);
    setPending(true);
  };

  return { run, isPending: pending };
}

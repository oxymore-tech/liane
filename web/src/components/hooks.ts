import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { type DependencyList, useCallback, useEffect, useState } from "react";
import { BadRequest, NotFound, Unauthorized } from "@/api/exception";

export type QueryResult<T> = {
  data: T;
  setData: (data: T) => void;
  loading: boolean;
  refresh: () => void;
};

export function tryToRecover(
  router: AppRouterInstance,
  pathname: string,
  err: any,
) {
  if (err instanceof Unauthorized) {
    const urlSearchParams = new URLSearchParams();
    urlSearchParams.append("returnUrl", pathname);
    const q = urlSearchParams.toString();
    q === "" ? router.push("/login") : router.push(`/login?${q}`);
  } else if (err instanceof BadRequest || err instanceof NotFound) {
    router.push("/");
  } else {
    throw err;
  }
}

export function useQuery<T, TDef extends T | undefined>(
  fn: () => Promise<T>,
  defaultValue: TDef = undefined as any,
  deps: DependencyList = [],
): QueryResult<T | TDef> {
  const [data, setData] = useState<T | TDef>(defaultValue);
  const [loading, setLoading] = useState(true);

  // biome-ignore lint/correctness/useExhaustiveDependencies: to avoid too many calls
  useEffect(() => {
    setLoading(true);
    fn()
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [setData, ...deps]);

  const refresh = useCallback(() => {
    setLoading(true);
    fn()
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [fn]);

  return { data, loading, setData, refresh } as const;
}

export function useDebounce<T>(value: T, delay?: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay ?? 500);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

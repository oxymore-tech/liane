import React, { useEffect, useLayoutEffect, useState } from "react";
import { PaginatedResponse } from "@liane/common";
import { QueryFunction, QueryKey, useInfiniteQuery } from "@tanstack/react-query";

export const usePaginatedQuery = <T>(
  queryKey: QueryKey,
  loadData: (nextCursor: string | undefined, queryKey: QueryKey) => Promise<PaginatedResponse<T>>
) => {
  const [refreshing, setRefreshing] = useState(false);
  const [fetchingNextPage, setFetchingNextPage] = useState(false);
  const queryFn: QueryFunction<PaginatedResponse<T>, QueryKey, string | undefined> = ({ pageParam = undefined, queryKey }) =>
    loadData(pageParam, queryKey);
  const {
    isLoading: loading,
    error,
    data,
    refetch,
    fetchNextPage: next,
    hasNextPage
  } = useInfiniteQuery({
    queryKey: [queryKey],
    queryFn,
    initialPageParam: undefined,
    getNextPageParam: lastPage => (lastPage.next ? lastPage.next : undefined)
  });

  const refresh: () => void = async () => {
    setRefreshing(true); // isRefetching causes glitters
    await refetch();
    setRefreshing(false);
  };

  const fetchNextPage: () => void = async () => {
    setFetchingNextPage(true);
    await next();
    setFetchingNextPage(false);
  };

  return { refresh, fetchNextPage, refreshing, loading, fetchingNextPage, data, error, hasNextPage };
};

export const useEvent = <T>(name: string, listener: (event: T) => void) => {
  useEffect(() => {
    const eventListener = ({ detail }: CustomEvent) => {
      listener(detail);
    };
    //@ts-ignore
    document.addEventListener(name, eventListener);
    //@ts-ignore
    return () => document.removeEventListener(name, eventListener);
  }, [listener, name]);
};

export const dispatchCustomEvent = <T>(name: string, payload: T) => {
  document.dispatchEvent(new CustomEvent(name, { detail: payload, bubbles: true }));
};

export const useElementSize = (ref: React.RefObject<HTMLElement>, initial?: { width: number; height: number }, dependencies?: any[]) => {
  const [height, setHeight] = useState<number>(initial?.height || 0);
  const [width, setWidth] = useState<number>(initial?.width || 0);

  useLayoutEffect(() => {
    const updateSize = () => {
      if (!ref.current) return;
      setHeight(ref.current.clientHeight);
      setWidth(ref.current.clientWidth);
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [ref, ...(dependencies || [])]);
  return { height, width };
};

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

const groupBy = function <T>(xs: T[], key: (t: T) => string): { [k: string]: T[] } {
  return xs.reduce(
    function (rv, x) {
      (rv[key(x)] = rv[key(x)] || []).push(x);
      return rv;
    },
    {} as { [k: string]: T[] }
  );
};

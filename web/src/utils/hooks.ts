import { useState } from "react";
import { PaginatedResponse } from "@liane/common";
import { useInfiniteQuery } from "react-query";

export const usePaginatedQuery = <T>(queryKey: string, loadData: (nextCursor: string) => Promise<PaginatedResponse<T>>) => {
  const [refreshing, setRefreshing] = useState(false);
  const [fetchingNextPage, setFetchingNextPage] = useState(false);

  const {
    isLoading: loading,
    error,
    data,
    refetch,
    fetchNextPage: next,
    hasNextPage
  } = useInfiniteQuery<PaginatedResponse<T>, Error>(queryKey, ({ pageParam = undefined }) => loadData(pageParam), {
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

import { useQuery } from "react-query";
import { useCallback, useContext } from "react";
import { AppContext } from "@/components/context/ContextProvider.tsx";
import { Ref, Trip } from "@liane/common";
import { useFocusEffect } from "@react-navigation/native";

export const LianeQueryKey = ["liane"];

export function useLianeQuery(id: string) {
  const { services } = useContext(AppContext);
  return useQuery(["liane", id], async () => await services.community.get(id));
}

export function useLianeMatchesQuery() {
  const { services } = useContext(AppContext);
  const query = useQuery(["liane", "match"], async () => await services.community.match());

  useFocusEffect(
    useCallback(() => {
      query.refetch().then();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  return query;
}

export function useLianeMatchQuery(lianeRequestId: string) {
  const { services } = useContext(AppContext);

  const query = useQuery(["liane", "match", lianeRequestId], async () => await services.community.matchLianeRequest(lianeRequestId));

  useFocusEffect(
    useCallback(() => {
      query.refetch().then();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  return query;
}

export const LianeOnMapQueryKey = (bboxAsString: string) => ["liane", bboxAsString];

export const TripQueryKey = ["trip"];

export const TripDetailQueryKey = (id: Ref<Trip>) => ["trip", id];

export const TripHistoryQueryKey = ["trip-history"];

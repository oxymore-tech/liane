import { useQuery } from "react-query";
import { useContext } from "react";
import { AppContext } from "@/components/context/ContextProvider.tsx";
import { Ref, Trip } from "@liane/common";

export const LianeQueryKey = ["liane"];

export function useLianeQuery(id: string) {
  const { services } = useContext(AppContext);
  return useQuery(["liane", id], async () => await services.community.get(id));
}

export function useLianeMatches() {
  const { services } = useContext(AppContext);
  return useQuery(["liane", "match"], async () => await services.community.match());
}

export function useLianeMatch(lianeRequestId: string) {
  const { services } = useContext(AppContext);
  return useQuery(["liane", "match", lianeRequestId], async () => await services.community.matchLianeRequest(lianeRequestId));
}

export const LianeOnMapQueryKey = (bboxAsString: string) => ["liane", bboxAsString];

export const TripQueryKey = ["trip"];

export const TripDetailQueryKey = (id: Ref<Trip>) => ["trip", id];

export const TripHistoryQueryKey = ["trip-history"];

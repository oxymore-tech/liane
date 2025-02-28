import { useQuery } from "react-query";
import { useContext } from "react";
import { AppContext } from "@/components/context/ContextProvider.tsx";

export const LianeQueryKey = "liane";

export function useLianeQuery(id: string) {
  const { services } = useContext(AppContext);
  return useQuery([LianeQueryKey, id], async () => await services.community.get(id));
}

export function useLianeMatchQuery() {
  const { services } = useContext(AppContext);
  return useQuery([LianeQueryKey, "match"], async () => await services.community.match());
}

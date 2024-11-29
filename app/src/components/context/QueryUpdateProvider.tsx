import React, { PropsWithChildren, useContext } from "react";
import { AppContext } from "@/components/context/ContextProvider";
import { useQueryClient } from "react-query";
import { Liane, PaginatedResponse, TripStatus } from "@liane/common";
import { TripDetailQueryKey, TripQueryKey } from "@/screens/user/MyTripsScreen";
import { useSubscription } from "@/util/hooks/subscription";
import { LianeGeolocation } from "@/api/service/location";

/**
 * This component is responsible for updating local query cache
 */
export type IQueryUpdater = {};
// @ts-ignore
const QueryUpdaterContext = React.createContext<IQueryUpdater>();

export const FutureStates: TripStatus[] = ["NotStarted", "Started"];

const updateLianeList = (old: PaginatedResponse<Liane>, liane: Liane) => {
  const found = old.data.findIndex(l => l.id === liane.id);
  if (FutureStates.includes(liane.state)) {
    if (found >= 0) {
      old.data[found] = liane;
      return old;
    } else {
      old.data.unshift(liane);
      return { ...old, pageSize: old.pageSize + 1 };
    }
  } else if (found >= 0) {
    return { ...old, pageSize: old.pageSize - 1, data: old.data.filter(l => l.id !== liane.id) };
  }
  return old;
};

export const QueryUpdateProvider = (props: PropsWithChildren) => {
  const { services } = useContext(AppContext);
  const queryClient = useQueryClient();

  // Update liane local cache

  useSubscription<Liane>(
    services.realTimeHub.tripUpdates,
    liane => {
      queryClient.setQueryData<PaginatedResponse<Liane>>(TripQueryKey, old => {
        if (!old) {
          return { pageSize: 1, data: [liane] };
        }
        return updateLianeList(old, liane);
      });
      queryClient.setQueryData<Liane>(TripDetailQueryKey(liane.id!), _ => liane);

      // Cancel pings if necessary
      LianeGeolocation.currentLiane().then(async current => {
        if (!current) {
          return;
        }
        if (current === liane.id && liane.state !== "Started") {
          await LianeGeolocation.stopSendingPings();
        }
      });
    },
    []
  );

  return <QueryUpdaterContext.Provider value={{}}>{props.children}</QueryUpdaterContext.Provider>;
};

import React, { PropsWithChildren, useContext } from "react";
import { AppContext } from "@/components/context/ContextProvider";
import { useQueryClient } from "react-query";
import { Trip, PaginatedResponse, TripStatus } from "@liane/common";
import { TripDetailQueryKey, TripQueryKey } from "@/screens/user/TripScheduleScreen";
import { useSubscription } from "@/util/hooks/subscription";
import { LianeGeolocation } from "@/api/service/location";

/**
 * This component is responsible for updating local query cache
 */
export type IQueryUpdater = {};
// @ts-ignore
const QueryUpdaterContext = React.createContext<IQueryUpdater>();

export const FutureStates: TripStatus[] = ["NotStarted", "Started"];

const updateLianeList = (old: PaginatedResponse<Trip>, liane: Trip) => {
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

  useSubscription<Trip>(
    services.realTimeHub.tripUpdates,
    liane => {
      queryClient.setQueryData<PaginatedResponse<Trip>>(TripQueryKey, old => {
        if (!old) {
          return { pageSize: 1, data: [liane] };
        }
        return updateLianeList(old, liane);
      });
      queryClient.setQueryData<Trip>(TripDetailQueryKey(liane.id!), _ => liane);

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

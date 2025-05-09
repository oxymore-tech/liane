import React, { PropsWithChildren, useContext } from "react";
import { AppContext } from "@/components/context/ContextProvider";
import { useQueryClient } from "react-query";
import { Trip } from "@liane/common";
import { useSubscription } from "@/util/hooks/subscription";
import { LianeGeolocation } from "@/api/service/location";
import { LianeQueryKey, TripQueryKey } from "@/util/hooks/query.ts";

export type IQueryUpdater = {};

// @ts-ignore
const QueryUpdaterContext = React.createContext<IQueryUpdater>();

export const QueryUpdateProvider = (props: PropsWithChildren) => {
  const { services } = useContext(AppContext);
  const queryClient = useQueryClient();

  useSubscription<Trip>(
    services.realTimeHub.tripUpdates,
    trip => {
      queryClient.invalidateQueries(TripQueryKey).then();

      // Cancel pings if necessary
      LianeGeolocation.currentLiane().then(async current => {
        if (!current) {
          return;
        }
        if (current === trip.id && trip.state !== "Started") {
          await LianeGeolocation.stopSendingPings();
        }
      });
    },
    []
  );

  useSubscription<string | undefined>(
    services.realTimeHub.lianeUpdates,
    (_?: string) => {
      queryClient.invalidateQueries(TripQueryKey).then();
      queryClient.invalidateQueries(LianeQueryKey).then();
    },
    []
  );

  return <QueryUpdaterContext.Provider value={{}}>{props.children}</QueryUpdaterContext.Provider>;
};

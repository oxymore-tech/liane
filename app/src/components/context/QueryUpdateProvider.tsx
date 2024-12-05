import React, { PropsWithChildren, useContext } from "react";
import { AppContext } from "@/components/context/ContextProvider";
import { useQueryClient } from "react-query";
import { Trip } from "@liane/common";
import { TripQueryKey } from "@/screens/user/TripScheduleScreen";
import { useSubscription } from "@/util/hooks/subscription";
import { LianeGeolocation } from "@/api/service/location";

/**
 * This component is responsible for updating local query cache
 */
export type IQueryUpdater = {};
// @ts-ignore
const QueryUpdaterContext = React.createContext<IQueryUpdater>();

export const QueryUpdateProvider = (props: PropsWithChildren) => {
  const { services } = useContext(AppContext);
  const queryClient = useQueryClient();

  // Update liane local cache

  useSubscription<Trip>(
    services.realTimeHub.tripUpdates,
    liane => {
      queryClient.invalidateQueries(TripQueryKey).then();

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

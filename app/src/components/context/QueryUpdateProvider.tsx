import React, { PropsWithChildren, useContext, useEffect } from "react";
import { AppContext } from "@/components/context/ContextProvider";
import { InfiniteData, useQueryClient } from "react-query";
import { NotificationQueryKey } from "@/screens/notifications/NotificationScreen";
import { JoinRequestDetailed, Trip, TripState, Notification, PaginatedResponse } from "@liane/common";
import { JoinRequestsQueryKey, TripDetailQueryKey, TripQueryKey } from "@/screens/user/MyTripsScreen";
import { useSubscription } from "@/util/hooks/subscription";
import { LianeGeolocation } from "@/api/service/location";

/**
 * This component is responsible for updating local query cache
 */
export type IQueryUpdater = {
  readNotifications: (userId: string) => void;
};
// @ts-ignore
const QueryUpdaterContext = React.createContext<IQueryUpdater>();

export const useQueryUpdater = () => {
  return useContext<IQueryUpdater>(QueryUpdaterContext);
};

export const FutureStates: TripState[] = ["NotStarted", "Started"];

const updateTripList = (old: PaginatedResponse<Trip>, trip: Trip) => {
  const found = old.data.findIndex(l => l.id === trip.id);
  if (FutureStates.includes(trip.state)) {
    if (found >= 0) {
      old.data[found] = trip;
      return old;
    } else {
      old.data.unshift(trip);
      return { ...old, pageSize: old.pageSize + 1 };
    }
  } else if (found >= 0) {
    return { ...old, pageSize: old.pageSize - 1, data: old.data.filter(l => l.id !== trip.id) };
  }
  return old;
};

const updateNotificationPages = (old: InfiniteData<PaginatedResponse<Notification>>, n: Notification) => {
  if (old.pages.length === 0) {
    return { ...old, pages: [{ pageSize: 1, data: [n] }] };
  } else {
    old.pages[0].data.unshift(n);
    old.pages[0] = { ...old.pages[0], pageSize: old.pages[0].pageSize + 1 };
    return old;
  }
};

const updateJoinRequestsList = (old: PaginatedResponse<JoinRequestDetailed>, trip: Trip) => {
  const updatedData = old.data.filter(joinRequest => joinRequest.targetTrip.id !== trip.id);
  return { pageSize: updatedData.length, data: updatedData };
};

const readNotifications = (old: InfiniteData<PaginatedResponse<Notification>>, userId: string) => {
  return {
    ...old!,
    pages: old!.pages.map(p => ({
      ...p,
      data: p.data.map(item => {
        const userIndex = item.recipients.findIndex(r => r.user === userId);
        item.recipients[userIndex] = { ...item.recipients[userIndex], seenAt: new Date().toISOString() };
        return item;
      })
    }))
  };
};

export const QueryUpdateProvider = (props: PropsWithChildren) => {
  const { services } = useContext(AppContext);
  const queryClient = useQueryClient();

  // Update liane local cache

  useSubscription<Trip>(services.realTimeHub.tripUpdates, trip => {
    queryClient.setQueryData<PaginatedResponse<JoinRequestDetailed>>(JoinRequestsQueryKey, old => {
      if (!old) {
        return { pageSize: 0, data: [] };
      }
      return updateJoinRequestsList(old, trip);
    });
    queryClient.setQueryData<PaginatedResponse<Trip>>(TripQueryKey, old => {
      if (!old) {
        return { pageSize: 1, data: [trip] };
      }
      return updateTripList(old, trip);
    });
    queryClient.setQueryData<Trip>(TripDetailQueryKey(trip.id!), _ => trip);
    if (trip.state !== "NotStarted") {
      // Cancel eventual reminder
      services.reminder.cancelReminder(trip.id!);
    }

    // Cancel pings if necessary
    LianeGeolocation.currentTrip().then(async current => {
      if (!current) {
        return;
      }
      if (current === trip.id && trip.state !== "Started") {
        await LianeGeolocation.stopSendingPings();
      }
    });
  });

  // Update notifications local cache
  useEffect(() => {
    const sub = services.realTimeHub.subscribeToNotifications(async (n: Notification) => {
      queryClient.setQueryData<InfiniteData<PaginatedResponse<Notification>>>(NotificationQueryKey, old => {
        if (!old) {
          return { pages: [{ pageSize: 1, data: [n] }], pageParams: [undefined] };
        } else {
          return updateNotificationPages(old, n);
        }
      });
      return sub.unsubscribe();
    });
  }, [queryClient, services.realTimeHub]);
  return (
    <QueryUpdaterContext.Provider
      value={{
        readNotifications: userId =>
          queryClient.setQueryData<InfiniteData<PaginatedResponse<Notification>>>(NotificationQueryKey, old =>
            readNotifications(old ?? { pageParams: [undefined], pages: [] }, userId)
          )
      }}>
      {props.children}
    </QueryUpdaterContext.Provider>
  );
};

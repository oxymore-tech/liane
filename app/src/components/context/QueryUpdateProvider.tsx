import React, { PropsWithChildren, useContext, useEffect } from "react";
import { AppContext } from "@/components/context/ContextProvider";
import { InfiniteData, useQueryClient } from "react-query";
import { NotificationQueryKey } from "@/screens/notifications/NotificationScreen";
import { Liane, Notification, PaginatedResponse, TripStatus } from "@liane/common";
import { LianeDetailQueryKey, LianeQueryKey } from "@/screens/user/MyTripsScreen";
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

const updateNotificationPages = (old: InfiniteData<PaginatedResponse<Notification>>, n: Notification) => {
  if (old.pages.length === 0) {
    return { ...old, pages: [{ pageSize: 1, data: [n] }] };
  } else {
    old.pages[0].data.unshift(n);
    old.pages[0] = { ...old.pages[0], pageSize: old.pages[0].pageSize + 1 };
    return old;
  }
};

const readNotifications = (old: InfiniteData<PaginatedResponse<Notification>>, userId: string) => {
  return {
    ...old!,
    pages: old!.pages.map(p => ({
      ...p,
      data: p.data.map(item => {
        const userIndex = item.recipients.findIndex(r => r.user === userId);
        item.recipients[userIndex] = { ...item.recipients[userIndex], readAt: new Date().toISOString() };
        return item;
      })
    }))
  };
};

export const QueryUpdateProvider = (props: PropsWithChildren) => {
  const { services } = useContext(AppContext);
  const queryClient = useQueryClient();

  // Update liane local cache

  useSubscription<Liane>(
    services.realTimeHub.tripUpdates,
    liane => {
      queryClient.setQueryData<PaginatedResponse<Liane>>(LianeQueryKey, old => {
        if (!old) {
          return { pageSize: 1, data: [liane] };
        }
        return updateLianeList(old, liane);
      });
      queryClient.setQueryData<Liane>(LianeDetailQueryKey(liane.id!), _ => liane);
      if (liane.state !== "NotStarted") {
        // Cancel eventual reminder
        services.reminder.cancelReminder(liane.id!);
      }

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

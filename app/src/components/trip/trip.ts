import { LiveTripStatus, getLiveTripStatus, Trip, FullUser } from "@liane/common";
import { useContext, useEffect, useMemo, useState } from "react";
import { AppContext } from "@/components/context/ContextProvider";

export const useTripStatus = (trip?: Trip, user?: FullUser): LiveTripStatus | undefined => {
  const { user: currentUser } = useContext(AppContext);
  const userId = useMemo(() => user?.id ?? currentUser?.id, [user, currentUser]);

  if (!userId) {
    return undefined;
  }

  const [status, setStatus] = useState(trip ? getLiveTripStatus(trip, userId) : undefined);

  useEffect(() => {
    if (!trip) {
      return;
    }
    setStatus(getLiveTripStatus(trip, userId));
  }, [trip, userId]);

  useEffect(() => {
    if (trip && status?.nextUpdateMillis !== undefined) {
      const timeout = setTimeout(() => {
        setStatus(getLiveTripStatus(trip, userId));
      }, status.nextUpdateMillis);
      return () => clearTimeout(timeout);
    }
  }, [status?.nextUpdateMillis, trip, userId]);

  return status?.status;
};

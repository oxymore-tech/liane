import { FullUser, getLiveTripStatus, LiveTripStatus, LiveUpdateTripStatus, Trip } from "@liane/common";
import { useContext, useEffect, useMemo, useState } from "react";
import { AppContext } from "@/components/context/ContextProvider";

export const useTripStatus = (trip?: Trip, user?: FullUser): LiveTripStatus | undefined => {
  const { user: currentUser } = useContext(AppContext);

  const tripMember = useMemo(() => {
    const userId = user?.id ?? currentUser?.id;
    return trip?.members?.find(m => m.user.id === userId);
  }, [trip, user, currentUser]);

  const [status, setStatus] = useState<LiveUpdateTripStatus>();

  useEffect(() => {
    if (!trip) {
      return;
    }
    if (!tripMember) {
      return;
    }
    setStatus(getLiveTripStatus(trip, tripMember));
  }, [trip, tripMember]);

  useEffect(() => {
    if (trip && status?.nextUpdateMillis !== undefined) {
      const timeout = setTimeout(() => {
        if (!tripMember) {
          return;
        }
        setStatus(getLiveTripStatus(trip, tripMember));
      }, status.nextUpdateMillis);
      return () => clearTimeout(timeout);
    }
  }, [status?.nextUpdateMillis, trip, tripMember]);

  return status?.status;
};

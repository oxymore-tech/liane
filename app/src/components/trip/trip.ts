import { DetailedTripStatus, getTripStatus, Liane } from "@liane/common";
import { useContext, useEffect, useState } from "react";
import { AppContext } from "@/components/context/ContextProvider";

export const useTripStatus = (liane?: Liane): DetailedTripStatus | undefined => {
  const { user } = useContext(AppContext);
  const userId = user!.id!;

  const [status, setStatus] = useState(liane ? getTripStatus(liane, userId) : undefined);

  useEffect(() => {
    if (!liane) {
      return;
    }
    setStatus(getTripStatus(liane, userId));
  }, [liane, userId]);
  useEffect(() => {
    if (liane && status?.nextUpdateMillis !== undefined) {
      const timeout = setTimeout(() => {
        setStatus(getTripStatus(liane, userId));
      }, status.nextUpdateMillis);
      return () => clearTimeout(timeout);
    }
  }, [status?.nextUpdateMillis, liane, userId]);

  return status?.status;
};

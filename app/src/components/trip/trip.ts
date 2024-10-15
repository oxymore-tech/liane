import { LiveTripStatus, getLiveTripStatus, Liane } from "@liane/common";
import { useContext, useEffect, useState } from "react";
import { AppContext } from "@/components/context/ContextProvider";

export const useTripStatus = (liane?: Liane): LiveTripStatus | undefined => {
  const { user } = useContext(AppContext);
  const userId = user!.id!;

  const [status, setStatus] = useState(liane ? getLiveTripStatus(liane, userId) : undefined);

  useEffect(() => {
    if (!liane) {
      return;
    }
    setStatus(getLiveTripStatus(liane, userId));
  }, [liane, userId]);
  useEffect(() => {
    if (liane && status?.nextUpdateMillis !== undefined) {
      const timeout = setTimeout(() => {
        setStatus(getLiveTripStatus(liane, userId));
      }, status.nextUpdateMillis);
      return () => clearTimeout(timeout);
    }
  }, [status?.nextUpdateMillis, liane, userId]);

  return status?.status;
};

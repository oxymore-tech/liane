import React, { useContext } from "react";
import { Trip } from "@liane/common";
import { WayPointsView } from "@/components/trip/WayPointsView";
import { AppContext } from "@/components/context/ContextProvider";
import { getUserTrip } from "@/components/trip/trip";

export interface TripViewProps {
  trip: Trip;
}

export const TripView = ({ trip }: TripViewProps) => {
  const { user } = useContext(AppContext);
  return <WayPointsView {...getUserTrip(trip, user!.id!)} />;
};

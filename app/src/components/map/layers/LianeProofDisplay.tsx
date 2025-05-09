import { Trip, Ref } from "@liane/common";
import React, { useContext } from "react";
import { AppContext } from "@/components/context/ContextProvider";
import { useQuery } from "react-query";
import { AppColors } from "@/theme/colors";
import MapLibreGL, { ShapeSource } from "@maplibre/maplibre-react-native";

import CircleLayer = MapLibreGL.CircleLayer;

export const LianeProofDisplay = ({ id }: { id: Ref<Trip> }) => {
  const { services } = useContext(AppContext);
  const { data } = useQuery(["proof", id], () => {
    return services.trip.getProof(id);
  });
  return data ? (
    <ShapeSource id="proof_display" shape={data}>
      <CircleLayer id="proof_display" style={{ circleColor: AppColors.blue, circleRadius: 3 }} />
    </ShapeSource>
  ) : null;
};

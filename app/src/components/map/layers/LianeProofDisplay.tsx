import { Liane, Ref } from "@/api";
import React, { useContext } from "react";
import { AppContext } from "@/components/context/ContextProvider";
import { useQuery } from "react-query";
import { AppColors } from "@/theme/colors";
import MapLibreGL from "@maplibre/maplibre-react-native";
import ShapeSource = MapLibreGL.Animated.ShapeSource;

import CircleLayer = MapLibreGL.CircleLayer;

export const LianeProofDisplay = ({ id }: { id: Ref<Liane> }) => {
  const { services } = useContext(AppContext);
  const { data } = useQuery(["proof", id], () => {
    return services.liane.getProof(id);
  });
  return data ? (
    <ShapeSource id={"proof_display"} shape={data}>
      <CircleLayer
        id={"proof_display"}
        style={{
          circleColor: AppColors.blue,
          circleRadius: 3
        }}
      />
    </ShapeSource>
  ) : null;
};

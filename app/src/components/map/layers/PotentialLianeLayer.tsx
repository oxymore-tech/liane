import { RallyingPoint } from "@liane/common";
import React, { useContext } from "react";
import { AppContext } from "@/components/context/ContextProvider";
import { useQuery } from "react-query";
import { AppColorPalettes } from "@/theme/colors";
import MapLibreGL from "@maplibre/maplibre-react-native";
import ShapeSource = MapLibreGL.ShapeSource;
import LineLayer = MapLibreGL.LineLayer;

export const PotentialLianeLayer = ({ from, to }: { from: RallyingPoint; to: RallyingPoint }) => {
  const { services } = useContext(AppContext);
  const { data } = useQuery(["match", from.id!, to.id!, undefined], () => {
    return services.routing.getRoute([from.location, to.location]);
  });
  return data ? (
    <ShapeSource id={"potential_trip_source"} shape={data.geometry}>
      <LineLayer
        id={"potential_route_display"}
        style={{
          lineColor: AppColorPalettes.gray[400],
          lineWidth: 3
        }}
      />
    </ShapeSource>
  ) : null;
};

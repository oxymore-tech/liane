import { FeatureCollection } from "geojson";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import React from "react";

export const LianeShapeDisplayLayer = ({
  loading = false,
  tripDisplay,
  useWidth,
  tripId = null
}: {
  loading?: boolean;
  tripDisplay: FeatureCollection | undefined;
  useWidth?: number | undefined;
  tripId?: string | undefined | null;
}) => {
  const features = tripDisplay || {
    type: "FeatureCollection",
    features: []
  };
  return (
    <MapLibreGL.ShapeSource id="segments" shape={features}>
      <MapLibreGL.LineLayer
        aboveLayerID="Highway"
        id="tripLayer"
        /* @ts-ignore */
        filter={tripId ? ["in", tripId, ["get", "trips"]] : undefined}
        style={{
          lineColor: loading ? AppColorPalettes.gray[400] : AppColors.darkBlue,
          lineWidth: useWidth ? useWidth : ["step", ["length", ["get", "trips"]], 1, 2, 2, 3, 3, 4, 4, 5, 5]
        }}
      />
    </MapLibreGL.ShapeSource>
  );
};

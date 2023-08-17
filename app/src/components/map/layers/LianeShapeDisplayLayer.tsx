import { FeatureCollection } from "geojson";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import React from "react";

export const LianeShapeDisplayLayer = ({
  loading = false,
  lianeDisplay,
  useWidth,
  lianeId = null
}: {
  loading?: boolean;
  lianeDisplay: FeatureCollection | undefined;
  useWidth?: number | undefined;
  lianeId?: string | undefined | null;
}) => {
  const features = lianeDisplay || {
    type: "FeatureCollection",
    features: []
  };
  return (
    <MapLibreGL.ShapeSource id="segments" shape={features}>
      <MapLibreGL.LineLayer
        aboveLayerID="Highway"
        id="lianeLayer"
        /* @ts-ignore */
        filter={lianeId ? ["in", lianeId, ["get", "lianes"]] : undefined}
        style={{
          lineColor: loading ? AppColorPalettes.gray[400] : AppColors.darkBlue,
          lineWidth: useWidth ? useWidth : ["step", ["length", ["get", "lianes"]], 1, 2, 2, 3, 3, 4, 4, 5, 5]
        }}
      />
    </MapLibreGL.ShapeSource>
  );
};

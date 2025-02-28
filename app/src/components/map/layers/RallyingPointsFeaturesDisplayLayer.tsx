import { isFeatureCollection, RallyingPoint } from "@liane/common";
import { FeatureCollection } from "geojson";
import { ColorValue } from "react-native";
import { AppColors } from "@/theme/colors";
import React, { useMemo } from "react";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { useAppMapViewController } from "@/components/map/AppMapView";

export interface RallyingPointsDisplayLayerProps {
  rallyingPoints: RallyingPoint[] | FeatureCollection;
  onSelect?: (r?: RallyingPoint) => void;
  cluster?: boolean;
  interactive?: boolean;
  minZoomLevel?: number | undefined;
  color?: ColorValue;
  id?: string;
}

export const RallyingPointsFeaturesDisplayLayer = ({
  rallyingPoints,
  onSelect,
  cluster = true,
  interactive = true,
  id,
  color = AppColors.primaryColor,
  minZoomLevel
}: RallyingPointsDisplayLayerProps) => {
  const feature: FeatureCollection = useMemo(() => {
    if (isFeatureCollection(rallyingPoints)) {
      return {
        type: "FeatureCollection",
        features: rallyingPoints.features.filter(f => f.geometry.type === "Point")
      };
    }
    return {
      type: "FeatureCollection",
      features: rallyingPoints.map(rp => {
        return {
          type: "Feature",
          properties: rp,
          geometry: {
            type: "Point",
            coordinates: [rp.location.lng, rp.location.lat]
          }
        };
      })
    };
  }, [rallyingPoints]);
  const controller = useAppMapViewController();

  // @ts-ignore
  const mainColor: string = color;
  return (
    <MapLibreGL.ShapeSource
      id={"points_" + (id || "")}
      shape={feature}
      cluster={cluster}
      clusterMaxZoomLevel={10}
      clusterRadius={35}
      onPress={
        interactive
          ? async f => {
              //console.debug("clc", f, f.features[0]!.properties);
              const rp = f.features[0]!.properties!.point_count ? undefined : f.features[0]!.properties!;

              const center = rp ? rp.location : { lat: f.coordinates.latitude, lng: f.coordinates.longitude };
              const zoom = await controller.getZoom()!;

              let newZoom;
              if (zoom < 10.5) {
                newZoom = rp ? 12.1 : zoom + 1.5;
              } else if (zoom < 12) {
                newZoom = 12.1;
              } else {
                newZoom = zoom + 1;
              }
              controller.setCenter(center, newZoom);

              if (onSelect) {
                /* @ts-ignore */
                onSelect(zoom >= 10.5 ? rp : undefined);
              }
            }
          : undefined
      }>
      <MapLibreGL.CircleLayer
        minZoomLevel={minZoomLevel}
        id={"rp_circles_clustered" + (id || "")}
        filter={["has", "point_count"]}
        style={{
          circleColor: mainColor,
          circleRadius: ["step", ["get", "point_count"], 14, 3, 16, 10, 18],
          circleStrokeColor: AppColors.white,
          circleStrokeWidth: 1
        }}
      />
      <MapLibreGL.SymbolLayer
        minZoomLevel={minZoomLevel}
        id={"rp_symbols_clustered" + (id || "")}
        filter={["has", "point_count"]}
        style={{
          textFont: ["Open Sans Regular", "Noto Sans Regular"],
          textSize: 12,
          textColor: AppColors.white,
          textHaloWidth: 1.2,
          textAllowOverlap: true,
          textField: "{point_count}",
          visibility: "visible"
        }}
      />
      <MapLibreGL.CircleLayer
        minZoomLevel={minZoomLevel}
        id={"rp_circles" + (id || "")}
        filter={["!", ["has", "point_count"]]}
        style={{
          circleColor: ["step", ["zoom"], mainColor, 12, mainColor],
          circleRadius: ["step", ["zoom"], 5, 12, 10],
          circleStrokeColor: AppColors.white,
          circleStrokeWidth: ["step", ["zoom"], 1, 12, 2]
        }}
      />

      <MapLibreGL.SymbolLayer
        id={"rp_labels" + (id || "")}
        filter={["!", ["has", "point_count"]]}
        minZoomLevel={minZoomLevel ? Math.max(12, minZoomLevel) : 12}
        style={{
          textFont: ["Open Sans Regular", "Noto Sans Regular"],
          textSize: 12,
          textColor: mainColor,
          textHaloColor: "#fff",
          textHaloWidth: 1.2,
          textField: "{label}",
          textAllowOverlap: false,
          textAnchor: "bottom",
          textOffset: [0, -1.2],
          textMaxWidth: 5.4,
          visibility: "visible"
        }}
      />
    </MapLibreGL.ShapeSource>
  );
};

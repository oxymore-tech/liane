import { RallyingPoint, Ref } from "@liane/common";
import React from "react";
import { AppColors } from "@/theme/colors";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { Feature, Point } from "geojson";
import { useAppMapViewController } from "@/components/map/AppMapView";
import { RNAppEnv } from "@/api/env";

export type RallyingPointsDisplayLayerProps = { onSelect?: (rp: RallyingPoint) => void; selected?: Ref<RallyingPoint> | undefined };

export const RallyingPointsDisplayLayer = ({ selected, onSelect }: RallyingPointsDisplayLayerProps) => {
  const controller = useAppMapViewController();

  return (
    <MapLibreGL.VectorSource
      id={"all_rallying_points"}
      url={RNAppEnv.rallyingPointsTilesUrl}
      maxZoomLevel={14}
      hitbox={{ width: 32, height: 32 }}
      onPress={
        onSelect
          ? async f => {
              // @ts-ignore
              const points: Feature<Point>[] = f.features.filter(feat => feat.geometry?.type === "Point");

              const center = { lat: f.coordinates.latitude, lng: f.coordinates.longitude };
              if (points.length === 1) {
                const p = points[0];

                if (!p.properties?.point_count) {
                  //@ts-ignore
                  onSelect({ ...p.properties, location: { lat: p.geometry.coordinates[1], lng: p.geometry.coordinates[0] } });
                  await controller.setCenter(center);
                  return;
                }
              }

              const zoom = await controller.getZoom()!;

              let newZoom;
              if (zoom < 10.5) {
                newZoom = 12.1; //rp ? 12.1 : zoom + 1.5;
              } else if (zoom < 12) {
                newZoom = 12.1;
              } else {
                newZoom = zoom + 1;
              }
              await controller.setCenter(center, newZoom);
            }
          : undefined
      }>
      <MapLibreGL.SymbolLayer
        id="rp_symbols"
        sourceLayerID={"rallying_point_display"}
        filter={["!", ["has", "point_count"]]}
        style={{
          textFont: ["Open Sans Regular", "Noto Sans Regular"],
          textSize: 14,
          textColor: ["case", ["==", ["get", "id"], selected ?? "XXXXXXXXX"], AppColors.primaryColor, AppColors.black],
          textHaloColor: AppColors.white,
          textHaloWidth: 1,
          textField: ["get", "label"],
          textAllowOverlap: false,
          iconAllowOverlap: true,
          textAnchor: "bottom",
          textOffset: [0, -3.4],
          textMaxWidth: 5.4,
          visibility: "visible",
          textOptional: true,
          iconOptional: false,
          iconImage: "deposit",
          iconAnchor: "bottom",
          iconSize: ["step", ["zoom"], 0.32, 12, 0.4]
        }}
      />

      <MapLibreGL.SymbolLayer
        id="rp_clusters"
        sourceLayerID={"rallying_point_display"}
        filter={["has", "point_count"]}
        style={{
          textFont: ["Open Sans Regular", "Noto Sans Regular"],
          textSize: 18,
          textColor: AppColors.white,
          textHaloWidth: 0.2,
          textField: ["get", "point_count"],
          textAllowOverlap: false,
          iconAllowOverlap: true,
          textMaxWidth: 5.4,
          textOptional: true,
          visibility: "visible",
          iconImage: "deposit_cluster",
          iconAnchor: "center",
          iconSize: ["step", ["zoom"], 0.5, 12, 0.4]
        }}
      />
    </MapLibreGL.VectorSource>
  );
};

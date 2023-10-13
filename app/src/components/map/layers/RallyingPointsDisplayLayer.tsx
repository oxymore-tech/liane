import { RallyingPoint, Ref } from "@liane/common";
import React from "react";
import { AppColors, AppColorPalettes } from "@/theme/colors";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { Feature, Point } from "geojson";
import { useAppMapViewController } from "@/components/map/AppMapView";
import { AppEnv } from "@/api/env";

export const RallyingPointsDisplayLayer = ({ onSelect }: { onSelect?: (rp: RallyingPoint) => void; selected?: Ref<RallyingPoint> | undefined }) => {
  const controller = useAppMapViewController();
  const url = AppEnv.tilesUrl + "/rallying_point_display";
  return (
    <MapLibreGL.VectorSource
      id={"all_rallying_points"}
      url={url}
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

                //@ts-ignore
                onSelect({ ...p!.properties!, location: { lat: p.geometry.coordinates[1], lng: p.geometry.coordinates[0] } });
              } else if (points.length > 0) {
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
            }
          : undefined
      }>
      <MapLibreGL.SymbolLayer
        id="rp_symbols"
        sourceLayerID={"rallying_point_display"}
        minZoomLevel={10.5}
        style={{
          textFont: ["Open Sans Regular", "Noto Sans Regular"],
          textSize: 12,
          textColor: AppColors.black,
          textHaloColor: AppColors.white,
          textHaloWidth: 1.5,
          textField: ["step", ["zoom"], "", 12, ["get", "label"]],
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
      <MapLibreGL.CircleLayer
        id="rp_symbols_small"
        sourceLayerID={"rallying_point_display"}
        minZoomLevel={5}
        maxZoomLevel={10.5}
        style={{
          circleColor: AppColorPalettes.pink[500],
          circleRadius: 4,
          circleStrokeColor: AppColors.white,
          circleStrokeWidth: 1,
          visibility: "visible"
        }}
      />
    </MapLibreGL.VectorSource>
  );
};

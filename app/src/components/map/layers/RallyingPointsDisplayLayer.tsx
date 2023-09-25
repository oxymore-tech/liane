import { RallyingPoint, Ref } from "@/api";
import React from "react";
import { TilesUrl } from "@/api/http";
import { AppColors } from "@/theme/colors";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { Feature, Point } from "geojson";
import { useAppMapViewController } from "@/components/map/AppMapView";

export const RallyingPointsDisplayLayer = ({
  type,
  onSelect
}: {
  onSelect?: (rp: RallyingPoint) => void;
  selected?: Ref<RallyingPoint> | undefined;
  type?: "from" | "to" | undefined;
}) => {
  const controller = useAppMapViewController();
  const url = TilesUrl + "/rallying_point_display";
  const color = type ? AppColors.primaryColor : AppColors.black;
  const image = type ? (type === "from" ? "pickup" : "deposit") : "rp";
  return (
    <MapLibreGL.VectorSource
      id={"all_rallying_points"}
      url={url}
      maxZoomLevel={14}
      hitbox={{ width: 64, height: 64 }}
      onPress={
        onSelect
          ? async f => {
              console.debug(JSON.stringify(f));
              // @ts-ignore
              const points: Feature<Point>[] = f.features.filter(feat => feat.geometry?.type === "Point");

              const center = { lat: f.coordinates.latitude, lng: f.coordinates.longitude };
              if (points.length === 1) {
                const p = points[0];
                console.debug("clc", p);

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
                  newZoom = undefined;
                }
                await controller.setCenter(center, newZoom);
              }
            }
          : undefined
      }>
      <MapLibreGL.SymbolLayer
        id="rp_symbols"
        sourceLayerID={"rallying_point_display"}
        minZoomLevel={7}
        style={{
          textFont: ["Open Sans Regular", "Noto Sans Regular"],
          textSize: 12,
          textColor: color,
          textHaloColor: "#fff",
          textHaloWidth: 1.2,
          textField: ["step", ["zoom"], "", 12, ["get", "label"]],
          textAllowOverlap: false,
          textAnchor: "bottom",
          textOffset: [0, -3.4],
          textMaxWidth: 5.4,
          visibility: "visible",
          textOptional: true,
          iconImage: image,
          iconAnchor: "bottom",
          iconSize: ["step", ["zoom"], 0.32, 12, 0.4]
        }}
      />
    </MapLibreGL.VectorSource>
  );
};

import { RallyingPoint, Ref } from "@/api";
import React, { useEffect, useState } from "react";
import { useAppMapViewController } from "@/components/map/AppMapView";
import { TilesUrl } from "@/api/http";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { Feature, Point } from "geojson";
import { AppColors } from "@/theme/colors";
import { getDateParams } from "@/components/map/layers/LianeDisplayLayer";
import { AppLogger } from "@/api/logger";

export type PickupDestinationsDisplayLayerProps = {
  date?: Date;
  onSelect?: (rp: RallyingPoint) => void;
  point: Ref<RallyingPoint>;
  type: "pickup" | "deposit";
};

export const PickupDestinationsDisplayLayer = ({ date = new Date(), onSelect, point, type }: PickupDestinationsDisplayLayerProps) => {
  const dateArg = getDateParams(date);
  const [sourceId, setSourceId] = useState("");
  useEffect(() => {
    setSourceId("segmentsFiltered" + dateArg + point + type);
    AppLogger.debug("MAP", "tile source", dateArg, type, point);
  }, [dateArg, point, type]);

  const controller = useAppMapViewController();
  const url = TilesUrl + "/liane_display_filter_test?" + dateArg + `&${type}=` + point;

  const updateIdentifier = Math.floor(new Date().getTime() / 1000 / 3600); // update map every hour
  return (
    <MapLibreGL.VectorSource
      id={"segmentsFiltered" + ":" + updateIdentifier}
      url={url}
      key={sourceId}
      maxZoomLevel={14}
      hitbox={{ width: 64, height: 64 }}
      onPress={
        onSelect
          ? async f => {
              // @ts-ignore
              const points: Feature<Point>[] = f.features.filter(feat => feat.geometry?.type === "Point");

              const center = { lat: f.coordinates.latitude, lng: f.coordinates.longitude };
              if (points.length === 1 && !!points[0].properties!.id) {
                const p = points[0];
                AppLogger.info("MAP", "selected point", p);

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
      <MapLibreGL.LineLayer
        aboveLayerID="Highway"
        id="lianeLayerFiltered"
        sourceLayerID="liane_display"
        style={{
          //@ts-ignore
          lineSortKey: ["get", "count"],
          lineCap: "round",
          lineColor: AppColors.darkBlue,
          lineWidth: 3
        }}
      />

      <MapLibreGL.SymbolLayer
        id="rp_symbols"
        sourceLayerID={"rallying_point_display"}
        filter={["all", ["!=", ["get", "id"], point], ["!", ["has", "point_count"]]]}
        style={{
          symbolSortKey: ["case", ["==", ["get", "point_type"], "suggestion"], 0, 1],
          textFont: ["Source Sans Regular", "Noto Sans Regular"],
          textSize: 12,
          textColor: AppColors.black,
          textHaloColor: AppColors.white,
          textHaloWidth: 1.5,
          textField: ["step", ["zoom"], "", 8, ["get", "label"]],
          textAllowOverlap: false,
          textAnchor: "bottom",
          textOffset: [0, -3],
          textMaxWidth: 5.4,
          visibility: "visible",
          textOptional: true,
          iconImage: ["case", ["==", ["get", "point_type"], "suggestion"], "deposit", "rp"],
          iconAnchor: "bottom",
          iconSize: ["step", ["zoom"], 0.25, 8, 0.3]
        }}
      />

      <MapLibreGL.SymbolLayer
        id="rp_symbols_clustered"
        sourceLayerID={"rallying_point_display"}
        filter={["has", "point_count"]}
        style={{
          textFont: ["Open Sans Regular", "Noto Sans Regular"],
          textSize: 14,
          textColor: "#fff",
          textHaloColor: "#fff",
          textHaloBlur: 0,
          textHaloWidth: 0.4,
          textField: ["get", "point_count"],
          textAnchor: "bottom",
          textOffset: [0, -0.75],
          textMaxWidth: 5.4,
          visibility: "visible",
          textOptional: false,
          iconImage: "deposit_cluster",
          iconAnchor: "bottom",
          iconSize: ["step", ["zoom"], 0.32, 12, 0.4]
        }}
      />
    </MapLibreGL.VectorSource>
  );
};
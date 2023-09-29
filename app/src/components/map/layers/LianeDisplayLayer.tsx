import { RallyingPoint } from "@/api";
import React, { useEffect, useState } from "react";
import { TilesUrl } from "@/api/http";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { Feature, Point } from "geojson";
import { AppColors } from "@/theme/colors";
import { useAppMapViewController } from "@/components/map/AppMapView";
import { AppLogger } from "@/api/logger";

export const getDateParams = (date: Date) =>
  "offset=" +
  date.getTimezoneOffset() +
  "&day=" +
  date.getFullYear() +
  "-" +
  (1 + date.getMonth()).toString().padStart(2, "0") +
  "-" +
  date.getDate().toString().padStart(2, "0");

export const LianeDisplayLayer = ({
  date = new Date(),
  onSelect,
  trafficAsColor = true,
  trafficAsWidth = true
}: {
  date?: Date;
  onSelect?: (
    rp: RallyingPoint & {
      point_type: string;
    }
  ) => void;
  trafficAsWidth?: boolean;
  trafficAsColor?: boolean;
}) => {
  const dateArg = getDateParams(date);
  const [sourceId, setSourceId] = useState("");
  useEffect(() => {
    setSourceId("segments" + dateArg);
    AppLogger.debug("MAP", "tile source", dateArg);
  }, [dateArg]);

  const controller = useAppMapViewController();
  const url = TilesUrl + "/liane_display?" + dateArg;

  const updateIdentifier = Math.floor(new Date().getTime() / 1000 / 3600); // update map every hour

  return (
    <MapLibreGL.VectorSource
      id={"segments" + ":" + updateIdentifier}
      url={url}
      key={sourceId}
      maxZoomLevel={14}
      hitbox={{ width: 64, height: 64 }}
      onPress={
        onSelect
          ? async f => {
              // console.debug(JSON.stringify(f));
              // @ts-ignore
              const points: Feature<Point>[] = f.features.filter(feat => feat.geometry?.type === "Point");

              const center = { lat: f.coordinates.latitude, lng: f.coordinates.longitude };
              if (points.length === 1) {
                const p = points[0];
                AppLogger.debug("MAP", "selected point", p);

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
        id="lianeLayer"
        sourceLayerID="liane_display"
        style={{
          //@ts-ignore
          lineSortKey: ["get", "count"],
          lineCap: "round",
          lineColor: trafficAsColor
            ? ["interpolate", ["linear"], ["get", "count"], 1, "#46516e", 2, AppColors.primaryColor, 5, "#8c2372"]
            : AppColors.primaryColor,
          lineWidth: trafficAsWidth ? ["step", ["get", "count"], 1, 2, 2, 3, 3, 4, 4, 5, 5] : 3
        }}
      />

      <MapLibreGL.SymbolLayer
        id="rp_symbols"
        sourceLayerID={"rallying_point_display"}
        minZoomLevel={7}
        style={{
          symbolSortKey: ["case", ["==", ["get", "point_type"], "pickup"], 0, 1],
          textFont: ["Open Sans Regular", "Noto Sans Regular"],
          textSize: 12,
          textColor: [
            "case",
            ["==", ["get", "point_type"], "pickup"],
            AppColors.primaryColor,
            ["==", ["get", "point_type"], "suggestion"],
            AppColors.primaryColor,
            // "#9f4a2f",
            "#000"
          ],
          textHaloColor: "#fff",
          textHaloWidth: 1.2,
          textField: ["step", ["zoom"], "", 12, ["get", "label"]],
          textAllowOverlap: false,
          textAnchor: "bottom",
          textOffset: [0, -3.4],
          textMaxWidth: 5.4,
          textOptional: true,
          visibility: "visible",
          iconImage: ["case", ["==", ["get", "point_type"], "pickup"], "pickup", ["==", ["get", "point_type"], "suggestion"], "pickup", "rp"],
          iconAnchor: "bottom",
          iconSize: ["step", ["zoom"], 0.32, 12, 0.4]
        }}
      />
    </MapLibreGL.VectorSource>
  );
};

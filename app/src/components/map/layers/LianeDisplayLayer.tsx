import { AppEnv, DayOfWeekFlag, RallyingPoint } from "@liane/common";
import React, { useEffect, useMemo, useState } from "react";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { Feature, Point } from "geojson";
import { AppColors } from "@/theme/colors";
import { useAppMapViewController } from "@/components/map/AppMapView";
import { AppLogger } from "@/api/logger";
import { RNAppEnv } from "@/api/env";

export const LianeDisplayLayer = ({
  weekDays,
  onSelect
}: {
  weekDays?: DayOfWeekFlag;
  onSelect?: (
    rp: RallyingPoint & {
      point_type: string;
    }
  ) => void;
}) => {
  const params = useMemo(() => AppEnv.getLianeDisplayParams(weekDays), [weekDays]);
  const [sourceId, setSourceId] = useState("");
  useEffect(() => {
    setSourceId("segments" + params);
    AppLogger.debug("MAP", "tile source", params);
  }, [params]);

  const controller = useAppMapViewController();
  const url = RNAppEnv.lianeTilesUrl + "?" + params;

  const updateIdentifier = Math.floor(new Date().getTime() / 1000 / 3600); // update map every hour

  return (
    <MapLibreGL.VectorSource
      id={"segments" + ":" + updateIdentifier}
      url={url}
      key={sourceId}
      maxZoomLevel={14}
      hitbox={{ width: 40, height: 40 }}
      onPress={
        onSelect
          ? async f => {
              // console.debug(JSON.stringify(f));
              // @ts-ignore
              const points: Feature<Point>[] = f.features.filter(feat => feat.geometry?.type === "Point");

              const center = { lat: f.coordinates.latitude, lng: f.coordinates.longitude };
              if (points.length === 1 && !points[0].properties!.hasOwnProperty("point_count")) {
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
                  newZoom = zoom + 1;
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
          lineColor: AppColors.blue,
          lineWidth: 3
        }}
      />
      <MapLibreGL.SymbolLayer
        id="rp_symbols"
        sourceLayerID={"rallying_point_display"}
        minZoomLevel={7}
        style={{
          symbolSortKey: ["case", ["==", ["get", "point_type"], "deposit"], 0, ["==", ["get", "point_type"], "suggestion"], 1, 2],
          textFont: ["Open Sans Regular", "Noto Sans Regular"],
          textSize: 12,
          textColor: AppColors.black,
          textHaloColor: AppColors.white,
          textHaloWidth: 1.5,
          textField: ["step", ["zoom"], "", 8, ["get", "label"]],
          textAllowOverlap: false,
          iconAllowOverlap: true,
          textAnchor: "bottom",
          textOffset: [0, -3],
          textMaxWidth: 5.4,
          textOptional: true,
          iconOptional: false,
          visibility: "visible",
          iconImage: ["case", ["==", ["get", "point_type"], "deposit"], "deposit", ["==", ["get", "point_type"], "suggestion"], "deposit", "rp"],
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
          iconAllowOverlap: true,
          textField: ["get", "point_count"],
          textAnchor: "bottom",
          textOffset: [0, -0.75],
          textMaxWidth: 5.4,
          visibility: "visible",
          textOptional: false,
          iconOptional: false,
          iconImage: "deposit_cluster",
          iconAnchor: "bottom",
          iconSize: ["step", ["zoom"], 0.32, 12, 0.4]
        }}
      />
    </MapLibreGL.VectorSource>
  );
};

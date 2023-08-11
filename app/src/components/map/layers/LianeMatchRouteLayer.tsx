import { Exact, getPoint, LianeMatch, RallyingPoint, UnionUtils } from "@/api";
import { FeatureCollection, GeoJSON } from "geojson";
import React, { useContext, useMemo } from "react";
import { AppContext } from "@/components/context/ContextProvider";
import { getTripMatch } from "@/components/trip/trip";
import { useQuery } from "react-query";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import MapLibreGL from "@maplibre/maplibre-react-native";
import ShapeSource = MapLibreGL.ShapeSource;
import LineLayer = MapLibreGL.LineLayer;
import { LianeShapeDisplayLayer } from "@/components/map/layers/LianeShapeDisplayLayer";

export const LianeMatchRouteLayer = (props: { match: LianeMatch; to?: RallyingPoint; from?: RallyingPoint; loadingFeatures?: FeatureCollection }) => {
  const { services } = useContext(AppContext);
  const match = props.match;
  const fromPoint = getPoint(match, "pickup");
  const toPoint = getPoint(match, "deposit");
  const to = props.to || toPoint;
  const from = props.from || fromPoint;
  const isSamePickup = !from || from.id === fromPoint.id;
  const isSameDeposit = !to || to.id === toPoint.id;

  const wayPoints = useMemo(() => {
    const isCompatibleMatch = !UnionUtils.isInstanceOf<Exact>(match.match, "Exact");
    const trip = getTripMatch(
      toPoint,
      fromPoint,
      match.liane.wayPoints,
      match.liane.departureTime,
      isCompatibleMatch ? match.match.wayPoints : match.liane.wayPoints
    );
    return trip.wayPoints; //.slice(trip.departureIndex, trip.arrivalIndex + 1);
  }, [fromPoint, match, toPoint]);

  console.log(to, from, wayPoints);
  const { data, isLoading } = useQuery(["match", from?.id, to?.id!, match.liane.id!], () => {
    const wp = [...(isSamePickup ? [] : [from!.location]), ...wayPoints.map(w => w.rallyingPoint.location), ...(isSameDeposit ? [] : [to!.location])];

    return services.routing.getRoute(wp);
  });

  const mapFeatures: GeoJSON.FeatureCollection | undefined = useMemo(() => {
    if (!data || data.geometry.coordinates.length === 0) {
      return undefined;
    }

    const features: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: data.geometry.coordinates.map((line, i): GeoJSON.Feature => {
        return {
          type: "Feature",
          properties: {
            isWalk: (!isSamePickup && i === 0) || (!isSameDeposit && i === data.geometry.coordinates.length - 1)
          },
          geometry: {
            type: "LineString",
            coordinates: line
          }
        };
      })
    };

    return features;
  }, [data, isSameDeposit, isSamePickup]);

  if (!mapFeatures || isLoading) {
    return <LianeShapeDisplayLayer lianeDisplay={props.loadingFeatures} loading={true} useWidth={3} />;
  }

  return (
    <ShapeSource id={"match_trip_source"} shape={mapFeatures}>
      <LineLayer
        id={"match_route_display"}
        filter={["!", ["get", "isWalk"]]}
        style={{
          lineColor: AppColors.darkBlue,
          lineWidth: 3
        }}
      />
      <LineLayer
        id={"match_remainder_display"}
        filter={["get", "isWalk"]}
        style={{
          lineColor: AppColorPalettes.gray[800],
          lineWidth: 3,
          lineCap: "round",
          lineDasharray: [0, 2]
        }}
      />
    </ShapeSource>
  );
};

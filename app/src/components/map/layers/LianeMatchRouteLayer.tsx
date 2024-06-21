import { getPoint, getTripFromMatch, getTripMatch, LianeMatch, RallyingPoint, WayPoint } from "@liane/common";
import { FeatureCollection } from "geojson";
import React, { useContext, useMemo } from "react";
import { AppContext } from "@/components/context/ContextProvider";
import { useQuery } from "react-query";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import MapLibreGL, { LineLayerStyle } from "@maplibre/maplibre-react-native";
import { LianeShapeDisplayLayer } from "@/components/map/layers/LianeShapeDisplayLayer";
import { StyleProp } from "react-native";
import ShapeSource = MapLibreGL.ShapeSource;
import LineLayer = MapLibreGL.LineLayer;

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
    const trip = getTripMatch(
      toPoint,
      fromPoint,
      match.trip.wayPoints,
      match.trip.departureTime,
      match.match.type === "Compatible" ? match.match.wayPoints : match.trip.wayPoints
    );
    return trip.wayPoints; //.slice(trip.departureIndex, trip.arrivalIndex + 1);
  }, [fromPoint, match, toPoint]);

  const { data, isLoading } = useQuery(["match", from?.id, to?.id!, match.trip.id!], () => {
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

export const RouteLayer = ({
  wayPoints,
  id,
  loadingFeatures,
  style
}: {
  wayPoints: WayPoint[];
  id?: string;
  loadingFeatures?: FeatureCollection;
  style?: StyleProp<LineLayerStyle>;
}) => {
  const { services } = useContext(AppContext);
  const { data, isLoading } = useQuery(["match", wayPoints[0].rallyingPoint.id, wayPoints[wayPoints.length - 1].rallyingPoint.id], () => {
    const wp = wayPoints.map(w => w.rallyingPoint.location);

    return services.routing.getRoute(wp);
  });
  const mapFeatures: GeoJSON.FeatureCollection | undefined = useMemo(() => {
    if (!data || data.geometry.coordinates.length === 0) {
      return undefined;
    }

    const features: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: data.geometry.coordinates.map((line): GeoJSON.Feature => {
        return {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: line
          }
        };
      })
    };

    return features;
  }, [data]);

  if (!mapFeatures || isLoading) {
    return <LianeShapeDisplayLayer lianeDisplay={loadingFeatures} loading={true} useWidth={3} />;
  }

  const argStyle = (style ?? {}) as object; // MapLibre doesn't support passing an array of style objects
  return (
    <ShapeSource id={"match_trip_source"} shape={mapFeatures}>
      <LineLayer
        aboveLayerID="Highway"
        id={"match_route_display" + (id ? "_" + id : "")}
        style={{
          lineColor: AppColors.darkBlue,
          lineWidth: 3,
          ...argStyle
        }}
      />
    </ShapeSource>
  );
};
export const LianeMatchUserRouteLayer = ({ loadingFeatures, match }: { loadingFeatures?: FeatureCollection; match: LianeMatch }) => {
  const { wayPoints } = useMemo(() => getTripFromMatch(match), [match]);
  return <RouteLayer wayPoints={wayPoints} loadingFeatures={loadingFeatures} id={match.trip.id} />;
};

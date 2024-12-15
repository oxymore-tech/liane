import { getTripFromMatch, LianeMatch, RallyingPoint, WayPoint } from "@liane/common";
import { FeatureCollection } from "geojson";
import React, { useContext, useMemo } from "react";
import { AppContext } from "@/components/context/ContextProvider";
import { useQuery } from "react-query";
import { AppColors } from "@/theme/colors";
import MapLibreGL, { LineLayerStyle } from "@maplibre/maplibre-react-native";
import { LianeShapeDisplayLayer } from "@/components/map/layers/LianeShapeDisplayLayer";
import { StyleProp } from "react-native";
import ShapeSource = MapLibreGL.ShapeSource;
import LineLayer = MapLibreGL.LineLayer;

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
  const mapFeatures: GeoJSON.FeatureCollection = useMemo(() => {
    if (!data || data.geometry.coordinates.length === 0) {
      return {
        type: "FeatureCollection",
        features: []
      };
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
    <ShapeSource id="match_trip_source" shape={mapFeatures}>
      <LineLayer
        aboveLayerID="Highway"
        id={"match_route_display" + (id ? "_" + id : "")}
        style={{
          lineColor: AppColors.secondaryColor,
          lineWidth: 3,
          ...argStyle
        }}
      />
    </ShapeSource>
  );
};

export const RouteLianeLayer = ({
  wayPoints,
  id,
  style,
  color
}: {
  wayPoints: RallyingPoint[];
  id?: string;
  loadingFeatures?: FeatureCollection;
  style?: StyleProp<LineLayerStyle>;
  color?: AppColors;
}) => {
  const { services } = useContext(AppContext);
  const { data } = useQuery(["match", wayPoints[0].id, wayPoints[wayPoints.length - 1].id], () => {
    const wp = wayPoints.map(w => w.location);
    return services.routing.getRoute(wp);
  });
  const mapFeatures: GeoJSON.FeatureCollection = useMemo(() => {
    if (!data || data.geometry.coordinates.length === 0) {
      return {
        type: "FeatureCollection",
        features: []
      };
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

  const argStyle = (style ?? {}) as object; // MapLibre doesn't support passing an array of style objects
  return (
    <ShapeSource id="match_trip_source" shape={mapFeatures}>
      <LineLayer
        aboveLayerID="Highway"
        id={"match_route_display" + (id ? "_" + id : "")}
        style={{
          lineColor: color ?? AppColors.blue,
          lineWidth: 6,
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

export const LianeMatchLianeRouteLayer = ({
  loadingFeatures,
  wayPoints,
  lianeId,
  color
}: {
  loadingFeatures?: FeatureCollection;
  wayPoints: RallyingPoint[];
  lianeId: string;
  color?: AppColors;
}) => {
  if (wayPoints.length === 0) {
    return null;
  }

  return <RouteLianeLayer wayPoints={wayPoints} loadingFeatures={loadingFeatures} id={lianeId} color={color} />;
};

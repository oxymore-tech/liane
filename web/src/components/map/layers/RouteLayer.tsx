import { RallyingPoint } from "@liane/common";
import { useAppServices } from "@/components/ContextProvider";
import { useQuery } from "@tanstack/react-query";
import React, { useMemo } from "react";
import { FeatureCollection } from "geojson";
import { Layer, Source } from "react-map-gl/maplibre";
import { EmptyFeatureCollection } from "@liane/common/src";

export const getRouteId = (points: RallyingPoint[]) => {
  return "route_" + points.map(p => p.id!).join("_");
};

export const useRoute = (points: RallyingPoint[]) => {
  const services = useAppServices()!;
  const id = getRouteId(points);
  const { data: route } = useQuery({
    queryKey: [id],
    queryFn: () => {
      return services.routing.getRoute(points.map(p => p.location));
    }
  });

  const features = useMemo(() => {
    if (!route) {
      return EmptyFeatureCollection;
    }

    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          ...route
        }
      ]
    } as FeatureCollection;
  }, [route]);

  return { id, features };
};

export function RouteLayer({ id, features }: { id: string; features: FeatureCollection }) {
  return (
    <>
      <Source id={id} type="geojson" data={features} />
      <Layer id={id} source={id} type="line" paint={{ "line-color": "#0B79F9", "line-width": 3 }} />
    </>
  );
}

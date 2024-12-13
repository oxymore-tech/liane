import { RallyingPoint } from "@liane/common";
import { useMapContext } from "@/components/map/Map";
import { useAppServices } from "@/components/ContextProvider";
import { useQuery } from "@tanstack/react-query";
import React, { useMemo } from "react";
import { GeojsonSource } from "@/components/map/GeojsonSource";
import { FeatureCollection } from "geojson";
import { useLayer } from "@/components/map/layers/base/abstractLayer";

export const getRouteId = (points: RallyingPoint[]) => {
  return "route_" + points.map(p => p.id!).join("_");
};
export function RouteLayer({ points }: { points: RallyingPoint[] }) {
  const map = useMapContext();
  const services = useAppServices()!;
  const id = getRouteId(points);
  const { data: route } = useQuery({
    queryKey: [id],
    queryFn: () => {
      return services.routing.getRoute(points.map(p => p.location));
    }
  });
  const mapFeatures = useMemo(() => {
    if (!route) {
      return null;
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

  return mapFeatures ? <InnerComponent features={mapFeatures} id={id} /> : null;
}

const InnerComponent = ({ features, id }: { features: FeatureCollection; id: string }) => {
  useLayer(
    {
      id,
      source: id,
      props: {
        paint: {
          "line-color": "#131870",
          "line-width": 3
        }
      }
    },
    "line"
  );
  return <GeojsonSource id={id} data={features} />;
};

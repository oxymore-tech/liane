import { RallyingPoint } from "@liane/common";
import { useMapContext } from "@/components/map/Map";
import { useAppServices } from "@/components/ContextProvider";
import { useQuery } from "react-query";
import React, { useEffect, useMemo } from "react";

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
    };
  }, [route]);

  useEffect(() => {
    const mmap = map.current;
    mmap?.once("load", () => {
      if (!mmap || !mapFeatures || mmap?.getSource(id)) {
        return;
      }
      mmap?.addSource(id, {
        type: "geojson",
        data: mapFeatures
      });
      mmap?.addLayer({
        id,
        source: id,
        type: "line",
        paint: {
          "line-color": "#131870",
          "line-width": 3
        }
      });
      return () => {
        if (!mmap.loaded()) return;
        mmap?.removeLayer(id);
        mmap?.removeSource(id);
      };
    });
  }, [map, id, mapFeatures]);
  return <></>;
}

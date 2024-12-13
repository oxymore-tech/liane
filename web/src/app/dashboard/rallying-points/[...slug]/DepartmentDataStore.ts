import { useAppServices } from "@/components/ContextProvider";
import { useEffect, useState } from "react";
import { Feature, FeatureCollection, Point, Polygon } from "geojson";
import { circle, difference, union } from "@turf/turf";
import { featureCollection } from "@turf/helpers";
import { polygonToLine } from "@turf/polygon-to-line";
import { departements, OsmService } from "@/api/osm";
import { EmptyFeatureCollection } from "@liane/common";
import clustersDbscan from "@turf/clusters-dbscan";
import { clusterEach } from "@turf/clusters";
import distance from "@turf/distance";
import { useQueries } from "@tanstack/react-query";

export const useDepartmentData = (department: string) => {
  const { osm, rallyingPoint } = useAppServices();
  const results = useQueries({
    queries: [
      getDepartmentBoundaryQuery(department, osm),
      {
        queryKey: ["rallying_point", department],
        queryFn: () => rallyingPoint.getDepartmentPointsAsGeoJson(department),
        staleTime: Infinity,
        gcTime: Infinity
      },
      {
        queryKey: ["requests", department],
        queryFn: () => rallyingPoint.getDepartmentRequestsAsGeoJson(department),
        staleTime: Infinity,
        gcTime: Infinity
      },
      {
        queryKey: ["parkings", department],
        queryFn: () => osm.fetch(department, "parking"),
        staleTime: Infinity,
        gcTime: Infinity
      }
    ]
  });
  const boundary = results[0].data;
  const points = results[1].data;
  const requests = results[2].data;
  const parkings = results[3].data;
  const [populatedData, setPopulatedData] = useState<FeatureCollection | null>(null);
  useEffect(() => {
    if ([points, parkings].every(r => !!r)) {
      (async () => {
        if (points!.features.length < 1) return featureCollection([]);
        const unionReachable = union(featureCollection(points!.features.map(f => circle(f, 0.5))))!;
        console.log(parkings!.features.length);
        //@ts-ignore
        const filteredParkings = filterParkings(parkings!, points);
        console.log(filteredParkings.features.length);
        let parkingSuggestions = union(featureCollection(filteredParkings.features.map(f => circle(f, 0.5))))!;
        parkingSuggestions = difference(featureCollection([parkingSuggestions, unionReachable]))!;

        return featureCollection([
          { ...unionReachable, properties: { type: "reachable" } },
          { ...parkingSuggestions, properties: { type: "suggestion" } }
        ]);
      })().then(setPopulatedData);
    }
  }, [points, parkings]);

  const isLoading = results.some(r => r.isLoading) || !populatedData;
  const error = results.find(r => !!r.error)?.error;
  //console.log(results.map(r => r.error));
  //console.log(boundary);
  return { isLoading, error, requests, reachable: populatedData, points, boundary, parkings };
};

const drawBoundaries = async (fc: FeatureCollection) => {
  const addedFeatures: Feature[] = [];
  fc.features.forEach(f => {
    if (f.geometry.type === "Polygon") {
      addedFeatures.push(polygonToLine(f as Feature<Polygon>));
    }
  });
  return { ...fc, features: fc.features.concat(addedFeatures).map((f, i) => ({ ...f, id: i })) };
};

/** Queries **/
export const getDepartmentBoundaryQuery = (department: string, osm: OsmService) => ({
  queryKey: ["boundary", department],
  queryFn: async () => {
    if (!departements[department]) return EmptyFeatureCollection;
    return await osm.fetch(department, "boundary");
    //return await drawBoundaries(fc);
  },
  staleTime: Infinity,
  gcTime: Infinity
});

const filterParkings = (parkings: FeatureCollection<Point>, except: FeatureCollection<Point>) => {
  const clusters = clustersDbscan(parkings, 0.5, { minPoints: 2 });
  const all: Feature<Point, any>[][] = [];
  clusterEach(clusters, "cluster", (fc, cluster) => {
    const features = fc.features.sort(f => -f.properties["computed:area"]);
    const retained: Feature<Point, any>[] = [];
    features.forEach(f => {
      if (retained.every(rf => distance(rf.geometry, f.geometry) > 0.25) && except.features.every(rf => distance(rf.geometry, f.geometry) > 0.25)) {
        retained.push(f);
      }
    });
    all.push(retained);
  });
  all.push(clusters.features.filter(f => !f.properties["cluster"]));

  return featureCollection(all.flat());
};

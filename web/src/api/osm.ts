import osmtogeojson from "osmtogeojson";
import centroid from "@turf/centroid";
import area from "@turf/area";
import rawJson from "./departements-region.json";
import { FeatureCollection } from "geojson";
import { LocalStorageImpl } from "@/api/storage";

export const departements = Object.fromEntries(rawJson.filter(d => d.num_dep.toString().length === 2).map(d => [d.num_dep, d.dep_name]));

export interface OsmService {
  fetch(dpt: string, type: "parking" | "municipalities" | "train" | "poi" | "boundary"): Promise<FeatureCollection>;
}
export class OsmServiceClient implements OsmService {
  constructor(private storage: LocalStorageImpl) {}

  fetch = async (dpt: string, type: "parking" | "municipalities" | "train" | "poi" | "boundary") => {
    const storageKey = [dpt, type].join(":");
    let geojson = await this.storage.retrieveAsync<FeatureCollection>(storageKey, undefined, { type: "dbcache" });
    if (!geojson) {
      console.log("Fetching", type, "for", dpt, "...");
      let query;
      switch (type) {
        case "municipalities":
          query = "relation['admin_level'='8']['boundary'='administrative'](area.france)(area.dpt);";
          break;
        case "parking":
          query = "nwr['amenity'='parking'](area.france)(area.dpt);";
          break;
        case "train":
          query = "nwr['railway'='station'](area.france)(area.dpt);";
          break;
        case "poi":
          query =
            "nwr['amenity'~'^(townhall|post_office|police|cinema|hospital|doctors|pharmacy|university|school|library|bus_station)$'](area.france)(area.dpt);";
          break;
        case "boundary":
          query = `relation['admin_level'='6']['ref'='${dpt}'](area.france)(area.dpt);`;
          break;
      }
      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        // The body contains the query
        // to understand the query language see "The Programmatic Query Language" on
        // https://wiki.openstreetmap.org/wiki/Overpass_API#The_Programmatic_Query_Language_(OverpassQL)
        body:
          "data=" +
          encodeURIComponent(`
            [out:json];
area['admin_level'='2']['name'='France']->.france;
area['admin_level'='6']['ref'='${dpt}']->.dpt;
(${query});
out geom;
        `)
      });
      // cities center : (nwr['place'~"^(village|town|city)$"](area););
      // cities boundaries: (relation['admin_level'='8'](area););
      geojson = osmtogeojson(await res.json());
      await this.storage.storeAsync(storageKey, geojson, { type: "dbcache" });
    }

    console.log(type, geojson);
    if (type === "parking")
      geojson.features = geojson.features.map(f => {
        const geometry = f.geometry.type === "Point" ? f.geometry : centroid(f).geometry;
        const a = area(f);
        return { ...f, geometry, properties: { ...f.properties, "computed:area": a } };
      });

    return geojson;
  };
}

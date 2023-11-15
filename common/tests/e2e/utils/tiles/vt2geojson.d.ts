declare module "@mapbox/vt2geojson" {
  import { FeatureCollection } from "geojson";
  export default function vt2geojson<TGeom, TProperties>(
    config: {
      uri: string;
      layer: string;
    },
    callback: (err: any, result: FeatureCollection<TGeom, TProperties>) => void
  );
}

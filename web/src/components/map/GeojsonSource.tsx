import { FeatureCollection } from "geojson";
import { useMapContext } from "@/components/map/Map";
import { useEffect, useState } from "react";
import { EmptyFeatureCollection } from "@liane/common";
import { GeoJSONSource, GeoJSONSourceSpecification } from "maplibre-gl";

export const GeojsonSource = ({
  data,
  id,
  ...props
}: { id: string; data: FeatureCollection } & Omit<Omit<GeoJSONSourceSpecification, "type">, "data">) => {
  const map = useMapContext();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const addSource = () => {
      if (!map.current || map.current.getSource(id)) return;

      console.debug("add", id);
      map.current.addSource(id, {
        ...props,
        type: "geojson",
        data: EmptyFeatureCollection
      });
      setReady(true);
    };

    if (map.current?.loaded()) addSource();
    map.current?.once("load", () => {
      addSource();
    });
    map.current?.once("idle", () => {
      addSource();
    });

    return () => {
      if (!map.current || !map.current.loaded() || !map.current.getSource(id)) return;
      console.debug("remove source", id);
      map.current.removeSource(id);
    };
  }, [id, map]); // TODO solve props causing re-render

  useEffect(() => {
    //  console.log("should update data", id, !!map.current?.getSource(id), ready);
    if (ready) (map.current?.getSource(id) as GeoJSONSource | undefined)?.setData(data);
  }, [ready, data, id, map]);
  return <></>;
};

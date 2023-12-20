import { useMapContext } from "@/components/map/Map";
import { SymbolLayerSpecification } from "@maplibre/maplibre-gl-style-spec";
import { MapGeoJSONFeature, MapMouseEvent } from "maplibre-gl";
import { LayerConfig, useLayer } from "@/components/map/layers/base/abstractLayer";
import { useEffect, useState } from "react";

export type SymbolLayerConfig = {
  id: string;
  source: string;
  props: Partial<SymbolLayerSpecification>;
  onMouseLeavePoint?: (id: number) => void;
  onMouseEnterPoint?: (feature: MapGeoJSONFeature) => void;
  onClickPoint?: (e: MapMouseEvent & { features?: MapGeoJSONFeature[] | undefined } & Object) => void;
};

export const SymbolLayer = (config: LayerConfig<SymbolLayerSpecification>) => {
  useLayer(config, "symbol");
  return null;
};

export const MarkerSymbolLayer = (config: LayerConfig<SymbolLayerSpecification>) => {
  // TODO generic for image symbols
  const map = useMapContext();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const loadImage = () =>
      map.current?.loadImage("/pin.png", function (error, image) {
        if (error) throw error;
        if (!image) console.warn("No image found");
        else if (!map.current?.hasImage("pin")) {
          map.current?.addImage("pin", image, { sdf: true });
          setReady(true);
        }
        console.log("here");
      });

    console.log(map.current?.loaded());
    if (map.current?.loaded()) loadImage();
    else map.current?.once("idle", loadImage);
    return () => {
      // if (map.current?.hasImage("pin")) map.current?.removeImage("pin");
    };
  }, [map]);
  console.log("ready", ready);
  return ready ? <SymbolLayer {...config} /> : null;
};

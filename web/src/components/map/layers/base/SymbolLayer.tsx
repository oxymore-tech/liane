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
      map.current?.loadGlobalImage("/pin.png", "pin", () => {
        setReady(true);
        console.debug("here", config.id);
      });

    // console.log(map.current?.loaded());
    if (map.current?.loaded()) loadImage();
    else map.current?.once("idle", loadImage);
  }, [config.id, map]);
  // console.debug("ready", ready, config.id);
  return ready ? <SymbolLayer {...config} /> : null;
};

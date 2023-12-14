import { LayerConfig, useLayer } from "@/components/map/layers/base/abstractLayer";
import { LineLayerSpecification } from "maplibre-gl";
import React from "react";

export const LineLayer = (config: LayerConfig<LineLayerSpecification>) => {
  useLayer(config, "line");
  return <></>;
};

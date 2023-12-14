import { FillLayerSpecification } from "maplibre-gl";
import React from "react";
import { LayerConfig, useLayer } from "@/components/map/layers/base/abstractLayer";

export const FillLayer = (config: LayerConfig<FillLayerSpecification>) => {
  useLayer(config, "fill");
  return <></>;
};

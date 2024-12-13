import { useMapContext } from "@/components/map/Map";
import {
  CircleLayerSpecification,
  FillLayerSpecification,
  LineLayerSpecification,
  SymbolLayerSpecification,
  MapGeoJSONFeature,
  MapMouseEvent
} from "maplibre-gl";
import { useEffect } from "react";

type SupportedLayers = FillLayerSpecification | CircleLayerSpecification | SymbolLayerSpecification | LineLayerSpecification;

export type LayerConfig<TLayer extends FillLayerSpecification | CircleLayerSpecification | SymbolLayerSpecification | LineLayerSpecification> = {
  id: string;
  source: string;
  props: Partial<TLayer>;
  onMouseLeave?: (id: number) => void;
  onMouseEnter?: (feature: MapGeoJSONFeature) => void;
  onClick?: (e: MapMouseEvent & { features?: MapGeoJSONFeature[] | undefined } & Object) => void;
  beforeId?: string;
};

export const useLayer = <TLayer extends SupportedLayers>(
  { source, id, props, onMouseLeave, onMouseEnter, onClick, beforeId }: LayerConfig<TLayer>,
  type: TLayer["type"]
) => {
  const map = useMapContext();

  // console.debug("create", id);
  useEffect(() => {
    // console.debug("update", id);
    const add = () => {
      //  console.log("should abort render", !map.current, !!map.current?.getLayer(id), !map.current?.getSource(source));
      if (map.current && map.current?.getSource(source)) {
        if (map.current?.getLayer(id)) {
          map.current?.removeLayer(id);
        }
        //console.debug("add layer", id);
        map.current?.addLayer(
          {
            ...props,
            id: id,
            // @ts-ignore
            source: source,
            type
          },
          beforeId
        );
      }
    };
    add();

    map.current?.on("sourcedata", function (e) {
      if (e.sourceId === source && e.isSourceLoaded && !map.current?.getLayer(id)) {
        add();
        //@ts-ignore
        map.current?.off("sourcedata", this);
      }
    });

    return () => {
      // console.debug("remove", id, map.current?.loaded());
      if (!map.current?.getLayer(id)) return;
      if (map.current?.loaded()) map.current?.removeLayer(id);
      else map.current?.once("load", () => map.current?.removeLayer(id));
    };
  }, [beforeId, id, map, props, source, type]);

  useEffect(() => {
    let hovered = new Set<number>();
    const onMove = (e: MapMouseEvent) => {
      if (!map.current?.getLayer(id)) return;
      const fs = map.current?.queryRenderedFeatures(e.point, { layers: [id] });
      if (!fs) return;
      const newHovered = new Set<number>();
      if (fs.length > 0) {
        fs.forEach(f => {
          const id = f.id as number;
          if (!hovered.has(id)) {
            onMouseEnter?.(f);
          }
          newHovered.add(id);
          hovered.delete(id);
        });
      }
      hovered.forEach(id => onMouseLeave?.(id));
      hovered = newHovered;
    };

    if (onMouseLeave || onMouseEnter) map.current?.on("mousemove", onMove);
    if (onClick) map.current?.on("click", source, onClick);

    return () => {
      if (onMouseLeave || onMouseEnter) {
        map.current?.off("mousemove", source, onMove);
        hovered.forEach(id => onMouseLeave?.(id));
      }
      if (onClick) map.current?.off("click", source, onClick);
    };
  }, [source, onMouseEnter, onMouseLeave, onClick, map, id]);
};

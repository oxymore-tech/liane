import { Marker as MargerGl } from "react-map-gl/maplibre";
import { LatLng } from "@liane/common/src";
import { useCallback } from "react";
import { MarkerDragEvent } from "react-map-gl/mapbox-legacy";

type Props = {
  lngLat: LatLng;
  onChange?: (lngLat: LatLng) => void;
};

export function Marker({ lngLat, onChange }: Props) {
  const handleDragEnd = useCallback(
    (e: MarkerDragEvent) => {
      if (!onChange) {
        return;
      }
      onChange({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    },
    [onChange]
  );

  return <MargerGl latitude={lngLat.lat} longitude={lngLat.lng} draggable={!!onChange} onDragEnd={handleDragEnd} />;
}

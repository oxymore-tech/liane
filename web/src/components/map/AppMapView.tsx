import { NodeAppEnv } from "@/api/env";
import { Map, MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_TLS, getMapStyleUrl, LatLng } from "@liane/common/src";
import { BBox, FeatureCollection } from "geojson";
import { MapLayerMouseEvent } from "maplibre-gl";
import { ViewStateChangeEvent } from "react-map-gl/mapbox-legacy";

export type AppMapSources = {
  points?: FeatureCollection;
  requests?: FeatureCollection;
  parkings?: FeatureCollection;
  reachable?: FeatureCollection;
};

type AppMapViewProps = {
  center?: LatLng;
  bounds?: BBox;
  onClick?: (e: MapLayerMouseEvent) => void;
  onZoom?: (e: ViewStateChangeEvent) => void;
  children?: React.ReactNode;
  controls?: React.ReactNode;
  selectedFeatures?: string[];
  onSelectFeatures?: (ids: string[]) => void;
  pickLocation?: boolean;
  onPickLocationStart?: () => void;
  onPickLocationEnd?: (position?: LatLng) => void;
};

type Cursor = "grab" | "crosshair" | "pointer";

export const AppMapView = memo(AppMapViewInternal);

function AppMapViewInternal({
  center,
  bounds,
  onClick,
  onZoom,
  children,
  pickLocation,
  onSelectFeatures,
  onPickLocationStart,
  onPickLocationEnd
}: AppMapViewProps) {
  const map = useRef<MapRef>(null);

  const [internalCenter, setInternalCenter] = useState(center ?? DEFAULT_TLS);

  const [hovered, setHovered] = useState<string>("");

  const onMapLoad = useCallback(async () => {
    if (!map.current) {
      return;
    }

    if (!map.current.hasImage("pin")) {
      const image = await map.current.loadImage("/admin/pin.png");
      map.current.addImage("pin", image.data);
    }

    if (!map.current.hasImage("rp_pink_blank")) {
      const image = await map.current.loadImage("/admin/rp_pink_blank.png");
      map.current.addImage("rp_pink_blank", image.data);
    }

    if (!map.current.hasImage("rp_pink")) {
      const image = await map.current.loadImage("/admin/rp_pink.png");
      map.current.addImage("rp_pink", image.data);
    }

    if (bounds) {
      map.current.fitBounds(
        [
          [bounds[0], bounds[1]],
          [bounds[2], bounds[3]]
        ],
        { padding: 50, duration: 1000 }
      );
    }

    map.current.on("mouseenter", ["rallying_point_display", "rallying_points_requests"], e => {
      if (!e.features?.length) {
        return;
      }
      if (!map.current) {
        return;
      }
      setHovered(e.features[0].properties.id);
    });

    map.current.on("mouseleave", ["rallying_point_display", "rallying_points_requests"], e => {
      if (!e.features?.length) {
        return;
      }
      if (!map.current) {
        return;
      }
      setHovered("");
    });

    map.current.on("click", ["rallying_point_display", "rallying_points_requests"], e => {
      if (!e.features?.length) {
        return;
      }
      if (!map.current) {
        return;
      }
      if (!onSelectFeatures) {
        return;
      }
      onSelectFeatures([e.features[0].properties.id]);
    });
  }, [bounds, onSelectFeatures]);

  const [cursor, setCursor] = useState<Cursor>("grab");

  const handleClick = useCallback(
    (e: MapLayerMouseEvent) => {
      if (pickLocation && onPickLocationEnd) {
        onPickLocationEnd({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      }
      if (!onClick) {
        return;
      }
      onClick(e);
    },
    [onClick, onPickLocationEnd, pickLocation]
  );

  const handleZoomChange = useCallback(
    (e: ViewStateChangeEvent) => {
      if (!onZoom) {
        return;
      }
      onZoom(e);
    },
    [onZoom]
  );

  const handlePickLocationStart = useCallback(
    (ctrlKey: boolean) => {
      if (!onPickLocationStart) {
        return;
      }

      if (!ctrlKey) {
        onPickLocationEnd?.();
        return;
      }

      onPickLocationStart();
    },
    [onPickLocationEnd, onPickLocationStart]
  );

  const handleMouseMove = useCallback(
    (e: MapLayerMouseEvent) => {
      handlePickLocationStart(e.originalEvent.ctrlKey);
    },
    [handlePickLocationStart]
  );

  useEffect(() => {
    const handleUp = (event: KeyboardEvent) => {
      if (event.key === "Control") {
        handlePickLocationStart(false);
      }
    };
    const handleDown = (event: KeyboardEvent) => {
      if (event.key === "Control") {
        handlePickLocationStart(true);
      }
    };
    window.addEventListener("keyup", handleUp);
    window.addEventListener("keydown", handleDown);
    return () => {
      window.removeEventListener("keyup", handleUp);
      window.removeEventListener("keydown", handleDown);
    };
  }, [handlePickLocationStart]);

  return (
    <Map
      ref={map}
      onLoad={onMapLoad}
      cursor={pickLocation ? "crosshair" : cursor}
      boxZoom={false}
      dragRotate={false}
      onZoom={handleZoomChange}
      attributionControl={false}
      interactiveLayerIds={["rallying_point_display", "rallying_points_requests", "rallying_point_clusters"]}
      onMouseEnter={() => setCursor("pointer")}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setCursor("grab")}
      onClick={handleClick}
      initialViewState={{
        longitude: internalCenter.lng,
        latitude: internalCenter.lat,
        zoom: 12
      }}
      mapStyle={getMapStyleUrl(NodeAppEnv)}>
      {children}
    </Map>
  );
}

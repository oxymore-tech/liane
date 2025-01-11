import { Observable, Subject } from "rxjs";
import { FeatureCollection, Position } from "geojson";
import { LatLng, Ref, Trip } from "@liane/common";
import React, { useCallback, useImperativeHandle, useRef } from "react";
import AppMapView, { AppMapViewController } from "@/components/map/AppMapView";
import { LianeDisplayLayer } from "@/components/map/layers/LianeDisplayLayer";
import { RallyingPointsDisplayLayer } from "@/components/map/layers/RallyingPointsDisplayLayer.tsx";

export type HomeMapProps = {
  userLocation?: LatLng;
  onMovingStateChanged?: (moving: boolean) => void;
  bottomPadding: number;
  displaySource: Observable<[FeatureCollection, Set<Ref<Trip>> | undefined]>;
  featureSubject?: Subject<GeoJSON.Feature[] | undefined>;
  onMapMoved?: (visibleBounds: Position[]) => void;
};

export const HomeMap = React.forwardRef<AppMapViewController, HomeMapProps>(({ onMapMoved, userLocation, bottomPadding }: HomeMapProps, ref) => {
  const appMapRef = useRef<AppMapViewController>(null);
  // @ts-ignore
  useImperativeHandle(ref, () => appMapRef.current);

  const handleRegionChanged = useCallback(
    async (payload: { zoomLevel: number; isUserInteraction: boolean; visibleBounds: Position[] }) => {
      onMapMoved && onMapMoved(payload.visibleBounds);
    },
    [onMapMoved]
  );

  return (
    <AppMapView onRegionChanged={handleRegionChanged} userLocation={userLocation} ref={appMapRef} cameraPadding={bottomPadding}>
      <RallyingPointsDisplayLayer />
      <LianeDisplayLayer />
    </AppMapView>
  );
});

import { Observable, Subject } from "rxjs";
import { FeatureCollection, Position } from "geojson";
import { LatLng, Ref, Trip } from "@liane/common";
import React, { useImperativeHandle, useRef } from "react";
import AppMapView, { AppMapViewController } from "@/components/map/AppMapView";
import { LianeDisplayLayer } from "@/components/map/layers/LianeDisplayLayer";
import { BottomSheetObservableMessage } from "@/components/base/AppBottomSheet";
import { RallyingPointsDisplayLayer } from "@/components/map/layers/RallyingPointsDisplayLayer.tsx";

export type HomeMapProps = {
  userLocation?: LatLng;
  onMovingStateChanged?: (moving: boolean) => void;
  bottomSheetObservable: Observable<BottomSheetObservableMessage>;
  displaySource: Observable<[FeatureCollection, Set<Ref<Trip>> | undefined]>;
  featureSubject?: Subject<GeoJSON.Feature[] | undefined>;
  onZoomChanged?: (z: number) => void;
  onMapMoved?: (visibleBounds: Position[]) => void;
};

export const HomeMap = React.forwardRef<AppMapViewController, HomeMapProps>(
  ({ onMovingStateChanged, onZoomChanged, onMapMoved, userLocation }: HomeMapProps, ref) => {
    const appMapRef = useRef<AppMapViewController>(null);
    // @ts-ignore
    useImperativeHandle(ref, () => appMapRef.current);

    const handleRegionChanged = async (payload: { zoomLevel: number; isUserInteraction: boolean; visibleBounds: Position[] }) => {
      onMapMoved && onMapMoved(payload.visibleBounds);
      await onRegionChanged(payload);
    };
    const onRegionChanged = async (payload: { zoomLevel: number; isUserInteraction: boolean; visibleBounds: Position[] }) => {
      if (onZoomChanged) {
        onZoomChanged(payload.zoomLevel);
      }
    };

    return (
      <AppMapView
        onRegionChanged={handleRegionChanged}
        userLocation={userLocation}
        onStopMovingRegion={() => {
          onMovingStateChanged && onMovingStateChanged(false);
        }}
        onStartMovingRegion={() => {
          onMovingStateChanged && onMovingStateChanged(true);
        }}
        ref={appMapRef}>
        <RallyingPointsDisplayLayer />
        <LianeDisplayLayer />
      </AppMapView>
    );
  }
);

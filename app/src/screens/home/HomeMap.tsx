import { Observable, Subject } from "rxjs";
import { FeatureCollection, Polygon, Position } from "geojson";
import { DisplayBoundingBox, getBoundingBox, LatLng, Liane, Ref } from "@liane/common";
import React, { useContext, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { filterHasFullTrip, HomeMapContext } from "@/screens/home/StateMachine";
import { useActor } from "@xstate/react";
import { useAppWindowsDimensions } from "@/components/base/AppWindowsSizeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppMapView, { AppMapViewController } from "@/components/map/AppMapView";
import envelope from "@turf/envelope";
import { feature, featureCollection } from "@turf/helpers";
import { LianeDisplayLayer } from "@/components/map/layers/LianeDisplayLayer";
import { BottomSheetObservableMessage } from "@/components/base/AppBottomSheet";
import { AppLogger } from "@/api/logger";
import { useObservable } from "@/util/hooks/subscription";
import { RallyingPointsDisplayLayer } from "@/components/map/layers/RallyingPointsDisplayLayer.tsx";

export type HomeMapProps = {
  userLocation?: LatLng;
  onMovingStateChanged?: (moving: boolean) => void;
  bottomSheetObservable: Observable<BottomSheetObservableMessage>;
  displaySource: Observable<[FeatureCollection, Set<Ref<Liane>> | undefined]>;
  featureSubject?: Subject<GeoJSON.Feature[] | undefined>;
  onZoomChanged?: (z: number) => void;
  onMapMoved?: (visibleBounds: Position[]) => void;
  ref: React.Ref<AppMapViewController>;
};

export const HomeMap = React.forwardRef<AppMapViewController, HomeMapProps>(
  ({ onMovingStateChanged, onZoomChanged, bottomSheetObservable, onMapMoved, userLocation }: HomeMapProps, ref) => {
    const machine = useContext(HomeMapContext);
    const [state] = useActor(machine);

    const { top: bSheetTop } = useObservable(bottomSheetObservable, { expanded: false, top: 52 });
    const { height } = useAppWindowsDimensions();
    const { top: insetsTop } = useSafeAreaInsets();

    const [geometryBbox, setGeometryBbox] = useState<DisplayBoundingBox | undefined>();

    const mapBounds = useMemo(() => {
      if (state.matches("detail")) {
        const coordinates = []; // TODO (lianeDisplay?.segments ?? [])

        if (filterHasFullTrip(state.context.filter)) {
          const { from, to } = state.context.filter!;
          coordinates.push([from!.location.lng, from!.location.lat]);
          coordinates.push([to!.location.lng, to!.location.lat]);
        }
        const bbox = getBoundingBox(coordinates);
        bbox.paddingTop = insetsTop + 96;
        bbox.paddingLeft = 72;
        bbox.paddingRight = 72;
        bbox.paddingBottom = Math.min(bSheetTop + 40, (height - bbox.paddingTop) / 2 + 24);

        return bbox;
      } else if (state.matches("point") && geometryBbox) {
        geometryBbox.paddingTop = insetsTop + 210; //180;
        geometryBbox.paddingLeft = 72;
        geometryBbox.paddingRight = 72;
        geometryBbox.paddingBottom = Math.min(bSheetTop + 40, (height - geometryBbox.paddingTop) / 2 + 24);

        return geometryBbox;
      } else if (state.matches("match")) {
        // Set bounds
        const { from, to } = state.context.filter!;

        const bbox = getBoundingBox([
          [from!.location.lng, from!.location.lat],
          [to!.location.lng, to!.location.lat]
        ]);

        bbox.paddingTop = insetsTop + 210; //180;
        bbox.paddingLeft = 72;
        bbox.paddingRight = 72;
        bbox.paddingBottom = Math.min(bSheetTop + 40, (height - bbox.paddingTop) / 2 + 24);
        //console.debug(bbox, bSheetTop, height);
        return bbox;
      }
      return undefined;
    }, [state, insetsTop, bSheetTop, height, geometryBbox]);

    const isPointState = state.matches("point");

    //const [movingDisplay, setMovingDisplay] = useState<boolean>();
    const appMapRef = useRef<AppMapViewController>(null);
    // @ts-ignore
    useImperativeHandle(ref, () => appMapRef.current);
    // zoom to bbox when pickup is selected
    const [shouldFitBounds, setShouldFitBounds] = useState(false);
    useEffect(() => {
      if (!isPointState) {
        return;
      }
      setShouldFitBounds(true);
      //featureSubject?.next(undefined);
      // Trigger rerender to make sure features are loaded on the map when queried
      appMapRef.current?.getZoom()?.then(zoom => {
        appMapRef.current?.getCenter()?.then(center => {
          appMapRef.current?.setCenter({ lat: center[1], lng: center[0] }, zoom + 0.01, 50); //state.context.filter.from!.location
        });
      });
    }, [state.context.filter.to?.id, state.context.filter.weekDays, isPointState]);

    const handleRegionChanged = async (payload: { zoomLevel: number; isUserInteraction: boolean; visibleBounds: Position[] }) => {
      onMapMoved && onMapMoved(payload.visibleBounds);
      await onRegionChanged(payload);
    };
    const onRegionChanged = async (payload: { zoomLevel: number; isUserInteraction: boolean; visibleBounds: Position[] }) => {
      if (onZoomChanged) {
        onZoomChanged(payload.zoomLevel);
      }
      if (state.matches("point")) {
        if (shouldFitBounds) {
          setShouldFitBounds(false);
          appMapRef.current?.queryFeatures(undefined, undefined, ["lianeLayerFiltered"])?.then(features => {
            if (!features) {
              return;
            }
            const viewportFeatures = features?.features.map(f => f.properties);
            const bboxesCoordinates: Polygon[] = viewportFeatures.filter(f => !!f!.bbox).map(f => JSON.parse(f!.bbox));

            if (bboxesCoordinates.length > 0) {
              const mergedBbox = envelope(featureCollection(bboxesCoordinates.map(p => feature(p))));
              const bbox = getBoundingBox(mergedBbox.geometry.coordinates.flat(), 24);
              AppLogger.debug("MAP", "moving to ", bbox, mergedBbox.bbox);
              if (Number.isFinite(bbox.ne[0]) && Number.isFinite(bbox.ne[1]) && Number.isFinite(bbox.sw[0]) && Number.isFinite(bbox.sw[1])) {
                setGeometryBbox(bbox);
              }
            } else {
              AppLogger.debug("MAP", "found", 0, "features");
              //featureSubject?.next([]);
            }
          });
        }
      }
    };

    return (
      <AppMapView
        bounds={mapBounds}
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
        <LianeDisplayLayer weekDays={state.context.filter.weekDays} />
      </AppMapView>
    );
  }
);

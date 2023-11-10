import { Observable, Subject } from "rxjs";
import { FeatureCollection, Polygon, Position } from "geojson";
import { DisplayBoundingBox, getBoundingBox, getPoint, Liane, Ref } from "@liane/common";
import React, { PropsWithChildren, useContext, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { filterHasFullTrip, HomeMapContext } from "@/screens/home/StateMachine";
import { useActor } from "@xstate/react";
import { useAppWindowsDimensions } from "@/components/base/AppWindowsSizeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppMapView, { AppMapViewController } from "@/components/map/AppMapView";
import envelope from "@turf/envelope";
import { feature, featureCollection } from "@turf/helpers";
import { LianeDisplayLayer } from "@/components/map/layers/LianeDisplayLayer";
import { LianeShapeDisplayLayer } from "@/components/map/layers/LianeShapeDisplayLayer";
import { PotentialLianeLayer } from "@/components/map/layers/PotentialLianeLayer";
import { RallyingPointsFeaturesDisplayLayer } from "@/components/map/layers/RallyingPointsFeaturesDisplayLayer";
import { AppColors } from "@/theme/colors";
import { WayPointDisplay } from "@/components/map/markers/WayPointDisplay";
import { BottomSheetObservableMessage } from "@/components/base/AppBottomSheet";
import { PickupDestinationsDisplayLayer } from "@/components/map/layers/PickupDestinationsDisplayLayer";
import { AppLogger } from "@/api/logger";
import { useObservable } from "@/util/hooks/subscription";

export type HomeMapProps = {
  onMovingStateChanged: (moving: boolean) => void;
  bottomSheetObservable: Observable<BottomSheetObservableMessage>;
  displaySource: Observable<[FeatureCollection, Set<Ref<Liane>> | undefined]>;
  featureSubject?: Subject<GeoJSON.Feature[] | undefined>;
  onZoomChanged?: (z: number) => void;
  ref: React.Ref<AppMapViewController>;
} & PropsWithChildren;
export const HomeMap = React.forwardRef<AppMapViewController, HomeMapProps>(
  (
    { onMovingStateChanged, onZoomChanged, bottomSheetObservable, displaySource: matchDisplaySource, featureSubject, children }: HomeMapProps,
    ref
  ) => {
    const machine = useContext(HomeMapContext);
    const [state] = useActor(machine);
    const isMatchStateIdle = state.matches({ match: "idle" });

    const { top: bSheetTop } = useObservable(bottomSheetObservable, { expanded: false, top: 52 });
    const { height } = useAppWindowsDimensions();
    const { top: insetsTop } = useSafeAreaInsets();

    const [geometryBbox, setGeometryBbox] = useState<DisplayBoundingBox | undefined>();

    const matchDisplayData = useObservable(matchDisplaySource, undefined);

    const pickupsDisplay = useMemo(() => {
      if (isMatchStateIdle) {
        const filterSet = matchDisplayData?.[1];
        let matches = state.context.matches!;
        if (filterSet) {
          matches = matches.filter(m => filterSet.has(m.liane.id!));
        }
        return matches!.map(m => getPoint(m, "pickup"));
      }
      return [];
    }, [isMatchStateIdle, matchDisplayData, state.context.matches]);

    const depositsDisplay = useMemo(() => {
      if (isMatchStateIdle) {
        const filterSet = matchDisplayData?.[1];
        let matches = state.context.matches!;
        if (filterSet) {
          matches = matches.filter(m => filterSet.has(m.liane.id!));
        }
        return matches.map(m => getPoint(m, "deposit"));
      }
      return [];
    }, [isMatchStateIdle, matchDisplayData, state.context.matches]);

    const matchDisplay = useMemo(() => {
      const baseData = matchDisplayData?.[0];
      if (!baseData) {
        return undefined;
      }
      const filterSet = matchDisplayData?.[1];
      if (!filterSet) {
        return baseData;
      }
      const newCollection: FeatureCollection = {
        type: "FeatureCollection",
        features: baseData.features.filter(f => f.properties!.lianes.find((l: string) => filterSet.has(l)))
      };
      return newCollection;
    }, [matchDisplayData]);

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
        //console.debug(bbox, bSheetTop, height);

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

    const isMatchState = state.matches("match");
    const isDetailState = state.matches("detail");
    const isPointState = state.matches("point");

    const detailStateData = useMemo(() => {
      if (!isDetailState) {
        return undefined;
      }
      return {
        pickup: getPoint(state.context.selectedMatch!, "pickup"),
        deposit: getPoint(state.context.selectedMatch!, "deposit")
      };
    }, [isDetailState, state.context.selectedMatch]);

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
    }, [state.context.filter.to?.id, state.context.filter.targetTime?.dateTime, isPointState]);

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
        showGeolocation={state.matches("map") || state.matches("point")} //&& !movingDisplay}
        onRegionChanged={onRegionChanged}
        onStopMovingRegion={() => {
          onMovingStateChanged(false);
        }}
        onStartMovingRegion={() => {
          onMovingStateChanged(true);
        }}
        ref={appMapRef}>
        {state.matches("map") && (
          <LianeDisplayLayer
            date={state.context.filter.targetTime?.dateTime}
            onSelect={rp => {
              if (rp) {
                machine.send("SELECT", { data: rp });
                featureSubject?.next(rp.point_type === "active" ? undefined : []);
              } else {
                machine.send("BACK");
              }
            }}
          />
        )}
        {state.matches("point") && (
          <PickupDestinationsDisplayLayer
            date={state.context.filter.targetTime?.dateTime}
            point={(state.context.filter.to || state.context.filter.from)!.id!}
            type={state.context.filter.from ? "pickup" : "deposit"}
            onSelect={rp => {
              if (rp) {
                machine.send("SELECT", { data: rp });
              } else {
                machine.send("BACK");
              }
            }}
          />
        )}
        {(isMatchState || isDetailState) && (
          <LianeShapeDisplayLayer useWidth={3} lianeDisplay={matchDisplay} lianeId={isDetailState ? state.context.selectedMatch!.liane.id : null} />
        )}
        {isMatchState && ((state.matches({ match: "idle" }) && state.context.matches!.length === 0) || state.matches({ match: "load" })) && (
          <PotentialLianeLayer from={state.context.filter.from!} to={state.context.filter.to!} />
        )}
        {/*isDetailState && <LianeMatchRouteLayer from={state.context.filter.from!} to={state.context.filter.to!} match={state.context.selectedMatch!} />*/}

        {isMatchStateIdle && (
          <RallyingPointsFeaturesDisplayLayer
            rallyingPoints={pickupsDisplay}
            cluster={false}
            interactive={false}
            id="pickups"
            color={AppColors.primaryColor}
          />
        )}
        {isMatchStateIdle && (
          <RallyingPointsFeaturesDisplayLayer
            rallyingPoints={depositsDisplay}
            cluster={false}
            interactive={false}
            id="deposits"
            color={AppColors.primaryColor}
          />
        )}

        {state.matches("point") && (
          <WayPointDisplay rallyingPoint={(state.context.filter.to || state.context.filter.from)!} type={state.context.filter.from ? "from" : "to"} />
        )}

        {isDetailState && <WayPointDisplay rallyingPoint={detailStateData!.pickup} type={"from"} />}
        {isDetailState && <WayPointDisplay rallyingPoint={detailStateData!.deposit} type={"to"} />}

        {state.matches("match") && <WayPointDisplay rallyingPoint={state.context.filter.from!} type={"from"} />}
        {state.matches("match") && <WayPointDisplay rallyingPoint={state.context.filter.to!} type={"to"} />}

        {children}
      </AppMapView>
    );
  }
);

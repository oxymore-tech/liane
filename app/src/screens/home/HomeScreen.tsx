import { Platform, StyleSheet, ToastAndroid, View } from "react-native";
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import AppMapView, {
  AppMapViewController,
  LianeShapeDisplayLayer,
  LianeDisplayLayer,
  LianeMatchRouteLayer,
  PotentialLianeLayer,
  RallyingPointsDisplayLayer,
  WayPointDisplay,
  PickupDestinationsDisplayLayer
} from "@/components/map/AppMapView";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { getPoint } from "@/api";
import { AppContext } from "@/components/ContextProvider";
import { FeatureCollection, GeoJSON, Polygon, Position } from "geojson";
import { AnimatedFloatingBackButton, RPFormHeader } from "@/screens/home/HomeHeader";
import { FilterListView, LianeDestinations } from "@/screens/home/BottomSheetView";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ItinerarySearchForm } from "@/screens/ItinerarySearchForm";
import { useActor, useInterpret } from "@xstate/react";
import { filterHasFullTrip, getSearchFilter, HomeMapContext, HomeMapMachine } from "@/screens/home/StateMachine";
import { DisplayBoundingBox, EmptyFeatureCollection, getBoundingBox } from "@/util/geometry";
import Animated, { FadeInDown, FadeOutDown, SlideInDown } from "react-native-reanimated";
import { Observable, Subject } from "rxjs";
import { useBehaviorSubject, useObservable } from "@/util/hooks/subscription";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppWindowsDimensions } from "@/components/base/AppWindowsSizeProvider";
import { AppBackContextProvider } from "@/components/AppBackContextProvider";
import { HomeBottomSheetContainer, TopRow } from "@/screens/home/HomeBottomSheet";
import { OfflineWarning } from "@/components/OfflineWarning";
import { LianeMatchDetailView } from "@/screens/home/LianeMatchDetailView";
import { useBottomBarStyle } from "@/components/Navigation";
import { useAppNavigation } from "@/api/navigation";
import envelope from "@turf/envelope";
import { feature, featureCollection } from "@turf/helpers";
import { WelcomeWizardModal } from "@/screens/home/WelcomeWizard";

const HomeScreenView = ({ displaySource }: { displaySource: Observable<FeatureCollection> }) => {
  const [movingDisplay, setMovingDisplay] = useState<boolean>(false);
  const [isLoadingDisplay, setLoadingDisplay] = useState<boolean>(false);

  const machine = useContext(HomeMapContext);
  const [state] = useActor(machine);
  const { status } = useContext(AppContext);

  //console.log("[MAP] moving", movingDisplay);

  const backHandler = () => {
    if (state.can("BACK")) {
      // handle it
      machine.send("BACK");
      return true;
    }

    return false;
  };

  const bottomSheetScroll = useBehaviorSubject<BottomSheetObservableMessage>({ top: 0, expanded: false });

  const loading = Object.values(state.value).find(s => s === "init" || s === "load") !== undefined;
  const loadingDisplay = isLoadingDisplay || (loading && state.context.reloadCause === "display");
  const loadingList = loading && !state.context.reloadCause;
  const offline = status === "offline";
  const { navigation } = useAppNavigation<"Home">();

  const isMatchState = state.matches("match");
  const isDetailState = state.matches("detail");
  const isMapState = state.matches("map");
  const isPointState = state.matches("point");

  const bottomSheetDisplay = state.matches("form") ? "none" : movingDisplay ? "closed" : undefined;

  const [displayBar, setDisplayBar] = useState(true);

  //console.debug(bottomSheetDisplay);
  const bbStyle = useBottomBarStyle();
  React.useLayoutEffect(() => {
    navigation.setOptions(
      //@ts-ignore
      { tabBarStyle: [...bbStyle, { display: isMapState && displayBar ? undefined : "none" }] }
    );
  });

  const mapFeatureSubject = useBehaviorSubject<GeoJSON.Feature[] | undefined>(undefined);
  const [hintPhrase, setHintPhrase] = useState<string | null>(null);

  return (
    <AppBackContextProvider backHandler={backHandler}>
      <View style={styles.page}>
        <View style={styles.container}>
          <HomeMap
            featureSubject={mapFeatureSubject}
            displaySource={displaySource}
            bottomSheetObservable={bottomSheetScroll}
            onMovingStateChanged={setMovingDisplay}
            onZoomChanged={z => {
              console.debug("[MAP] zoom", z);
              if (z < 7) {
                setHintPhrase("Zoomez pour afficher les points de ralliement");
              } else {
                setHintPhrase(null);
              }
            }}
            // onFetchingDisplay={setLoadingDisplay}
            // loading={loadingDisplay || loadingList}
          />
        </View>
        {state.matches("form") && (
          <Animated.View entering={FadeInDown} exiting={FadeOutDown} style={[styles.container, { backgroundColor: AppColors.white }]} />
        )}
        {offline && (
          <Animated.View style={{ position: "absolute", bottom: 96, left: 24, right: 24 }} entering={SlideInDown}>
            <OfflineWarning />
          </Animated.View>
        )}

        {!offline && !isMapState && (
          <HomeBottomSheetContainer
            onScrolled={(v, expanded) => {
              //setMapBottom(v);
              bottomSheetScroll.next({ expanded, top: v });
            }}
            display={bottomSheetDisplay}
            canScroll={loadingDisplay && !movingDisplay}>
            {isPointState && <TopRow loading={loadingList && !movingDisplay} title={"Prochains départs de " + state.context.filter.from!.label} />}

            {isMatchState && <FilterListView loading={loadingList} />}

            {isPointState && (
              <LianeDestinations
                pickup={state.context.filter.from!}
                date={state.context.filter.targetTime?.dateTime}
                mapFeatureObservable={mapFeatureSubject}
              />
            )}
            {!loadingList && isDetailState && <LianeMatchDetailView />}
          </HomeBottomSheetContainer>
        )}

        {/*state.matches("map") && <HomeHeader bottomSheetObservable={bottomSheetScroll} onPress={() => machine.send("FORM")} />*/}
        {state.matches("form") && (
          <ItinerarySearchForm
            // updateField={(field, value) => machine.send("UPDATE", { data: { [field]: value } })}
            animateEntry={state.history?.matches("map") || state.history?.matches("detail") || false}
            trip={state.context.filter}
            onSelectTrip={t => {
              machine.send("UPDATE", { data: t });
            }}
            updateTrip={t => machine.send("UPDATE", { data: t })}
          />
        )}

        {isDetailState && (
          <AnimatedFloatingBackButton
            onPress={() => {
              machine.send("BACK");
            }}
          />
        )}
        {isMapState && (
          <RPFormHeader
            setBarVisible={setDisplayBar}
            hintPhrase={hintPhrase}
            animateEntry={!state.history?.matches("point") && !state.history?.matches("match")}
            title={"Carte des lianes"}
            updateTrip={t => machine.send("UPDATE", { data: t })}
            trip={state.context.filter}
          />
        )}
        {(isMatchState || isPointState) && (
          <RPFormHeader
            animateEntry={false}
            title={"Carte des lianes"}
            updateTrip={t => machine.send("UPDATE", { data: t })}
            trip={state.context.filter}
          />
        )}
      </View>
    </AppBackContextProvider>
  );
};

interface BottomSheetObservableMessage {
  expanded: boolean;
  top: number;
}
/*
const HomeHeader = (props: { onPress: () => void; bottomSheetObservable: Observable<BottomSheetObservableMessage> }) => {
  const insets = useSafeAreaInsets();

  const { expanded } = useObservable(props.bottomSheetObservable, { expanded: false, top: 0 });

  return (
    <Column style={[styles.floatingSearchBar, { marginTop: insets.top }]} spacing={8}>
      <Pressable style={[AppStyles.inputBar, !expanded ? AppStyles.shadow : styles.border]} onPress={props.onPress}>
        <AppTextInput
          style={AppStyles.input}
          leading={<AppIcon name={"search-outline"} color={AppColorPalettes.gray[400]} />}
          editable={false}
          placeholder={"Trouver une Liane"}
          onPressIn={props.onPress}
        />
      </Pressable>
      <View style={{ backgroundColor: AppColors.white, borderRadius: 8 }}>
        <FilterSelector />
      </View>
    </Column>
  );
};*/
const HomeMap = ({
  onMovingStateChanged,
  onZoomChanged,
  bottomSheetObservable,
  displaySource: matchDisplaySource,
  featureSubject
}: {
  onMovingStateChanged: (moving: boolean) => void;
  bottomSheetObservable: Observable<BottomSheetObservableMessage>;
  displaySource: Observable<FeatureCollection>;
  featureSubject?: Subject<GeoJSON.Feature[] | undefined>;
  onZoomChanged?: (z: number) => void;
}) => {
  const machine = useContext(HomeMapContext);
  const [state] = useActor(machine);
  const isMatchStateIdle = state.matches({ match: "idle" });

  const { top: bSheetTop } = useObservable(bottomSheetObservable, { expanded: false, top: 52 });
  const { height } = useAppWindowsDimensions();
  const { top: insetsTop } = useSafeAreaInsets();

  const [geometryBbox, setGeometryBbox] = useState<DisplayBoundingBox | undefined>();

  const pickupsDisplay = useMemo(() => {
    if (isMatchStateIdle) {
      return state.context.matches!.map(m => getPoint(m, "pickup"));
    }
    return [];
  }, [isMatchStateIdle, state.context.matches]);

  const matchDisplay = useObservable(matchDisplaySource, undefined);

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

  // zoom to bbox when pickup is selected
  const [shouldFitBounds, setShouldFitBounds] = useState(false);
  useEffect(() => {
    if (!isPointState) {
      return;
    }
    setShouldFitBounds(true);
    featureSubject?.next(undefined);
    // Trigger rerender to make sure features are loaded on the map when queried
    appMapRef.current?.getZoom()?.then(zoom => {
      appMapRef.current?.getCenter()?.then(center => {
        appMapRef.current?.setCenter({ lat: center[1], lng: center[0] }, zoom + 0.01, 0); //state.context.filter.from!.location
      });
    });
  }, [state.context.filter.from?.id, state.context.filter.targetTime?.dateTime, isPointState]);

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
            console.debug("[MAP] moving to ", bbox, mergedBbox.bbox);
            if (Number.isFinite(bbox.ne[0]) && Number.isFinite(bbox.ne[1]) && Number.isFinite(bbox.sw[0]) && Number.isFinite(bbox.sw[1])) {
              setGeometryBbox(bbox);
            } else {
              console.warn("[MAP]: cannot fit infinite bounds");
            }
          } else {
            console.debug("[MAP] found", 0, "features");
            featureSubject?.next([]);
          }
        });
      } else {
        const features = await appMapRef.current?.queryFeatures(undefined, undefined, ["lianeLayerFiltered"]);
        if (features) {
          console.debug("[MAP] found", features.features.length, "features");
          featureSubject?.next(features.features);
        }
      }
    }
  };

  return (
    <AppMapView
      bounds={mapBounds}
      showGeolocation={state.matches("map")} //&& !movingDisplay}
      onRegionChanged={onRegionChanged}
      onStopMovingRegion={() => {
        onMovingStateChanged(false);
      }}
      onStartMovingRegion={() => {
        onMovingStateChanged(true);
      }}
      ref={appMapRef}
      onSelectFeatures={features => {
        if (features.length > 0) {
          if (Platform.OS === "android") {
            ToastAndroid.showWithGravity(
              JSON.stringify(features.map(feat => feat.properties["name:latin"])),
              ToastAndroid.SHORT,
              ToastAndroid.CENTER
            );
          }
          appMapRef.current?.setCenter(features[0].location, 12.1);
        }
      }}>
      {state.matches("map") && (
        <LianeDisplayLayer
          date={state.context.filter.targetTime?.dateTime}
          onSelect={rp => {
            if (rp) {
              machine.send("SELECT", { data: rp });
            } else {
              machine.send("BACK");
            }
          }}
        />
      )}
      {state.matches("point") && (
        <PickupDestinationsDisplayLayer
          date={state.context.filter.targetTime?.dateTime}
          pickupPoint={state.context.filter.from!.id!}
          onSelect={rp => {
            if (rp) {
              machine.send("SELECT", { data: rp });
            } else {
              machine.send("BACK");
            }
          }}
        />
      )}
      {isMatchState && <LianeShapeDisplayLayer useWidth={3} lianeDisplay={matchDisplay} />}
      {isMatchState && ((state.matches({ match: "idle" }) && state.context.matches!.length === 0) || state.matches({ match: "load" })) && (
        <PotentialLianeLayer from={state.context.filter.from!} to={state.context.filter.to!} />
      )}
      {isDetailState && <LianeMatchRouteLayer from={state.context.filter.from!} to={state.context.filter.to!} match={state.context.selectedMatch!} />}

      {isMatchStateIdle && <RallyingPointsDisplayLayer rallyingPoints={pickupsDisplay} cluster={false} interactive={false} />}

      {isDetailState && state.context.filter.from?.id !== detailStateData!.pickup.id && (
        <WayPointDisplay rallyingPoint={detailStateData!.pickup} type={"pickup"} />
      )}
      {isDetailState && state.context.filter.to?.id !== detailStateData!.deposit.id && (
        <WayPointDisplay rallyingPoint={detailStateData!.deposit} type={"deposit"} />
      )}
      {["detail", "match", "point"].some(state.matches) && (
        <WayPointDisplay
          rallyingPoint={state.context.filter.from || detailStateData!.pickup}
          type={"from"}
          // showIcon={state.context.selectedMatch === undefined}
          active={!isDetailState || !state.context.filter.from || state.context.filter.from.id === detailStateData!.pickup.id}
        />
      )}
      {["detail", "match"].some(state.matches) && (
        <WayPointDisplay
          rallyingPoint={state.context.filter.to || detailStateData!.deposit}
          type={"to"}
          //  showIcon={state.context.selectedMatch === undefined}
          active={!isDetailState || !state.context.filter.to || state.context.filter.to.id === detailStateData!.deposit.id}
        />
      )}
    </AppMapView>
  );
};
const HomeScreen = () => {
  const { services } = useContext(AppContext);
  const displaySubject = useBehaviorSubject<FeatureCollection>(EmptyFeatureCollection);

  const [m] = useState(() =>
    HomeMapMachine({
      services: {
        match: ctx => services.liane.match2(getSearchFilter(ctx.filter)),
        cacheRecentTrip: trip => services.location.cacheRecentTrip(trip).catch(e => console.error(e)),
        cacheRecentPoint: rp => services.location.cacheRecentLocation(rp).catch(e => console.error(e))
      },
      observables: {
        displaySubject
      }
    })
  );
  const machine = useInterpret(m);
  machine.subscribe(s => console.log(JSON.stringify(s.history?.value)));

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <WelcomeWizardModal />
      <HomeMapContext.Provider value={machine}>
        <HomeScreenView displaySource={displaySubject} />
      </HomeMapContext.Provider>
    </GestureHandlerRootView>
  );
};
export default HomeScreen;

const styles = StyleSheet.create({
  page: {
    flex: 1
  },
  container: {
    height: "100%",
    width: "100%",
    position: "absolute",
    flex: 1
  },
  border: {
    borderWidth: 1,
    borderColor: AppColorPalettes.gray[200]
  },
  floatingSearchBar: {
    paddingVertical: 24,
    paddingHorizontal: 24,
    position: "absolute",
    width: "100%"
  }
});

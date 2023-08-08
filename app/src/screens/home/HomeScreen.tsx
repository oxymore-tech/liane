import { StyleSheet, View } from "react-native";
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import AppMapView, {
  AppMapViewController,
  LianeShapeDisplayLayer,
  LianeDisplayLayer,
  PotentialLianeLayer,
  RallyingPointsFeaturesDisplayLayer,
  WayPointDisplay,
  PickupDestinationsDisplayLayer
} from "@/components/map/AppMapView";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { getPoint, Liane, Ref } from "@/api";
import { AppContext } from "@/components/ContextProvider";
import { FeatureCollection, GeoJSON, Polygon, Position } from "geojson";
import { AnimatedFloatingBackButton, MapHeader, SearchModal } from "@/screens/home/HomeHeader";
import { LianeMatchListView } from "@/screens/home/BottomSheetView";
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
import { getSetting } from "@/api/storage";
import { useIsFocused } from "@react-navigation/native";

const HomeScreenView = ({ displaySource }: { displaySource: Observable<[FeatureCollection, Set<Ref<Liane>> | undefined]> }) => {
  const [movingDisplay, setMovingDisplay] = useState<boolean>(false);
  // const [isLoadingDisplay, setLoadingDisplay] = useState<boolean>(false);

  const machine = useContext(HomeMapContext);
  const [state] = useActor(machine);
  const { status } = useContext(AppContext);

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
  const loadingDisplay = loading && state.context.reloadCause === "display"; //isLoadingDisplay ||
  const loadingList = loading && !state.context.reloadCause;
  const offline = status === "offline";
  const { navigation } = useAppNavigation<"Home">();

  const isMatchState = state.matches("match");
  const isDetailState = state.matches("detail");
  const isMapState = state.matches("map");
  const isPointState = state.matches("point");

  const bottomSheetDisplay = state.matches("form") ? "none" : movingDisplay ? "closed" : undefined;

  // const [displayBar, setDisplayBar] = useState(true);

  //console.debug(bottomSheetDisplay);
  const bbStyle = useBottomBarStyle();
  React.useLayoutEffect(() => {
    navigation.setOptions(
      //@ts-ignore
      { tabBarStyle: [...bbStyle, { display: isMapState || isPointState ? undefined : "none" }] }
    );
  });

  const mapFeatureSubject = useBehaviorSubject<GeoJSON.Feature[] | undefined>(undefined);
  //const [hintPhrase, setHintPhrase] = useState<string | null>(null);

  const features = useObservable(mapFeatureSubject, undefined);
  const hasFeatures = !!features;

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
              /*if (z < 8) {
                setHintPhrase("Zoomez pour afficher les points de ralliement");
              } else {
                setHintPhrase(null);
              } */
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

        {!offline && !isMapState && !isPointState && (
          <HomeBottomSheetContainer
            onScrolled={(v, expanded) => {
              //setMapBottom(v);
              bottomSheetScroll.next({ expanded, top: v });
            }}
            display={bottomSheetDisplay}
            canScroll={loadingDisplay && !movingDisplay}>
            {isPointState && <TopRow loading={loadingList && !movingDisplay} title={"Prochains départs de " + state.context.filter.from!.label} />}

            {isMatchState && <LianeMatchListView loading={loadingList} />}

            {/*isPointState && (
              <LianeDestinations
                pickup={state.context.filter.from!}
                date={state.context.filter.targetTime?.dateTime}
                mapFeatureObservable={mapFeatureSubject}
              />
            )*/}
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
          /*(
          <RPFormHeader
            setBarVisible={setDisplayBar}
            hintPhrase={hintPhrase}
            animateEntry={!state.history?.matches("point") && !state.history?.matches("match")}
            title={"Carte des lianes"}
            updateTrip={t => machine.send("UPDATE", { data: t })}
            trip={state.context.filter}
          />
        )*/ <MapHeader
            hintPhrase={isPointState && !hasFeatures ? "Aucun passage n'est prévu." : null}
            title={"Carte des lianes"}
            updateTrip={t => machine.send("UPDATE", { data: t })}
            trip={state.context.filter}
          />
        )}
        {isPointState && (
          <MapHeader
            hintPhrase={isPointState && !hasFeatures ? "Aucun passage n'est prévu." : null}
            animateEntry={false}
            title={"Carte des lianes"}
            updateTrip={t => machine.send("UPDATE", { data: t })}
            trip={state.context.filter}
          />
        )}
        {isMatchState && (
          <MapHeader
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
  displaySource: Observable<[FeatureCollection, Set<Ref<Liane>> | undefined]>;
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
            //featureSubject?.next([]);
          }
        });
      } /*else {
        const features = await appMapRef.current?.queryFeatures(undefined, undefined, ["lianeLayerFiltered"]);
        if (features) {
          console.debug("[MAP] found", features.features.length, "features");
          featureSubject?.next(features.features);
        }
      }*/
    }
  };

  // Debug settings
  const isFocused = useIsFocused();
  const [trafficAsWidth, setTrafficAsWidth] = useState(true);
  const [trafficAsColor, setTrafficAsColor] = useState(true);
  useEffect(() => {
    getSetting("map.lianeTrafficAsWidth").then(setTrafficAsWidth);
    getSetting("map.lianeTrafficAsColor").then(setTrafficAsColor);
  }, [isFocused]);

  return (
    <>
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
        ref={appMapRef}
        /* onSelectFeatures={features => {
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
        }}*/
      >
        {state.matches("map") && (
          <LianeDisplayLayer
            trafficAsWidth={trafficAsWidth}
            trafficAsColor={trafficAsColor}
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
            color={AppColors.orange}
          />
        )}
        {isMatchStateIdle && (
          <RallyingPointsFeaturesDisplayLayer
            rallyingPoints={depositsDisplay}
            cluster={false}
            interactive={false}
            id="deposits"
            color={AppColors.pink}
          />
        )}

        {isDetailState && <WayPointDisplay rallyingPoint={detailStateData!.pickup} type={"from"} />}
        {isDetailState && <WayPointDisplay rallyingPoint={detailStateData!.deposit} type={"to"} />}
        {["point", "match"].some(state.matches) && (
          <WayPointDisplay
            rallyingPoint={state.context.filter.from || detailStateData!.pickup}
            type={"from"}

            // active={!isDetailState || !state.context.filter.from || state.context.filter.from.id === detailStateData!.pickup.id}
          />
        )}
        {["match"].some(state.matches) && (
          <WayPointDisplay
            rallyingPoint={state.context.filter.to || detailStateData!.deposit}
            type={"to"}

            //  active={!isDetailState || !state.context.filter.to || state.context.filter.to.id === detailStateData!.deposit.id}
          />
        )}
      </AppMapView>
      {["point", "map"].some(state.matches) && (
        <SearchModal
          onSelectTrip={trip => {
            machine.send("UPDATE", { data: trip });
            return true;
          }}
          onSelectFeature={placeFeature => {
            console.log("place selected", JSON.stringify(placeFeature));
            if (placeFeature.bbox) {
              appMapRef.current?.fitBounds(
                getBoundingBox(
                  [
                    [placeFeature.bbox[0], placeFeature.bbox[1]],
                    [placeFeature.bbox[2], placeFeature.bbox[3]]
                  ],
                  8
                ),
                1000
              );
            } else if (placeFeature.geometry.type === "Point") {
              appMapRef.current?.setCenter({ lng: placeFeature.geometry.coordinates[0], lat: placeFeature.geometry.coordinates[1] }, 13, 1000);
              /*  if (placeFeature.place_type[0] === "rallying_point") {
                // Select it
                setTimeout(() => {
                  machine.send("SELECT", { data: placeFeature.properties });
                }, 1000);
              }*/
            }
            return true;
          }}
        />
      )}
    </>
  );
};

const HomeScreen = () => {
  const { services } = useContext(AppContext);

  const displaySubject = useBehaviorSubject<[FeatureCollection, Set<Ref<Liane>> | undefined]>([EmptyFeatureCollection, undefined]);

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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <WelcomeWizardModal />
      {/* @ts-ignore */}
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

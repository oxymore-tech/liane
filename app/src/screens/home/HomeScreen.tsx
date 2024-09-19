import { StyleSheet, View } from "react-native";
import React, { useContext, useRef, useState } from "react";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { EmptyFeatureCollection, getBoundingBox, Liane, Ref } from "@liane/common";
import { AppContext } from "@/components/context/ContextProvider";
import { FeatureCollection } from "geojson";
import { AnimatedFloatingBackButton, MapHeader, SearchModal } from "@/screens/home/HomeHeader";
import { LianeMatchListView } from "@/screens/home/BottomSheetView";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ItinerarySearchForm } from "@/screens/ItinerarySearchForm";
import { useActor, useInterpret } from "@xstate/react";
import { getSearchFilter, HomeMapContext, HomeMapMachine } from "@/screens/home/StateMachine";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { Observable } from "rxjs";
import { AppBackContextProvider } from "@/components/AppBackContextProvider";
import { HomeBottomSheetContainer } from "@/screens/home/HomeBottomSheet";
import { OfflineWarning } from "@/components/OfflineWarning";
import { LianeMatchDetailView } from "@/screens/home/LianeMatchDetailView";
import { useBottomBarStyle } from "@/components/context/Navigation";
import { useAppNavigation } from "@/components/context/routing";
import { WelcomeWizardModal } from "@/screens/home/WelcomeWizard";
import { HomeMap } from "@/screens/home/HomeMap";
import { BottomSheetObservableMessage } from "@/components/base/AppBottomSheet";
import { AppLogger } from "@/api/logger";
import { AppMapViewController } from "@/components/map/AppMapView";
import { useBehaviorSubject, useObservable } from "@/util/hooks/subscription";

const HomeScreenView = ({ displaySource }: { displaySource: Observable<[FeatureCollection, Set<Ref<Liane>> | undefined]> }) => {
  const [movingDisplay, setMovingDisplay] = useState<boolean>(false);
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

  const bbStyle = useBottomBarStyle();
  React.useLayoutEffect(() => {
    navigation.setOptions(
      //@ts-ignore
      { tabBarStyle: [...bbStyle, { display: isMapState || isPointState ? undefined : "none" }] }
    );
  });

  const mapFeatureSubject = useBehaviorSubject<GeoJSON.Feature[] | undefined>(undefined);

  const features = useObservable(mapFeatureSubject, undefined);
  const hasFeatures = !!features;

  const appMapRef = useRef<AppMapViewController>(null);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <AppBackContextProvider backHandler={backHandler}>
      <View style={styles.page}>
        <View style={styles.container}>
          <HomeMap
            ref={appMapRef}
            featureSubject={mapFeatureSubject}
            displaySource={displaySource}
            bottomSheetObservable={bottomSheetScroll}
            onMovingStateChanged={setMovingDisplay}
            onZoomChanged={z => AppLogger.debug("MAP", `zoom ${z}`)}
          />
          {["point", "map"].some(state.matches) && (
            <>
              <SearchModal
                isOpened={modalOpen}
                close={() => setModalOpen(false)}
                onSelectTrip={trip => {
                  machine.send("UPDATE", { data: trip });
                  return true;
                }}
                onSelectFeature={placeFeature => {
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
                    appMapRef.current
                      ?.setCenter({ lng: placeFeature.geometry.coordinates[0], lat: placeFeature.geometry.coordinates[1] }, 13, 1000)
                      ?.then(() => {
                        if (placeFeature.place_type[0] === "rallying_point") {
                          machine.send("SELECT", { data: placeFeature.properties });
                        }
                      });
                  }
                  return true;
                }}
              />
            </>
          )}
        </View>
        {state.matches("form") && (
          <Animated.View entering={FadeInDown} exiting={FadeOutDown} style={[styles.container, { backgroundColor: AppColors.white }]} />
        )}

        <OfflineWarning />

        {!offline && !isMapState && !isPointState && (
          <HomeBottomSheetContainer
            onScrolled={(v, expanded) => bottomSheetScroll.next({ expanded, top: v })}
            display={bottomSheetDisplay}
            canScroll={loadingDisplay && !movingDisplay}>
            {isMatchState && <LianeMatchListView loading={loadingList} />}
            {!loadingList && isDetailState && <LianeMatchDetailView />}
          </HomeBottomSheetContainer>
        )}

        {state.matches("form") && <ItinerarySearchForm trip={state.context.filter} updateTrip={t => machine.send("UPDATE", { data: t })} />}

        {isDetailState && <AnimatedFloatingBackButton onPress={() => machine.send("BACK")} />}
        {isMapState && (
          <MapHeader
            hintPhrase={isPointState && !hasFeatures ? "Aucun passage n'est prévu." : null}
            updateTrip={t => machine.send("UPDATE", { data: t })}
            trip={state.context.filter}
            searchPlace={() => setModalOpen(true)}
          />
        )}
        {isPointState && (
          <MapHeader
            searchPlace={() => setModalOpen(true)}
            hintPhrase={isPointState && !hasFeatures ? "Aucun passage n'est prévu." : null}
            action={
              isPointState && !hasFeatures
                ? {
                    icon: "play-circle-outline",
                    title: "Proposer un trajet vers ce point",
                    onPress: () => navigation.navigate("Publish", { initialValue: { wayPoints: [state.context.filter!.to!.id!] } })
                  }
                : null
            }
            animateEntry={false}
            updateTrip={t => {
              machine.send("UPDATE", { data: t });
            }}
            trip={state.context.filter}
          />
        )}
        {isMatchState && <MapHeader animateEntry={false} updateTrip={t => machine.send("UPDATE", { data: t })} trip={state.context.filter} />}
      </View>
    </AppBackContextProvider>
  );
};

const HomeScreen = () => {
  const { services } = useContext(AppContext);

  const displaySubject = useBehaviorSubject<[FeatureCollection, Set<Ref<Liane>> | undefined]>([EmptyFeatureCollection, undefined]);

  const [m] = useState(() =>
    HomeMapMachine({
      services: {
        match: ctx => services.liane.match(getSearchFilter(ctx.filter)),
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
  },
  smallActionButton: {
    padding: 16,
    borderRadius: 52
  }
});

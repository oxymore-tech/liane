import { StyleSheet, View } from "react-native";
import React, { useContext, useRef, useState } from "react";
import { BoundingBox, CoLiane, EmptyFeatureCollection, fromPositions, LatLng, Liane, Ref } from "@liane/common";
import { AppContext } from "@/components/context/ContextProvider";
import { FeatureCollection, Position } from "geojson";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useActor, useInterpret } from "@xstate/react";
import { getSearchFilter, HomeMapContext, HomeMapMachine } from "@/screens/home/StateMachine";
import { Observable } from "rxjs";
import { AppBackContextProvider } from "@/components/AppBackContextProvider";
import { OfflineWarning } from "@/components/OfflineWarning";
import { useBottomBarStyle } from "@/components/context/Navigation";
import { useAppNavigation } from "@/components/context/routing";
import { WelcomeWizardModal } from "@/screens/home/WelcomeWizard";
import { HomeMap } from "@/screens/home/HomeMap";
import { BottomSheetObservableMessage } from "@/components/base/AppBottomSheet";
import { AppLogger } from "@/api/logger";
import { AppMapViewController } from "@/components/map/AppMapView";
import { useBehaviorSubject } from "@/util/hooks/subscription";
import { HomeMapBottomSheetContainer } from "@/screens/home/HomeMapBottomSheet.tsx";
import { DefaultFloatingActions } from "@/components/context/FloatingActions.tsx";

const HomeScreenView = ({ displaySource }: { displaySource: Observable<[FeatureCollection, Set<Ref<Liane>> | undefined]> }) => {
  const machine = useContext(HomeMapContext);
  const [lianes, setLianes] = useState<CoLiane[]>();
  const [currentBoundbox, setCurrentBoundbox] = useState<BoundingBox>();
  const [isFetching, setFetching] = useState<boolean>();
  const [state] = useActor(machine);
  const mapFeatureSubject = useBehaviorSubject<GeoJSON.Feature[] | undefined>(undefined);
  const appMapRef = useRef<AppMapViewController>(null);
  const bottomSheetScroll = useBehaviorSubject<BottomSheetObservableMessage>({ top: 0, expanded: false });
  const { navigation } = useAppNavigation<"Home">();
  const { services } = useContext(AppContext);
  const isMapState = state.matches("map");
  const isPointState = state.matches("point");

  const bbStyle = useBottomBarStyle();
  React.useLayoutEffect(() => {
    navigation.setOptions(
      //@ts-ignore
      { tabBarStyle: [...bbStyle, { display: isMapState || isPointState ? undefined : "none" }] }
    );
  });

  const backHandler = () => {
    if (state.can("BACK")) {
      // handle it
      machine.send("BACK");
      return true;
    }

    return false;
  };

  const computeLianeDisplay = (visibleBounds: Position[]) => {
    fetchLianeOnMap(fromPositions(visibleBounds)).then();
  };

  const fetchLianeOnMap = async (bound: BoundingBox) => {
    try {
      setFetching(true);
      setCurrentBoundbox(bound);
      const lianesTemp: CoLiane[] = await services.community.list({
        forCurrentUser: false,
        bbox: bound
      });
      setLianes(lianesTemp);
    } catch (e) {
      AppLogger.debug("HOME", "Au moment de récupérer les lianes de la carte, une erreur c'est produite", e);
    }
    setFetching(false);
  };
  const [userLocation, setUserLocation] = useState<LatLng>();
  return (
    <AppBackContextProvider backHandler={backHandler}>
      <View style={styles.page}>
        <View style={styles.container}>
          <HomeMap
            userLocation={userLocation}
            ref={appMapRef}
            featureSubject={mapFeatureSubject}
            displaySource={displaySource}
            bottomSheetObservable={bottomSheetScroll}
            onMapMoved={computeLianeDisplay}
          />
          <DefaultFloatingActions onPosition={setUserLocation} position="top" />
          <HomeMapBottomSheetContainer
            lianes={lianes}
            isFetching={!!isFetching}
            currentBoundbox={currentBoundbox}
            fetchLianeOnMap={fetchLianeOnMap}
          />
        </View>

        <OfflineWarning />
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
  }
});

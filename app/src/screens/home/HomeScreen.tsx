import { StyleSheet, View } from "react-native";
import React, { useContext, useRef, useState } from "react";
import { BoundingBox, CoLiane, EmptyFeatureCollection, fromPositions, LatLng, Ref, Trip } from "@liane/common";
import { AppContext } from "@/components/context/ContextProvider";
import { FeatureCollection, Position } from "geojson";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Observable } from "rxjs";
import { OfflineWarning } from "@/components/OfflineWarning";
import { WelcomeWizardModal } from "@/screens/home/WelcomeWizard";
import { HomeMap } from "@/screens/home/HomeMap";
import { BottomSheetObservableMessage } from "@/components/base/AppBottomSheet";
import { AppMapViewController } from "@/components/map/AppMapView";
import { useBehaviorSubject } from "@/util/hooks/subscription";
import { HomeMapBottomSheetContainer } from "@/screens/home/HomeMapBottomSheet.tsx";
import { DefaultFloatingActions } from "@/components/context/FloatingActions.tsx";

const HomeScreenView = ({ displaySource }: { displaySource: Observable<[FeatureCollection, Set<Ref<Trip>> | undefined]> }) => {
  const [lianes, setLianes] = useState<CoLiane[]>();
  const [currentBoundbox, setCurrentBoundbox] = useState<BoundingBox>();
  const [isFetching, setFetching] = useState<boolean>();
  const mapFeatureSubject = useBehaviorSubject<GeoJSON.Feature[] | undefined>(undefined);
  const appMapRef = useRef<AppMapViewController>(null);
  const bottomSheetScroll = useBehaviorSubject<BottomSheetObservableMessage>({ top: 0, expanded: false });
  const { services } = useContext(AppContext);

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
    } finally {
      setFetching(false);
    }
  };

  const [userLocation, setUserLocation] = useState<LatLng>();

  return (
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
      <HomeMapBottomSheetContainer lianes={lianes} isFetching={!!isFetching} currentBoundbox={currentBoundbox} fetchLianeOnMap={fetchLianeOnMap} />
      <OfflineWarning />
    </View>
  );
};

const HomeScreen = () => {
  const displaySubject = useBehaviorSubject<[FeatureCollection, Set<Ref<Trip>> | undefined]>([EmptyFeatureCollection, undefined]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <WelcomeWizardModal />
      <HomeScreenView displaySource={displaySubject} />
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
    top: 0,
    position: "absolute",
    flex: 1
  }
});

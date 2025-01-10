import { StyleSheet, View } from "react-native";
import React, { useCallback, useContext, useEffect, useState } from "react";
import { CoLiane, EmptyFeatureCollection, fromPositions, LatLng, Ref, Trip } from "@liane/common";
import { AppContext } from "@/components/context/ContextProvider";
import { FeatureCollection, Position } from "geojson";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Observable } from "rxjs";
import { OfflineWarning } from "@/components/OfflineWarning";
import { WelcomeWizardModal } from "@/screens/home/WelcomeWizard";
import { HomeMap } from "@/screens/home/HomeMap";
import { useBehaviorSubject } from "@/util/hooks/subscription";
import { HomeMapBottomSheetContainer } from "@/screens/home/HomeMapBottomSheet.tsx";
import { DefaultFloatingActions } from "@/components/context/FloatingActions.tsx";

const HomeScreenView = ({ displaySource }: { displaySource: Observable<[FeatureCollection, Set<Ref<Trip>> | undefined]> }) => {
  const [lianes, setLianes] = useState<CoLiane[]>();
  const [isFetching, setFetching] = useState<boolean>();
  const mapFeatureSubject = useBehaviorSubject<GeoJSON.Feature[] | undefined>(undefined);
  const { services } = useContext(AppContext);

  const [boundingBox, setBoundingBox] = useState("");

  const fetchLianeOnMap = useCallback(
    async (visibleBounds: Position[]) => {
      try {
        setFetching(true);
        const bbox = fromPositions(visibleBounds);
        const current = JSON.stringify(bbox);
        if (current === boundingBox) {
          return;
        }
        setBoundingBox(current);
        const lianesTemp: CoLiane[] = await services.community.list({
          forCurrentUser: false,
          bbox
        });
        setLianes(lianesTemp);
      } finally {
        setFetching(false);
      }
    },
    [boundingBox, services.community]
  );

  const [userLocation, setUserLocation] = useState<LatLng>(services.location.getLastKnownLocation());
  const [bottomPadding, setBottomPadding] = useState(0);

  useEffect(() => {
    services.location.currentLocation().then(setUserLocation);
  }, [services.location]);

  return (
    <View style={styles.container}>
      <HomeMap
        userLocation={userLocation}
        featureSubject={mapFeatureSubject}
        displaySource={displaySource}
        bottomPadding={bottomPadding}
        onMapMoved={fetchLianeOnMap}
      />
      {bottomPadding > 0 && <DefaultFloatingActions onPosition={setUserLocation} position="top" />}
      <HomeMapBottomSheetContainer lianes={lianes} onBottomPaddingChange={setBottomPadding} isFetching={isFetching} />
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
  container: {
    height: "100%",
    width: "100%",
    top: 0,
    position: "absolute",
    flex: 1
  }
});

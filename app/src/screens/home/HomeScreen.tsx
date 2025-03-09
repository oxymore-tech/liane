import { StyleSheet, View } from "react-native";
import React, { useCallback, useContext, useEffect, useState } from "react";
import { BoundingBox, EmptyFeatureCollection, fromPositions, LatLng, Ref, Trip } from "@liane/common";
import { AppContext } from "@/components/context/ContextProvider";
import { FeatureCollection, Position } from "geojson";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Observable } from "rxjs";
import { OfflineWarning } from "@/components/OfflineWarning";
import { HomeMap } from "@/screens/home/HomeMap";
import { useBehaviorSubject } from "@/util/hooks/subscription";
import { HomeMapBottomSheetContainer } from "@/screens/home/HomeMapBottomSheet.tsx";
import { DefaultFloatingActions } from "@/components/context/FloatingActions.tsx";
import { useQuery } from "react-query";

export const LianeOnMapQueryKey = "lianesOnMap";

const HomeScreenView = ({ displaySource }: { displaySource: Observable<[FeatureCollection, Set<Ref<Trip>> | undefined]> }) => {
  const { services } = useContext(AppContext);

  const [bbox, setBbox] = useState<BoundingBox>();
  const [bboxAsString, setBboxAsString] = useState("");

  const { data, isFetching } = useQuery(
    [LianeOnMapQueryKey, bboxAsString],
    () => {
      return services.community.list({ bbox });
    },
    { keepPreviousData: true }
  );

  const refreshBoundingBox = useCallback(
    async (visibleBounds: Position[], center: Position) => {
      const newBbox = fromPositions(visibleBounds, center);
      const value = JSON.stringify(newBbox);
      if (value === bboxAsString) {
        return;
      }
      setBboxAsString(value);
      setBbox(newBbox);
    },
    [setBbox, bboxAsString]
  );

  const [userLocation, setUserLocation] = useState<LatLng>(services.location.getLastKnownLocation());
  const [bottomPadding, setBottomPadding] = useState(0);

  useEffect(() => {
    services.location.currentLocation().then(setUserLocation);
  }, [services.location]);

  return (
    <View style={styles.container}>
      <HomeMap userLocation={userLocation} displaySource={displaySource} bottomPadding={bottomPadding} onMapMoved={refreshBoundingBox} />
      {bottomPadding > 0 && <DefaultFloatingActions onPosition={setUserLocation} position="top" />}
      <HomeMapBottomSheetContainer lianes={data} onBottomPaddingChange={setBottomPadding} isFetching={isFetching} />
      <OfflineWarning />
    </View>
  );
};

const HomeScreen = () => {
  const displaySubject = useBehaviorSubject<[FeatureCollection, Set<Ref<Trip>> | undefined]>([EmptyFeatureCollection, undefined]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/*<WelcomeWizardModal />*/}
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

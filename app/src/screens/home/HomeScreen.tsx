import { StyleSheet, View } from "react-native";
import React, { useContext, useEffect, useState } from "react";
import { BoundingBox, LatLng } from "@liane/common";
import { AppContext } from "@/components/context/ContextProvider";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { OfflineWarning } from "@/components/OfflineWarning";
import { HomeMapBottomSheetContainer } from "@/screens/home/HomeMapBottomSheet.tsx";
import { DefaultFloatingActions } from "@/components/context/FloatingActions.tsx";
import { useQuery } from "react-query";
import { LianeOnMapQueryKey } from "@/util/hooks/query.ts";
import { RallyingPointsDisplayLayer } from "@/components/map/layers/RallyingPointsDisplayLayer.tsx";
import { LianeDisplayLayer } from "@/components/map/layers/LianeDisplayLayer.tsx";
import AppMapView from "@/components/map/AppMapView.tsx";

const HomeScreenView = () => {
  const { services } = useContext(AppContext);

  const [bbox, setBbox] = useState<BoundingBox>();

  const { data, isFetching } = useQuery(
    LianeOnMapQueryKey(bbox),
    async () => {
      if (!bbox) {
        return [];
      }
      return await services.community.list({ bbox });
    },
    { keepPreviousData: true }
  );

  const [userLocation, setUserLocation] = useState<LatLng>(services.location.getLastKnownLocation());
  const [bottomPadding, setBottomPadding] = useState(0);

  useEffect(() => {
    services.location.currentLocation().then(setUserLocation);
  }, [services.location]);

  return (
    <View style={styles.container}>
      <AppMapView onBboxChanged={setBbox} userLocation={userLocation} cameraPadding={bottomPadding}>
        <RallyingPointsDisplayLayer />
        <LianeDisplayLayer />
      </AppMapView>
      {bottomPadding > 0 && <DefaultFloatingActions onPosition={setUserLocation} position="top" />}
      <HomeMapBottomSheetContainer lianes={data} onBottomPaddingChange={setBottomPadding} isFetching={isFetching} />
      <OfflineWarning />
    </View>
  );
};

const HomeScreen = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/*<WelcomeWizardModal />*/}
      <HomeScreenView />
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

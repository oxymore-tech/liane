import React, { useContext, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { CoLiane, RallyingPoint, Ref, WayPoint } from "@liane/common";
import { useAppBackController } from "@/components/AppBackContextProvider";
import { AppColors, defaultTextColor } from "@/theme/colors";
import { AppStyles } from "@/theme/styles";
import { Column, Row } from "@/components/base/AppLayout";
import AppMapView from "@/components/map/AppMapView";
import LocationPin from "@/assets/location_pin.svg";
import { RallyingPointItem } from "@/screens/ItinerarySearchForm";
import { AppRoundedButton } from "@/components/base/AppRoundedButton";
import { RallyingPointsDisplayLayer } from "@/components/map/layers/RallyingPointsDisplayLayer";
import { PageHeader } from "@/components/context/Navigation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppPressableIcon } from "@/components/base/AppPressable";
import { LianeMatchLianeRouteLayer } from "@/components/map/layers/LianeMatchRouteLayer.tsx";
import { AppContext } from "@/components/context/ContextProvider.tsx";

export interface SelectOnMapViewProps {
  onSelect: (rp: RallyingPoint) => void;
  title: string;
  liane?: Ref<CoLiane>;
}
export const SelectOnMapView = ({ onSelect, title, liane }: SelectOnMapViewProps) => {
  const { services } = useContext(AppContext);
  const [selectedRP, setSelectedRP] = useState<RallyingPoint | undefined>();

  const { bottom } = useSafeAreaInsets();
  const { goBack } = useAppBackController();

  const [wayPoints, setWayPoints] = useState<WayPoint[]>([]);

  useEffect(() => {
    if (!liane) {
      return;
    }
    services.community.getTrip(liane).then(setWayPoints);
  }, [liane, services.community]);

  return (
    <View style={styles.container}>
      <AppMapView>
        {liane && <LianeMatchLianeRouteLayer wayPoints={wayPoints.map(w => w.rallyingPoint)} lianeId={liane} />}
        <RallyingPointsDisplayLayer selected={selectedRP?.id} onSelect={setSelectedRP} />
      </AppMapView>
      <View style={[styles.headerContainer, AppStyles.shadow]}>
        <PageHeader title={title} goBack={goBack} />
      </View>
      {selectedRP && (
        <Column style={[styles.footerContainer, AppStyles.shadow, { paddingTop: 32, paddingBottom: 32 + bottom }]} spacing={8}>
          <Row
            style={{
              alignItems: "center",
              flex: 1,
              justifyContent: "center",
              paddingVertical: 8,
              paddingHorizontal: 4,
              borderRadius: 16,
              position: "relative",
              top: -4
            }}
            spacing={16}>
            <LocationPin fill={defaultTextColor(AppColors.white)} height={32} />
            <View style={{ flexShrink: 1, flexGrow: 1 }}>
              <RallyingPointItem item={selectedRP} labelSize={18} showIcon={false} detailed={true} />
            </View>
            <View style={{ width: 24, flexShrink: 100 }} />
            <AppPressableIcon name={"close"} onPress={() => setSelectedRP(undefined)} />
          </Row>
          <Row spacing={8}>
            <AppRoundedButton flex={2} backgroundColor={AppColors.primaryColor} text={"Choisir ce point"} onPress={() => onSelect(selectedRP)} />
          </Row>
        </Column>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    width: "100%",
    flex: 1
  },
  footerContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    borderTopRightRadius: 16,
    borderTopLeftRadius: 16,
    backgroundColor: AppColors.white,
    paddingHorizontal: 24
  },
  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0
  }
});

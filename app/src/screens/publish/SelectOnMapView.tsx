import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { RallyingPoint } from "@liane/common";
import { useAppBackController } from "@/components/AppBackContextProvider";
import { AppColorPalettes, AppColors, defaultTextColor } from "@/theme/colors";
import { AppStyles } from "@/theme/styles";
import { Column, Row } from "@/components/base/AppLayout";
import AppMapView from "@/components/map/AppMapView";
import LocationPin from "@/assets/location_pin.svg";
import { RallyingPointItem } from "@/screens/ItinerarySearchForm";
import { AppRoundedButton } from "@/components/base/AppRoundedButton";
import { RallyingPointsDisplayLayer } from "@/components/map/layers/RallyingPointsDisplayLayer";
import { WayPointDisplay } from "@/components/map/markers/WayPointDisplay";
import { PageHeader } from "@/components/context/Navigation";
import Animated, { ZoomIn, ZoomOut } from "react-native-reanimated";

export interface SelectOnMapViewProps {
  onSelect: (rp: RallyingPoint) => void;
  title: string;
}
export const SelectOnMapView = ({ onSelect, title }: SelectOnMapViewProps) => {
  const [selectedRP, setSelectedRP] = useState<RallyingPoint | undefined>();

  const { goBack } = useAppBackController();
  return (
    <View style={styles.container}>
      <AppMapView>
        <RallyingPointsDisplayLayer selected={selectedRP?.id} onSelect={setSelectedRP} />
        {selectedRP && (
          <Animated.View entering={ZoomIn} exiting={ZoomOut}>
            <WayPointDisplay rallyingPoint={selectedRP} type={"from"} size={24} offsetY={-24} />
          </Animated.View>
        )}
      </AppMapView>
      <View style={[styles.headerContainer, AppStyles.shadow]}>
        <PageHeader title={title} goBack={goBack} />
      </View>
      {selectedRP && (
        <Column style={[styles.footerContainer, AppStyles.shadow]} spacing={8}>
          <Row
            style={{
              alignItems: "center",
              flex: 1,
              justifyContent: "center",
              paddingVertical: 8,
              paddingHorizontal: 4,
              borderRadius: 16,
              borderColor: AppColors.primaryColor,
              borderWidth: 1,
              backgroundColor: AppColorPalettes.gray[100],
              position: "relative",
              top: -4
            }}
            spacing={16}>
            <LocationPin fill={defaultTextColor(AppColors.white)} height={32} />
            <View style={{ flexShrink: 1, flexGrow: 1 }}>
              <RallyingPointItem item={selectedRP} labelSize={18} showIcon={false} detailed={true} />
            </View>
            <View style={{ width: 24, flexShrink: 100 }} />
          </Row>
          <Row spacing={8}>
            <AppRoundedButton flex={1} backgroundColor={AppColorPalettes.gray[200]} text={"Annuler"} onPress={() => setSelectedRP(undefined)} />
            <AppRoundedButton flex={2} backgroundColor={AppColors.primaryColor} text={"Choisir ce point"} onPress={() => onSelect(selectedRP)} />
          </Row>
        </Column>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: "100%",
    width: "100%",
    flex: 1
  },
  footerContainer: {
    position: "absolute",
    bottom: 24,
    left: 24,
    right: 24,
    borderRadius: 16,
    backgroundColor: AppColors.white,
    padding: 16
  },
  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0
  }
});

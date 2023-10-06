import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { RallyingPoint } from "@/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppBackController } from "@/components/AppBackContextProvider";
import Animated, { SlideInUp, SlideOutUp } from "react-native-reanimated";
import { AppColors } from "@/theme/colors";
import { AppStyles } from "@/theme/styles";
import { Column, Row } from "@/components/base/AppLayout";
import { AppPressableIcon } from "@/components/base/AppPressable";
import { AppText } from "@/components/base/AppText";
import AppMapView from "@/components/map/AppMapView";
import LocationPin from "@/assets/location_pin.svg";
import { RallyingPointItem } from "@/screens/ItinerarySearchForm";
import { AppRoundedButton } from "@/components/base/AppRoundedButton";
import { RallyingPointsDisplayLayer } from "@/components/map/layers/RallyingPointsDisplayLayer";
import { WayPointDisplay } from "@/components/map/markers/WayPointDisplay";

export interface SelectOnMapViewProps {
  onSelect: (rp: RallyingPoint) => void;
  title: string;
  type?: "from" | "to";
}
export const SelectOnMapView = ({ onSelect, title, type = "from" }: SelectOnMapViewProps) => {
  const [selectedRP, setSelectedRP] = useState<RallyingPoint | undefined>();

  return (
    <View style={styles.container}>
      <AppMapView>
        <RallyingPointsDisplayLayer type={type} selected={selectedRP?.id} onSelect={setSelectedRP} />
        {selectedRP && <WayPointDisplay rallyingPoint={selectedRP} type={"from"} size={24} offsetY={-24} />}
      </AppMapView>
      <Header title={title} canGoBack={true} />
      {selectedRP && (
        <Column style={styles.footerContainer} spacing={16}>
          <Row style={{ alignItems: "center", paddingHorizontal: 8 }} spacing={16}>
            <LocationPin fill={AppColors.white} height={32} />
            <View style={{ flexShrink: 1 }}>
              <RallyingPointItem item={selectedRP} color={AppColors.white} labelSize={18} showIcon={false} />
            </View>
            <View style={{ flex: 1 }} />
          </Row>
          <Row style={{ justifyContent: "center" }}>
            <AppRoundedButton backgroundColor={AppColors.primaryColor} text={"Choisir ce point"} onPress={() => onSelect(selectedRP)} />
          </Row>
        </Column>
      )}
    </View>
  );
};

const Header = ({
  title,
  animateEntry = true,

  canGoBack = false
}: {
  title?: string;
  animateEntry?: boolean;
  canGoBack?: boolean;
}) => {
  const insets = useSafeAreaInsets();

  const { goBack } = useAppBackController();

  return (
    <Animated.View
      entering={animateEntry ? SlideInUp : undefined}
      exiting={SlideOutUp}
      style={[styles.headerContainer, AppStyles.shadow, { paddingTop: insets.top + 4, paddingBottom: 8 }]}>
      <Column>
        <Row style={{ alignItems: "center", marginBottom: (title ? 4 : 0) + 8 }} spacing={16}>
          {canGoBack && (
            <AppPressableIcon
              onPress={() => {
                goBack();
              }}
              name={"arrow-ios-back-outline"}
              size={24}
              color={AppColors.white}
            />
          )}
          {title && <AppText style={styles.title}>{title}</AppText>}
          <View style={{ flex: 1 }} />
        </Row>
      </Column>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: "100%",
    width: "100%",
    position: "absolute",
    flex: 1
  },
  footerContainer: {
    position: "absolute",
    bottom: 24,
    left: 24,
    right: 24,
    borderRadius: 16,
    backgroundColor: AppColors.darkBlue,
    padding: 16
  },
  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexShrink: 1,
    paddingBottom: 16,
    backgroundColor: AppColors.darkBlue,
    alignSelf: "center",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 16
  },
  title: { color: AppColors.white, ...AppStyles.title, paddingVertical: 4 }
});

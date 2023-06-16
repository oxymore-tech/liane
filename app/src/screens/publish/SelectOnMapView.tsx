import React, { useContext, useRef, useState } from "react";
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
import AppMapView, { RallyingPointsDisplayLayer, WayPointDisplay } from "@/components/map/AppMapView";
import { FeatureCollection, GeoJSON } from "geojson";
import { BoundingBox, fromPositions } from "@/api/geo";
import { AppContext } from "@/components/ContextProvider";
import LocationPin from "@/assets/location_pin.svg";
import { RallyingPointItem } from "@/screens/ItinerarySearchForm";
import { AppRoundedButton } from "@/components/base/AppRoundedButton";

export interface SelectOnMapViewProps {
  onSelect: (rp: RallyingPoint) => void;
  title: string;
  type?: "pickup" | "deposit" | "from" | "to";
}
export const SelectOnMapView = ({ onSelect, title, type = "from" }: SelectOnMapViewProps) => {
  const rpMinZoomLevel = 10.5;
  const { services } = useContext(AppContext);
  const rpCallbackRef = useRef<number | undefined>();
  const [rpDisplay, setRpDisplay] = useState<FeatureCollection | undefined>();
  const [selectedRP, setSelectedRP] = useState<RallyingPoint | undefined>();
  const fetchRallyingPoints = async (currentZoom: number, bounds: BoundingBox) => {
    if (rpCallbackRef.current) {
      clearTimeout(rpCallbackRef.current);
    }
    //onFetchingDisplay(true);
    rpCallbackRef.current = setTimeout(async () => {
      const initialRef = rpCallbackRef.current;

      if (currentZoom < rpMinZoomLevel) {
        //onFetchingDisplay(false);
        return;
      }
      try {
        if (rpCallbackRef.current === initialRef) {
          // If current timeout is still active, fetch display
          const res = await services.rallyingPoint.view(bounds.from, bounds.to);
          setRpDisplay(res);
        }
      } catch (e) {
        console.warn(e);
      } finally {
        if (rpCallbackRef.current === initialRef) {
          // If current timeout is still active, show display
          //onFetchingDisplay(false);
        }
      }
    }, 500);
  };
  return (
    <View style={styles.container}>
      <AppMapView
        onRegionChanged={(payload: { zoomLevel: number; isUserInteraction: boolean; visibleBounds: GeoJSON.Position[] }) => {
          const bounds = fromPositions(payload.visibleBounds);

          fetchRallyingPoints(payload.zoomLevel, bounds).catch(e => console.warn(e));
        }}>
        <RallyingPointsDisplayLayer color={AppColors.blue} minZoomLevel={rpMinZoomLevel} rallyingPoints={rpDisplay || []} onSelect={setSelectedRP} />
        {selectedRP && <WayPointDisplay rallyingPoint={selectedRP} type={"from"} />}
      </AppMapView>
      <Header title={title} canGoBack={true} />
      {selectedRP && (
        <Column style={styles.footerContainer} spacing={16}>
          <Row style={{ alignItems: "center", paddingHorizontal: 8 }} spacing={16}>
            <LocationPin fill={AppColors.white} height={32} />
            <View style={{ flexShrink: 1 }}>
              <RallyingPointItem item={selectedRP} color={AppColors.white} labelSize={18} />
            </View>
            <View style={{ flex: 1 }} />
          </Row>
          <Row style={{ justifyContent: "center" }}>
            <AppRoundedButton backgroundColor={AppColors.orange} text={"Choisir ce point"} onPress={() => onSelect(selectedRP)} />
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

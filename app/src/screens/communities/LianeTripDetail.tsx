import React, { useContext, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Center } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { useAppNavigation } from "@/components/context/routing";
import { AppPressableIcon } from "@/components/base/AppPressable";
import { AppColors, ContextualColors, defaultTextColor } from "@/theme/colors";
import { AppRoundedButton } from "@/components/base/AppRoundedButton.tsx";
import { AppLogger } from "@/api/logger.ts";
import { AppContext } from "@/components/context/ContextProvider.tsx";
import AppMapView from "@/components/map/AppMapView";

import { DisplayWayPoints } from "@/components/communities/DisplayWayPoints";
import { AppLocalization } from "@/api/i18n.ts";
import { getBoundingBox, Liane } from "@liane/common";
import { useAppWindowsDimensions } from "@/components/base/AppWindowsSizeProvider.tsx";
import { LianeMatchLianeRouteLayer } from "@/components/map/layers/LianeMatchRouteLayer.tsx";
import { WayPointDisplay } from "@/components/map/markers/WayPointDisplay.tsx";

export const LianeTripDetailScreen = () => {
  const { navigation, route } = useAppNavigation<"LianeTripDetail">();
  const trip: Liane = route.params.trip;
  const { services } = useContext(AppContext);
  const { top: insetsTop } = useSafeAreaInsets();
  const { height } = useAppWindowsDimensions();

  const insets = useSafeAreaInsets();
  const [error, setError] = useState<Error | undefined>(undefined);

  const joinTrip = async () => {
    if (trip && trip.id) {
      try {
        const result = await services.community.joinTrip({ liane: trip.liane, trip: trip.id, takeReturnTrip: false });
        AppLogger.debug("COMMUNITIES", "Demande de rejoindre une liane avec succès", result);
        navigation.goBack();
      } catch (e) {
        AppLogger.debug("COMMUNITIES", "Une erreur est survenue lors de la demande de rejoindre d'une liane", error);
      }
    } else {
      AppLogger.debug("COMMUNITIES", "Pas de lianeRequest ID lors de la demande de rejoindre", trip);
    }
  };

  const mapBounds = useMemo(() => {
    if (!trip) {
      return undefined;
    }
    const bSheetTopPixels = height * 0.4;
    const bbox = getBoundingBox(trip!.wayPoints.map(w => [w.rallyingPoint.location.lng, w.rallyingPoint.location.lat]));
    bbox.paddingTop = bSheetTopPixels < height / 2 ? insetsTop + 96 : 24;
    bbox.paddingLeft = 72;
    bbox.paddingRight = 72;
    bbox.paddingBottom = Math.min(bSheetTopPixels + 40, (height - bbox.paddingTop) / 2 + 24);
    return bbox;
  }, [trip?.id, insetsTop, height]);

  return (
    <View style={styles.mainContainer}>
      {error && (
        <Center style={{ flex: 1 }}>
          <AppText style={{ color: ContextualColors.redAlert.text }}>{error.message}</AppText>
        </Center>
      )}
      <View style={{ paddingTop: insets.top, height: "100%", width: "100%" }}>
        <View style={{ flexDirection: "row", position: "absolute", top: insets.top + 25, left: 15, zIndex: 40 }}>
          <View style={{ backgroundColor: AppColors.white, borderRadius: 90, marginRight: 5 }}>
            <AppPressableIcon onPress={() => navigation.goBack()} name={"arrow-ios-back-outline"} color={AppColors.primaryColor} size={32} />
          </View>
        </View>
        <View style={{ flex: 1, flexDirection: "column", height: "100%", width: "100%" }}>
          <AppMapView bounds={mapBounds}>
            {trip && <LianeMatchLianeRouteLayer wayPoints={trip.wayPoints.map(wayPoint => wayPoint.rallyingPoint)} lianeId={trip.liane} />}

            {trip?.wayPoints.map((w, i) => {
              let type: "to" | "from" | "step";
              if (i === 0) {
                type = "from";
              } else if (i === trip.wayPoints.length - 1) {
                type = "to";
              } else {
                type = "step";
              }
              return <WayPointDisplay key={w.rallyingPoint.id} rallyingPoint={w.rallyingPoint} type={type} />;
            })}
          </AppMapView>
          <View style={{ width: "100%", height: "40%", backgroundColor: AppColors.white, position: "absolute", top: height * 0.6 }}>
            <View style={{ paddingTop: 20 }}>
              <View style={{ marginHorizontal: 30 }}>
                <AppRoundedButton
                  color={defaultTextColor(AppColors.primaryColor)}
                  onPress={joinTrip}
                  backgroundColor={AppColors.primaryColor}
                  text={"Planifier ce trajet dans mon calendrier "}
                />
              </View>
              <View style={{ marginLeft: 40, paddingTop: 20 }}>
                <AppText
                  style={{
                    fontSize: 20,
                    fontWeight: "normal",
                    flexShrink: 1,
                    lineHeight: 27,
                    color: AppColors.black
                  }}>
                  {trip.departureTime && AppLocalization.formatMonthDay(new Date(trip?.departureTime))}
                </AppText>
              </View>
              <DisplayWayPoints wayPoints={trip.wayPoints} style={{ backgroundColor: AppColors.gray100, borderRadius: 20 }} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    backgroundColor: AppColors.grayBackground,
    justifyContent: "flex-start",
    flex: 1,
    height: "100%"
  }
});

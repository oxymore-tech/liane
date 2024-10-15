import React, { useContext, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Center } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { useAppNavigation } from "@/components/context/routing";
import { AppPressableIcon } from "@/components/base/AppPressable";
import { AppColors, ContextualColors, defaultTextColor } from "@/theme/colors";
import { extractDays } from "@/util/hooks/days";
import { AppRoundedButton } from "@/components/base/AppRoundedButton.tsx";
import { AppLogger } from "@/api/logger.ts";
import AppMapView, { AppMapViewController } from "@/components/map/AppMapView.tsx";
import { AppContext } from "@/components/context/ContextProvider.tsx";
import { DisplayDays } from "@/components/communities/displayDaysView.tsx";
import { AppIcon } from "@/components/base/AppIcon.tsx";
import { extractWaypointFromTo } from "@/util/hooks/lianeRequest.ts";
import { DisplayRallyingPoints } from "@/components/communities/displayWaypointsView.tsx";
import { LianeMatchLianeRouteLayer } from "@/components/map/layers/LianeMatchRouteLayer.tsx";
import { LocationMarker } from "@/screens/detail/components/LocationMarker.tsx";
import { WayPointDisplay } from "@/components/map/markers/WayPointDisplay.tsx";
import { LianeProofDisplay } from "@/components/map/layers/LianeProofDisplay.tsx";
import { getBoundingBox } from "@liane/common";
import { useAppWindowsDimensions } from "@/components/base/AppWindowsSizeProvider.tsx";

export const LianeMapDetailScreen = () => {
  const { navigation, route } = useAppNavigation<"LianeMapDetail">();
  const group = route.params.group;
  const lianeRequest = route.params.request;
  const { services } = useContext(AppContext);
  const { height } = useAppWindowsDimensions();
  const { top: insetsTop } = useSafeAreaInsets();
  const mapRatioHeigt = 0.45;

  const insets = useSafeAreaInsets();
  const [error, setError] = useState<Error | undefined>(undefined);

  const joinLiane = async () => {
    if (lianeRequest && lianeRequest.id) {
      try {
        const result = await services.community.joinRequest(lianeRequest.id, group.liane);
        AppLogger.debug("COMMUNITIES", "Demande de rejoindre une liane avec succès", result);
        navigation.navigate("Communities");
      } catch (error) {
        AppLogger.debug("COMMUNITIES", "Une erreur est survenue lors de la demande de rejoindre d'une liane", error);
      }
    } else {
      AppLogger.debug("COMMUNITIES", "Pas de lianeRequest ID lors de la demande de rejoindre", lianeRequest);
    }
  };

  const acceptLiane = async () => {
    if (lianeRequest && lianeRequest.id) {
      try {
        const result = await services.community.accept(lianeRequest.id, group.liane);
        AppLogger.debug("COMMUNITIES", "Acceptation une liane avec succès", result);
        navigation.navigate("Communities");
      } catch (error) {
        AppLogger.debug("COMMUNITIES", "Une erreur est survenue lors de l'acceptation d'une liane", error);
      }
    } else {
      AppLogger.debug("COMMUNITIES", "Pas de lianeRequest ID lors de l'acceptation", lianeRequest);
    }
  };

  const mapBounds = useMemo(() => {
    if (!lianeRequest) {
      return undefined;
    }

    const bSheetTopPixels = height * (mapRatioHeigt + 0.45);
    const bbox = getBoundingBox(lianeRequest!.wayPoints.map(w => [w.location.lng, w.location.lat]));
    bbox.paddingTop = bSheetTopPixels < height / 2 ? insetsTop + 96 : 22;
    bbox.paddingLeft = 72;
    bbox.paddingRight = 72;
    bbox.paddingBottom = Math.min(bSheetTopPixels + 40, (height - bbox.paddingTop) / 2 + 24);
    return bbox;
  }, [lianeRequest.id, insetsTop, height]);

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
        <View style={{ flex: 1, flexDirection: "column", alignItems: "flex-end", justifyContent: "space-between", height: "100%", width: "100%" }}>
          <AppMapView bounds={mapBounds}>
            {lianeRequest && lianeRequest.id && <LianeMatchLianeRouteLayer wayPoints={lianeRequest.wayPoints} lianeId={lianeRequest.id} />}

            {lianeRequest?.wayPoints.map((w, i) => {
              let type: "to" | "from" | "step";
              if (i === 0) {
                type = "from";
              } else if (i === lianeRequest.wayPoints.length - 1) {
                type = "to";
              } else {
                type = "step";
              }
              return <WayPointDisplay key={w.id} rallyingPoint={w} type={type} />;
            })}
          </AppMapView>
          <View style={{ width: "100%", height: "100%", backgroundColor: AppColors.white, position: "absolute", top: height * mapRatioHeigt }}>
            <View style={{ paddingTop: 20 }}>
              {group.type === "Single" && group.askToJoinAt ? (
                <View
                  style={{
                    justifyContent: "center",
                    alignItems: "center"
                  }}>
                  <AppText
                    style={{
                      fontWeight: "bold",
                      fontSize: 14,
                      lineHeight: 27,
                      color: AppColors.black
                    }}>{`Cette personne souhaite rejoindre votre liane`}</AppText>
                  <View style={{ marginHorizontal: "20%" }}>
                    <AppRoundedButton
                      color={defaultTextColor(AppColors.primaryColor)}
                      onPress={acceptLiane}
                      backgroundColor={AppColors.primaryColor}
                      text={"Accepter "}
                    />
                  </View>
                </View>
              ) : (
                <View style={{ marginHorizontal: "20%" }}>
                  <AppRoundedButton
                    color={defaultTextColor(AppColors.primaryColor)}
                    onPress={joinLiane}
                    backgroundColor={AppColors.primaryColor}
                    text={"Rejoindre "}
                  />
                </View>
              )}
              <DisplayDays days={lianeRequest.weekDays} />
              <DisplayRallyingPoints
                wayPoints={lianeRequest.wayPoints}
                endTime={lianeRequest.arriveBefore}
                style={{ backgroundColor: AppColors.gray100, borderRadius: 20 }}
              />
              <DisplayRallyingPoints
                wayPoints={lianeRequest.wayPoints}
                inverseTravel
                startTime={lianeRequest.returnAfter}
                style={{ backgroundColor: AppColors.gray100, borderRadius: 20 }}
              />
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

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
import AppMapView from "@/components/map/AppMapView.tsx";
import { AppContext } from "@/components/context/ContextProvider.tsx";
import { DisplayDays } from "@/components/communities/displayDaysView.tsx";
import { DisplayRallyingPoints } from "@/components/communities/displayWaypointsView.tsx";
import { LianeMatchLianeRouteLayer } from "@/components/map/layers/LianeMatchRouteLayer.tsx";
import { WayPointDisplay } from "@/components/map/markers/WayPointDisplay.tsx";
import { getBoundingBox, ResolvedLianeRequest } from "@liane/common";
import { useAppWindowsDimensions } from "@/components/base/AppWindowsSizeProvider.tsx";
import { AppBottomSheet, AppBottomSheetHandleHeight, AppBottomSheetScrollView } from "@/components/base/AppBottomSheet.tsx";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export const LianeMapDetailScreen = () => {
  const { navigation, route } = useAppNavigation<"LianeMapDetail">();
  const group = route.params.group;
  const lianeRequest = route.params.request;
  const { services } = useContext(AppContext);

  const { height } = useAppWindowsDimensions();

  const insets = useSafeAreaInsets();
  const [error, setError] = useState<Error | undefined>(undefined);

  const joinLiane = async () => {
    if (lianeRequest && lianeRequest.id) {
      try {
        const result = await services.community.joinRequest(lianeRequest.id, group.liane);
        AppLogger.debug("COMMUNITIES", "Demande de rejoindre une liane avec succès", result);
        navigation.navigate("Lianes");
      } catch (e) {
        AppLogger.debug("COMMUNITIES", "Une erreur est survenue lors de la demande de rejoindre d'une liane", error);
      }
    } else {
      AppLogger.debug("COMMUNITIES", "Pas de lianeRequest ID lors de la demande de rejoindre", lianeRequest);
    }
  };

  const acceptLiane = async () => {
    if (lianeRequest && lianeRequest.id) {
      try {
        const result = await services.community.accept(group.liane, lianeRequest.id);
        AppLogger.debug("COMMUNITIES", "Acceptation une liane avec succès", result);
        navigation.navigate("Lianes");
      } catch (e) {
        AppLogger.debug("COMMUNITIES", "Une erreur est survenue lors de l'acceptation d'une liane", error);
      }
    } else {
      AppLogger.debug("COMMUNITIES", "Pas de lianeRequest ID lors de l'acceptation", lianeRequest);
    }
  };

  const [bSheetTop, setBSheetTop] = useState<number>(0.55 * height);

  const mapBounds = useMemo(() => {
    if (!lianeRequest) {
      return undefined;
    }

    console.log("SCREOLL", bSheetTop);
    const bSheetTopPixels = bSheetTop > 1 ? bSheetTop : bSheetTop * height;
    const bbox = getBoundingBox(lianeRequest!.wayPoints.map(w => [w.location.lng, w.location.lat]));
    bbox.paddingTop = 24;
    bbox.paddingLeft = 72;
    bbox.paddingRight = 72;
    bbox.paddingBottom = bSheetTopPixels + 24;
    return bbox;
  }, [lianeRequest, bSheetTop, height]);

  return (
    <GestureHandlerRootView style={styles.mainContainer}>
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
        <AppBottomSheet onScrolled={v => setBSheetTop(v)} stops={[AppBottomSheetHandleHeight, 0.55, 1]} padding={{ top: 80 }} initialStop={1}>
          <AppBottomSheetScrollView style={{ paddingHorizontal: 12 }}>
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
            {displayResolvedLiane(lianeRequest)}
          </AppBottomSheetScrollView>
        </AppBottomSheet>
      </View>
    </GestureHandlerRootView>
  );
};

export const displayResolvedLiane = (lianeRequest: ResolvedLianeRequest) => {
  return (
    <>
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
    </>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    backgroundColor: AppColors.white,
    justifyContent: "flex-start",
    flex: 1,
    height: "100%"
  }
});

import React, { useContext, useEffect, useMemo, useState } from "react";
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
import { CoLiane, CoMatch, getBoundingBox, ResolvedLianeRequest } from "@liane/common";
import { useAppWindowsDimensions } from "@/components/base/AppWindowsSizeProvider.tsx";
import { AppBottomSheet, AppBottomSheetHandleHeight, AppBottomSheetScrollView } from "@/components/base/AppBottomSheet.tsx";
import { GestureHandlerRootView } from "react-native-gesture-handler";

function isCoLiane(l: CoLiane | CoMatch): l is CoLiane {
  return (l as any).wayPoints;
}
export const LianeMapDetailScreen = () => {
  const { navigation, route } = useAppNavigation<"LianeMapDetail">();
  const lianeRequest = route.params.request;
  const { services, user } = useContext(AppContext);
  const { height } = useAppWindowsDimensions();
  const insets = useSafeAreaInsets();
  const [error, setError] = useState<Error | undefined>(undefined);
  const [bSheetTop, setBSheetTop] = useState<number>(0.55 * height);
  const [liane, setliane] = useState<CoLiane>();
  const [match, setMatch] = useState<CoMatch>();

  const mapBounds = useMemo(() => {
    if (!liane) {
      return undefined;
    }
    const bSheetTopPixels = bSheetTop > 1 ? bSheetTop : bSheetTop * height;
    const coordinates = liane!.wayPoints.map(w => [w.location.lng, w.location.lat]);
    if (match) {
      coordinates.push([match.pickup.location.lng, match.pickup.location.lat]);
      coordinates.push([match.deposit.location.lng, match.deposit.location.lat]);
    }
    const bbox = getBoundingBox(coordinates);
    bbox.paddingTop = 24;
    bbox.paddingLeft = 72;
    bbox.paddingRight = 72;
    bbox.paddingBottom = bSheetTopPixels + 24;
    return bbox;
  }, [liane, bSheetTop, height]);

  useEffect(() => {
    if (isCoLiane(route.params.liane)) {
      setliane(route.params.liane);
    } else {
      setMatch(route.params.liane);
      services.community.get(route.params.liane.liane).then(setliane);
    }
  }, [route.params.liane]);

  const joinLiane = async () => {
    if (!match) {
      navigation.navigate("Publish", {
        lianeId: liane?.id
      });
    } else if (lianeRequest && lianeRequest.id) {
      try {
        const result = await services.community.joinRequest(lianeRequest.id, match.liane);
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
    if (lianeRequest && lianeRequest.id && match) {
      try {
        const result = await services.community.accept(match.liane, lianeRequest.id);
        AppLogger.debug("COMMUNITIES", "Acceptation une liane avec succès", result);
        navigation.navigate("Lianes");
      } catch (e) {
        AppLogger.debug("COMMUNITIES", "Une erreur est survenue lors de l'acceptation d'une liane", error);
      }
    } else {
      AppLogger.debug("COMMUNITIES", "Pas de lianeRequest ID lors de l'acceptation", lianeRequest);
    }
  };

  const rejectLiane = async () => {
    if (lianeRequest && lianeRequest.id && match) {
      try {
        const result = await services.community.reject(match.liane, lianeRequest.id);
        AppLogger.debug("COMMUNITIES", "Acceptation une liane avec succès", result);
        navigation.navigate("Lianes");
      } catch (e) {
        AppLogger.debug("COMMUNITIES", "Une erreur est survenue lors de l'acceptation d'une liane", error);
      }
    } else {
      AppLogger.debug("COMMUNITIES", "Pas de lianeRequest ID lors de l'acceptation", lianeRequest);
    }
  };

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
          {liane && liane.id && <LianeMatchLianeRouteLayer wayPoints={liane.wayPoints} lianeId={liane.id} />}

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
        <AppBottomSheet
          onScrolled={v => setBSheetTop(v)}
          stops={[AppBottomSheetHandleHeight, 0.55, 1]}
          padding={{ top: 80 }}
          initialStop={1}
          backgroundStyle={{
            backgroundColor: AppColors.white
          }}>
          <AppBottomSheetScrollView style={{ paddingHorizontal: 12 }}>
            {match && match.type === "Single" && match.askToJoinAt ? (
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
                  <AppRoundedButton color={AppColors.black} onPress={rejectLiane} backgroundColor={AppColors.white} text={"Refuser "} />
                  <AppRoundedButton
                    color={defaultTextColor(AppColors.primaryColor)}
                    onPress={acceptLiane}
                    backgroundColor={AppColors.primaryColor}
                    text={"Accepter "}
                  />
                </View>
              </View>
            ) : !liane?.members.some(member => member.user.id === user?.id) ? (
              <View style={{ marginHorizontal: "20%" }}>
                <AppRoundedButton
                  color={defaultTextColor(AppColors.primaryColor)}
                  onPress={joinLiane}
                  backgroundColor={AppColors.primaryColor}
                  text={"Rejoindre "}
                />
              </View>
            ) : (
              <View
                style={{
                  paddingTop: 10
                }}
              />
            )}
            {liane && displayliane(liane)}
          </AppBottomSheetScrollView>
        </AppBottomSheet>
      </View>
    </GestureHandlerRootView>
  );
};

export const displayliane = (liane: ResolvedLianeRequest | CoLiane) => {
  return (
    <>
      <DisplayDays days={liane.weekDays} />
      <DisplayRallyingPoints
        wayPoints={liane.wayPoints}
        endTime={liane.arriveBefore}
        style={{ backgroundColor: AppColors.gray100, borderRadius: 20 }}
      />
      <DisplayRallyingPoints
        wayPoints={liane.wayPoints}
        inverseTravel
        startTime={liane.returnAfter}
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

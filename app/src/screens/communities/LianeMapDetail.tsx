import React, { useContext, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Center, Column, Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { useAppNavigation } from "@/components/context/routing";
import { AppColorPalettes, AppColors, ContextualColors } from "@/theme/colors";
import { AppLogger } from "@/api/logger.ts";
import AppMapView from "@/components/map/AppMapView.tsx";
import { AppContext } from "@/components/context/ContextProvider.tsx";
import { DisplayWayPoints } from "@/components/communities/DisplayWayPoints";
import { LianeMatchLianeRouteLayer } from "@/components/map/layers/LianeMatchRouteLayer.tsx";
import { WayPointDisplay } from "@/components/map/markers/WayPointDisplay.tsx";
import { CoLiane, CoMatch, getBoundingBox, WayPoint } from "@liane/common";
import { useAppWindowsDimensions } from "@/components/base/AppWindowsSizeProvider.tsx";
import { AppBottomSheet, AppBottomSheetHandleHeight } from "@/components/base/AppBottomSheet.tsx";
import { GestureHandlerRootView, ScrollView } from "react-native-gesture-handler";
import { DayOfTheWeekPicker } from "@/components/DayOfTheWeekPicker.tsx";
import { AppAvatars } from "@/components/UserPicture.tsx";
import { AppButton } from "@/components/base/AppButton.tsx";

function isLiane(l: CoLiane | CoMatch): l is CoLiane {
  return (l as any).wayPoints;
}

export const LianeMapDetailScreen = () => {
  const { navigation, route } = useAppNavigation<"LianeMapDetail">();
  const { liane: matchOrLiane, request: lianeRequest } = route.params;
  const { services, user } = useContext(AppContext);
  const { height } = useAppWindowsDimensions();
  const insets = useSafeAreaInsets();
  const [error, setError] = useState<Error | undefined>(undefined);
  const [bSheetTop, setBSheetTop] = useState<number>(0.55 * height);
  const [wayPoints, setWayPoints] = useState<WayPoint[]>([]);

  const lianeId = useMemo(() => (isLiane(matchOrLiane) ? matchOrLiane.id : matchOrLiane.liane), [matchOrLiane]);
  const match = useMemo(() => (isLiane(matchOrLiane) ? undefined : matchOrLiane), [matchOrLiane]);

  const members = useMemo(() => {
    if (isLiane(matchOrLiane)) {
      return matchOrLiane.members.map(m => m.user);
    } else {
      return matchOrLiane.members;
    }
  }, [matchOrLiane]);

  useEffect(() => {
    if (!lianeId) {
      return;
    }
    services.community.getTrip(lianeId, lianeRequest?.id).then(setWayPoints).catch(setError);
  }, [lianeId, lianeRequest, services.community]);

  const mapBounds = useMemo(() => {
    if (wayPoints.length === 0) {
      return;
    }

    const bSheetTopPixels = bSheetTop > 1 ? bSheetTop : bSheetTop * height;
    const coordinates = wayPoints.map(w => [w.rallyingPoint.location.lng, w.rallyingPoint.location.lat]);
    const bbox = getBoundingBox(coordinates);
    bbox.paddingTop = insets.top;
    bbox.paddingLeft = 100;
    bbox.paddingRight = 100;
    bbox.paddingBottom = bSheetTopPixels + 24;
    return bbox;
  }, [bSheetTop, height, insets.top, wayPoints]);

  const joinLiane = async () => {
    if (isLiane(matchOrLiane)) {
      navigation.navigate("Publish", { lianeId });
    } else if (lianeRequest && lianeRequest.id) {
      try {
        const result = await services.community.joinRequest(lianeRequest.id, matchOrLiane.liane);
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
    if (lianeRequest && lianeRequest.id && lianeId) {
      try {
        const result = await services.community.accept(lianeId, lianeRequest.id);
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
    if (lianeRequest && lianeRequest.id && lianeId) {
      try {
        const result = await services.community.reject(lianeId, lianeRequest.id);
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
      <View
        style={{
          flexDirection: "row",
          position: "absolute",
          top: insets.top + 25,
          left: 15,
          zIndex: 40,
          shadowColor: AppColors.black,
          elevation: 4
        }}>
        <AppButton
          onPress={() => navigation.goBack()}
          icon={"arrow-ios-back-outline"}
          color={AppColors.white}
          foregroundColor={AppColors.primaryColor}
        />
      </View>
      <AppMapView bounds={mapBounds}>
        {lianeId && <LianeMatchLianeRouteLayer wayPoints={wayPoints.map(w => w.rallyingPoint)} lianeId={lianeId} />}
        {wayPoints.map((w, i) => {
          let type: "to" | "from" | "step";
          if (i === 0) {
            type = "from";
          } else if (i === wayPoints.length - 1) {
            type = "to";
          } else {
            type = "step";
          }
          return <WayPointDisplay key={`liane_${w.rallyingPoint.id}`} rallyingPoint={w.rallyingPoint} type={type} />;
        })}
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
        stops={[AppBottomSheetHandleHeight, 0.5, 1]}
        padding={{ top: 80 }}
        initialStop={1}
        style={{
          backgroundColor: AppColorPalettes.gray[100]
        }}>
        <ScrollView style={{ paddingHorizontal: 10 }}>
          {match?.type === "Single" && match.askToJoinAt ? (
            <View
              style={{
                justifyContent: "center",
                alignItems: "center"
              }}>
              <AppText
                style={{
                  color: AppColorPalettes.gray[800],
                  fontSize: 16,
                  textAlign: "center"
                }}>{`Cette personne souhaite rejoindre votre liane`}</AppText>
              <Row>
                <AppButton onPress={rejectLiane} color={AppColors.white} value={"Refuser "} />
                <AppButton onPress={acceptLiane} color={AppColors.primaryColor} value={"Accepter "} />
              </Row>
            </View>
          ) : members.some(member => member.id === user?.id) ? (
            <View>
              <AppButton onPress={joinLiane} color={AppColors.primaryColor} value={"Rejoindre"} />
            </View>
          ) : (
            <View
              style={{
                paddingTop: 10
              }}
            />
          )}
          <Column spacing={10}>
            <DayOfTheWeekPicker selectedDays={matchOrLiane.weekDays} dualOptionMode={true} />
            <DisplayWayPoints wayPoints={wayPoints} style={{ backgroundColor: AppColorPalettes.gray[100], borderRadius: 20 }} />
            <AppAvatars users={members} size={40} max={10} />
          </Column>
        </ScrollView>
      </AppBottomSheet>
    </GestureHandlerRootView>
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

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
import { AppMapViewController } from "@/components/map/AppMapView.tsx";
import { AppContext } from "@/components/context/ContextProvider.tsx";
import { DisplayDays } from "@/components/communities/displayDaysView.tsx";
import { AppIcon } from "@/components/base/AppIcon.tsx";
import { extractWaypointFromTo } from "@/util/hooks/lianeRequest.ts";
import { DisplayRallyingPoints } from "@/components/communities/displayWaypointsView.tsx";

export const LianeMapDetailScreen = () => {
  const { navigation, route } = useAppNavigation<"LianeMapDetail">();
  const group = route.params.group;
  const lianeRequest = route.params.request;
  const { services } = useContext(AppContext);

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
          <View style={{ height: "30%", backgroundColor: AppColors.darkGray, width: "100%" }}>
            <AppText
              style={{
                fontWeight: "bold",
                fontSize: 14,
                lineHeight: 27,
                color: AppColors.black
              }}>{`Map`}</AppText>
          </View>
          <View style={{ width: "100%", height: "100%", backgroundColor: AppColors.white }}>
            <View style={{ paddingTop: 20 }}>
              {group.type === "Single" ? (
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

import React, { useMemo, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Center } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { useAppNavigation } from "@/components/context/routing";
import { AppPressableIcon } from "@/components/base/AppPressable";
import { AppColors, ContextualColors, defaultTextColor } from "@/theme/colors";
import { extractDays } from "@/util/hooks/days";
import { extractWaypointFromTo } from "@/util/hooks/lianeRequest.ts";
import { AppRoundedButton } from "@/components/base/AppRoundedButton.tsx";
import { HomeMap } from "@/screens/home/HomeMap.tsx";
import { AppLogger } from "@/api/logger.ts";
import { SearchModal } from "@/screens/home/HomeHeader.tsx";
import { getBoundingBox } from "@liane/common";
import { AppMapViewController } from "@/components/map/AppMapView.tsx";

export const LianeMapDetailScreen = () => {
  const { navigation, route } = useAppNavigation<"LianeMapDetail">();
  const groups = route.params.group;
  const lianeRequest = route.params.request;

  const insets = useSafeAreaInsets();
  const [error, setError] = useState<Error | undefined>(undefined);
  const { to, from } = useMemo(() => extractWaypointFromTo(lianeRequest?.wayPoints), [lianeRequest.wayPoints]);
  const daysReccurence = extractDays(lianeRequest?.weekDays);
  const appMapRef = useRef<AppMapViewController>(null);

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
          <View style={{ height: "50%", backgroundColor: AppColors.darkGray, width: "100%" }}>
            <AppText
              style={{
                fontWeight: "bold",
                fontSize: 14,
                lineHeight: 27,
                color: AppColors.black
              }}>{`Map`}</AppText>
          </View>
          <View style={{ width: "100%", height: "100%" }}>
            <View style={{ paddingTop: 20 }}>
              <View style={{ marginHorizontal: "20%" }}>
                <AppRoundedButton
                  color={defaultTextColor(AppColors.primaryColor)}
                  //onPress={requestJoin}
                  onPress={() => null}
                  backgroundColor={AppColors.primaryColor}
                  text={"Rejoindre cette liane"}
                />
              </View>

              <AppText
                style={{
                  fontWeight: "bold",
                  fontSize: 14,
                  lineHeight: 27,
                  color: AppColors.black,
                  paddingLeft: 10,
                  marginTop: 30
                }}>{`${from.city} => ${to.city}`}</AppText>
              <AppText
                style={{
                  paddingLeft: 15,
                  fontWeight: "400",
                  fontSize: 12,
                  lineHeight: 27,
                  color: AppColors.black
                }}>{`${daysReccurence}`}</AppText>
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
  },
  errorText: {
    color: ContextualColors.redAlert.text
  },
  header: {
    backgroundColor: AppColors.white,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: "center"
  },
  headerSubContent: {
    flex: 1,
    flexDirection: "row",
    paddingHorizontal: 20,
    backgroundColor: AppColors.lightGrayBackground,
    paddingVertical: 2,
    alignItems: "center",
    justifyContent: "space-between"
  },
  membersContainer: {
    marginTop: 170,
    height: "100%"
  },
  memberContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 8,
    paddingLeft: 15,
    paddingVertical: 10,
    backgroundColor: AppColors.white
  }
});

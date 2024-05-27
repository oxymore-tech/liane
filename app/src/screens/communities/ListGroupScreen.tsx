import React, { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Center, Column, Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { useAppNavigation } from "@/components/context/routing";
import { AppPressableIcon, AppPressableOverlay } from "@/components/base/AppPressable";
import { AppIcon } from "@/components/base/AppIcon";
import { UserPicture } from "@/components/UserPicture";
import { AppColors, ContextualColors } from "@/theme/colors";
import { SimpleModal } from "@/components/modal/SimpleModal";
import { Logger } from "@maplibre/maplibre-react-native";
import { AppLogger } from "@/api/logger";
import { extractDays } from "@/util/hooks/days";
import { CoLianeMatch, CoMatch, MatchGroup } from "@liane/common";
import { extractWaypointFromTo } from "@/util/hooks/lianeRequest";

export const ListGroupScreen = () => {
  const { navigation, route } = useAppNavigation<"ListGroups">();
  const groups = route.params.groups;
  const lianeRequest = route.params.lianeRequest;

  console.log("GRRRRR", groups);

  const insets = useSafeAreaInsets();
  const [error, setError] = useState<Error | undefined>(undefined);
  const { to, from, steps } = useMemo(() => extractWaypointFromTo(lianeRequest?.wayPoints), [lianeRequest.wayPoints]);
  const daysReccurence = extractDays(lianeRequest.weekDays);
  const localeTime = lianeRequest?.timeConstraints[0]
    ? `${lianeRequest?.timeConstraints[0]?.when?.start?.hour}h${lianeRequest?.timeConstraints[0]?.when?.start?.minute}`
    : "";

  const GroupItem = ({ group }: { group: CoMatch }) => (
    <Pressable onPress={() => navigation.navigate("CommunitiesChat", { group: group, request: lianeRequest })}>
      <View style={styles.memberContainer}>
        <View style={styles.memberInfo}>
          <View style={styles.textContainer}>
            <AppText style={styles.nameText}>{`${group.pickup.label} ➔ ${group.deposit.label}`}</AppText>
            <AppText style={styles.locationText}>{`${extractDays(group.weekDays)}`}</AppText>
            <AppText style={styles.timeText}>{`${(group as MatchGroup).matches?.length ?? 1} membre${
              (group as MatchGroup).matches?.length ? "s" : ""
            }`}</AppText>
          </View>
        </View>
        <View style={{ paddingRight: 10 }}>
          <AppIcon name={"arrow-right"} />
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.mainContainer}>
      {error && (
        <Center style={{ flex: 1 }}>
          <AppText style={{ color: ContextualColors.redAlert.text }}>{error.message}</AppText>
        </Center>
      )}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <AppPressableIcon onPress={() => navigation.goBack()} name={"arrow-ios-back-outline"} color={AppColors.primaryColor} size={32} />
          <AppText style={{ paddingLeft: 5, fontWeight: "bold", fontSize: 16, lineHeight: 27, color: AppColors.primaryColor }}>
            Lianes compatibles
          </AppText>
        </View>
        <View style={styles.headerSubContent}>
          <AppText style={{ paddingLeft: 35, fontWeight: "bold", fontSize: 14, lineHeight: 27, color: AppColors.white }}>{`${from} ➔ ${to}`}</AppText>
          <AppText
            style={{
              paddingLeft: 15,
              fontWeight: "400",
              fontSize: 12,
              lineHeight: 27,
              color: AppColors.white
            }}>{`${daysReccurence} ${localeTime}`}</AppText>
        </View>
      </View>
      <View style={styles.membersContainer}>
        <FlatList data={groups} renderItem={({ item }) => <GroupItem group={item} />} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    backgroundColor: AppColors.lightGrayBackground,
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
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: "center"
  },
  headerSubContent: {
    flex: 1,
    flexDirection: "row",
    width: "100%",
    backgroundColor: AppColors.primaryColor,
    paddingHorizontal: 16,
    paddingVertical: 2,
    alignItems: "center"
  },
  groupName: {
    fontSize: 24,
    fontWeight: "600",
    flexShrink: 1,
    lineHeight: 27,
    textAlign: "center",
    color: AppColors.white
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    width: "100%",
    paddingTop: 16,
    backgroundColor: AppColors.primaryColor
  },
  statBox: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColors.primaryColor,
    borderRadius: 10,
    padding: 10,
    margin: 5,
    width: "45%",
    borderWidth: 2,
    borderColor: AppColors.white
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    marginBottom: 8,
    width: 64,
    height: 64
  },
  iconText: {
    position: "absolute",
    color: AppColors.black,
    fontWeight: "bold",
    fontSize: 18
  },
  labelText: {
    fontSize: 14,
    color: AppColors.white,
    textAlign: "center"
  },
  membersContainer: {
    marginTop: 170,
    height: "100%"
  },
  membersTitle: {
    marginLeft: 5,
    marginBottom: 10,
    fontSize: 16,
    fontWeight: "600",
    flexShrink: 1,
    lineHeight: 24
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
  },
  memberInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  avatarContainer: {
    marginRight: 16
  },
  textContainer: {
    flex: 1
  },
  nameText: {
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 24
  },
  locationText: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 27,
    color: AppColors.black
  },
  timeText: {
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 16,
    color: AppColors.black
  }
});

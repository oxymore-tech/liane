import React, { useMemo } from "react";
import { Pressable, SectionList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { useAppNavigation } from "@/components/context/routing";
import { AppPressableIcon } from "@/components/base/AppPressable";
import { AppIcon } from "@/components/base/AppIcon";
import { AppColors, ContextualColors } from "@/theme/colors";
import { extractDays, extractTime } from "@/util/hooks/days";
import { ArrayUtils, CoMatch } from "@liane/common";
import { AppAvatars } from "@/components/UserPicture.tsx";
import { AppButton } from "@/components/base/AppButton.tsx";

type Status = "Pending" | "Received" | "None";
type Section = { data: CoMatch[]; status: Status };

export const MatchListScreen = () => {
  const { navigation, route } = useAppNavigation<"MatchList">();
  const matches = route.params.matches;
  const lianeRequest = route.params.lianeRequest;

  const insets = useSafeAreaInsets();

  const sections = useMemo(() => {
    return Object.entries(
      ArrayUtils.groupBy(matches, m => {
        if (m.type === "Single") {
          if (!m.joinRequest) {
            return "None";
          }
          return m.joinRequest.type;
        }
        return m.pendingRequest ? "Received" : "None";
      })
    ).map(([key, value]) => ({ data: value, status: key } as Section));
  }, [matches]);

  return (
    <View style={styles.mainContainer}>
      <Row
        style={{ paddingTop: insets.top, backgroundColor: AppColors.white, justifyContent: "flex-start", alignItems: "center", padding: 5 }}
        spacing={16}>
        <AppButton onPress={() => navigation.goBack()} icon={"arrow-ios-back-outline"} color={AppColors.primaryColor} />
        <AppText style={{ paddingLeft: 5, fontWeight: "bold", fontSize: 16, lineHeight: 27, color: AppColors.black }}>Lianes compatibles</AppText>
      </Row>
      <View style={[styles.membersContainer, { paddingTop: 15 }]}>
        <SectionList
          renderSectionHeader={renderSectionHeader}
          sections={sections}
          renderItem={({ item }) => (
            <GroupItem key={item.liane} group={item} onPress={() => navigation.navigate("LianeMapDetail", { liane: item, request: lianeRequest })} />
          )}
        />
      </View>
    </View>
  );
};

const renderSectionHeader = ({ section }: { section: Section }) => {
  let text = `${section.data.length} liane${section.data.length > 1 ? "s" : ""} disponible${section.data.length > 1 ? "s" : ""}`;
  if (section.status === "Pending") {
    text = `${section.data.length} demande${section.data.length > 1 ? "s" : ""} envoyée${section.data.length > 1 ? "s" : ""}`;
  }
  if (section.status === "Received") {
    text = `${section.data.length} demande${section.data.length > 1 ? "s" : ""} reçu${section.data.length > 1 ? "s" : ""}`;
  }

  return (
    <View style={styles.headerSection}>
      <AppText style={{ color: AppColors.black, fontWeight: "bold" }}>{text}</AppText>
    </View>
  );
};

type GroupItemProps = {
  group: CoMatch;
  onPress: () => void;
};

const GroupItem = ({ group, onPress }: GroupItemProps) => {
  return (
    <Pressable onPress={onPress} style={styles.memberContainer}>
      <View style={styles.memberInfo}>
        <View style={styles.textContainer}>
          <View style={{ flexDirection: "row" }}>
            <AppText style={styles.titleText}>{`${group.pickup.city} `}</AppText>
            <AppText style={styles.nameText}>{`- ${group.pickup.label}`}</AppText>
          </View>
          <View style={{ flexDirection: "row" }}>
            <AppText style={styles.titleText}>{`${group.deposit.city} `}</AppText>
            <AppText style={styles.nameText}>{`- ${group.deposit.label}`}</AppText>
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between"
            }}>
            <View style={{ flexDirection: "row" }}>
              <AppText style={styles.locationText}>{`${extractDays(group.weekDays)}`}</AppText>
              <AppText style={[styles.locationText, { marginLeft: 6 }]}>{`${extractTime(group.when)}`}</AppText>
            </View>
            <Row style={{ justifyContent: "flex-end", marginRight: 12 }}>
              <AppAvatars users={group.members} />
            </Row>
          </View>
        </View>
      </View>
      <View style={{ position: "absolute", top: 20, right: 15 }}>
        <AppIcon name={"arrow-right"} />
      </View>
    </Pressable>
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
  headerSection: {
    flexDirection: "row",
    justifyContent: "center"
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
    height: "100%"
  },
  memberContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.grayBackground,
    paddingLeft: 15,
    paddingVertical: 10,
    backgroundColor: AppColors.white
  },
  memberInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  textContainer: {
    flex: 1
  },
  titleText: {
    fontSize: 20,
    fontWeight: "bold",
    lineHeight: 24
  },
  nameText: {
    fontSize: 16,
    fontWeight: "normal",
    lineHeight: 24
  },
  locationText: {
    fontSize: 14,
    fontWeight: "normal",
    lineHeight: 27,
    color: AppColors.darkGray
  },
  timeText: {
    fontSize: 14,
    fontWeight: "normal",
    lineHeight: 16,
    color: AppColors.black
  },
  notificationDotContainer: {
    justifyContent: "center",
    alignItems: "center"
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 6,
    backgroundColor: AppColors.orange
  }
});

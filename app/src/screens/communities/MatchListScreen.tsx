import React, { useContext, useMemo } from "react";
import { Pressable, SectionList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Center, Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { useAppNavigation } from "@/components/context/routing";
import { AppIcon } from "@/components/base/AppIcon";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { extractDays, extractTime } from "@/util/hooks/days";
import { ArrayUtils, CoMatch } from "@liane/common";
import { AppAvatars } from "@/components/UserPicture.tsx";
import { AppButton } from "@/components/base/AppButton.tsx";
import { useObservable } from "@/util/hooks/subscription.ts";
import { AppContext } from "@/components/context/ContextProvider.tsx";

type Status = "Pending" | "Received" | "None";
type Section = { data: CoMatch[]; status: Status };

export const MatchListScreen = () => {
  const { services } = useContext(AppContext);
  const { navigation, route } = useAppNavigation<"MatchList">();
  const matches = route.params.matches;
  const lianeRequest = route.params.lianeRequest;
  const unread = useObservable(services.realTimeHub.unreadNotifications, {});

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

        return m.pendingRequest ? "Pending" : "None";
      })
    ).map(([key, value]) => ({ data: value, status: key } as Section));
  }, [matches]);

  return (
    <View style={styles.mainContainer}>
      <Row
        style={{ paddingTop: insets.top, backgroundColor: AppColors.white, justifyContent: "flex-start", alignItems: "center", padding: 16 }}
        spacing={16}>
        <AppButton onPress={() => navigation.goBack()} icon={"arrow-ios-back-outline"} color={AppColors.primaryColor} />
        <AppText style={{ paddingLeft: 5, fontWeight: "bold", fontSize: 16, lineHeight: 27, color: AppColors.black }}>Propositions</AppText>
      </Row>
      <SectionList
        style={styles.membersContainer}
        renderSectionHeader={renderSectionHeader}
        ListEmptyComponent={
          <Center>
            <AppText style={{ color: AppColors.black, fontSize: 16, fontWeight: "bold" }}>Nous n'avons rien à vous proposer :-(</AppText>
          </Center>
        }
        sections={sections}
        renderItem={({ item }) => (
          <GroupItem
            key={item.liane}
            unread={!!unread[item.liane]}
            group={item}
            onPress={() => navigation.navigate("LianeMapDetail", { liane: item, request: lianeRequest })}
          />
        )}
      />
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
  unread?: boolean;
  group: CoMatch;
  onPress: () => void;
};

const GroupItem = ({ group, onPress, unread }: GroupItemProps) => {
  return (
    <Pressable onPress={onPress} style={styles.memberContainer}>
      <View style={styles.memberInfo}>
        <View style={styles.textContainer}>
          <Row spacing={6}>
            <AppText style={styles.city}>{group.pickup.city}</AppText>
            <AppText style={styles.label}>{group.pickup.label}</AppText>
          </Row>
          <Row spacing={6}>
            <AppText style={styles.city}>{group.deposit.city}</AppText>
            <AppText style={styles.label}>{group.deposit.label}</AppText>
          </Row>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between"
            }}>
            <View style={{ flexDirection: "row" }}>
              <AppText style={styles.days}>{`${extractDays(group.weekDays)}`}</AppText>
              <AppText style={[styles.days, { marginLeft: 6 }]}>{`${extractTime(group.when)}`}</AppText>
            </View>
            <Row style={{ justifyContent: "flex-end", marginRight: 12 }}>
              <AppAvatars users={group.members} />
            </Row>
          </View>
          {unread && <View style={styles.dot} />}
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
  headerSection: {
    paddingTop: 16,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "center"
  },
  membersContainer: {
    paddingTop: 12,
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
  dot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 6,
    backgroundColor: AppColors.orange
  },
  city: {
    fontSize: 18,
    fontWeight: "bold",
    flexShrink: 1,
    lineHeight: 27,
    paddingRight: 8,
    color: AppColors.black
  },
  label: {
    fontSize: 16,
    fontWeight: "normal",
    flexShrink: 1,
    lineHeight: 27,
    color: AppColorPalettes.gray[500]
  },
  days: {
    fontSize: 15,
    fontWeight: "normal",
    flexShrink: 1,
    lineHeight: 20,
    color: AppColors.darkGray
  }
});

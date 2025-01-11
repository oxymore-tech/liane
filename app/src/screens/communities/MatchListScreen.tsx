import React, { useContext, useMemo } from "react";
import { Pressable, SectionList, StyleSheet, View } from "react-native";
import { Center, Column, Row } from "@/components/base/AppLayout";
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

const StatusOrder = {
  Pending: 1,
  Received: 2,
  None: 3
};

type Section = { data: CoMatch[]; status: Status };

export const MatchListScreen = () => {
  const { services } = useContext(AppContext);
  const { navigation, route } = useAppNavigation<"MatchList">();
  const matches = route.params.matches;
  const lianeRequest = route.params.lianeRequest;
  const unread = useObservable(services.realTimeHub.unreadNotifications, {});

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
    )
      .map(([key, value]) => ({ data: value, status: key }) as Section)
      .sort((a, b) => StatusOrder[a.status] - StatusOrder[b.status]);
  }, [matches]);

  return (
    <View style={styles.mainContainer}>
      <Row style={{ backgroundColor: AppColorPalettes.gray[100], justifyContent: "flex-start", alignItems: "center", padding: 16 }} spacing={16}>
        <AppButton onPress={() => navigation.goBack()} icon="arrow-left" color={AppColors.primaryColor} />
        <AppText style={{ paddingLeft: 5, fontWeight: "bold", fontSize: 16, lineHeight: 27, color: AppColors.black }}>Propositions</AppText>
      </Row>
      <SectionList
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

  const unread = section.status === "Pending" || section.status === "Received";

  return (
    <View style={styles.headerSection}>
      {unread && <View style={styles.dot} />}
      <AppText style={{ color: AppColors.black, fontWeight: "bold" }}>{text}</AppText>
    </View>
  );
};

type GroupItemProps = {
  unread?: boolean;
  group: CoMatch;
  onPress: () => void;
};

const GroupItem = ({ group, onPress }: GroupItemProps) => {
  return (
    <Pressable onPress={onPress} style={styles.memberContainer}>
      <View style={styles.memberInfo}>
        <View style={styles.textContainer}>
          <Column>
            <AppText style={styles.city}>{group.pickup.city}</AppText>
            <AppText style={styles.city}>{group.deposit.city}</AppText>
          </Column>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between"
            }}>
            <Column>
              <AppText style={styles.days}>{extractTime(group.when)}</AppText>
              <AppText style={styles.days}>{extractDays(group.weekDays)}</AppText>
            </Column>
            <Row style={{ justifyContent: "flex-end", marginRight: 12 }}>
              <AppAvatars users={group.members} />
            </Row>
          </View>
        </View>
      </View>
      <View style={{ position: "absolute", top: 20, right: 15 }}>
        <AppIcon name="arrow-right" />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    backgroundColor: AppColors.grayBackground,
    justifyContent: "flex-start",
    flex: 1
  },
  headerSection: {
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center"
  },
  memberContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    marginHorizontal: 8,
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
    width: 14,
    height: 14,
    borderRadius: 14,
    backgroundColor: AppColorPalettes.orange[500],
    borderColor: AppColors.white,
    borderWidth: 1
  },
  city: {
    fontSize: 16,
    fontWeight: "bold",
    flexShrink: 1,
    lineHeight: 27,
    paddingRight: 8,
    color: AppColors.black
  },
  days: {
    fontSize: 15,
    fontWeight: "normal",
    flexShrink: 1,
    lineHeight: 20,
    color: AppColors.darkGray
  }
});

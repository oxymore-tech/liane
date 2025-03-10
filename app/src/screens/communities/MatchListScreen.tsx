import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ImageBackground, Pressable, SectionList, StyleSheet, View } from "react-native";
import { Column, Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { useAppNavigation } from "@/components/context/routing";
import { AppIcon } from "@/components/base/AppIcon";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { extractDays, extractTime } from "@/util/hooks/days";
import { ArrayUtils, CoLianeMatch, CoMatch, Detached } from "@liane/common";
import { AppAvatars } from "@/components/UserPicture.tsx";
import { AppButton } from "@/components/base/AppButton.tsx";
import { useObservable } from "@/util/hooks/subscription.ts";
import { AppContext } from "@/components/context/ContextProvider.tsx";
import { LianeQueryKey, useLianeMatchQuery } from "@/util/hooks/query.ts";
import { GestureHandlerRootView, RefreshControl } from "react-native-gesture-handler";
import { ModalLianeRequestItem } from "@/components/communities/ModalLianeRequestItemView.tsx";
import { useQueryClient } from "react-query";
import { Wallpapers } from "@/components/base/Wallpapers.ts";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Status = "Pending" | "Received" | "None";

const StatusOrder = {
  Pending: 1,
  Received: 2,
  None: 3
};

type Section = { data: CoMatch[]; status: Status };

export const MatchListScreen = () => {
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { services } = useContext(AppContext);
  const { navigation, route } = useAppNavigation<"MatchList">();

  const unread = useObservable(services.realTimeHub.unreadNotifications, {});

  const { data, isFetching, refetch } = useLianeMatchQuery(route.params.lianeRequest);

  const [state, setState] = useState<CoLianeMatch<Detached>>();

  useEffect(() => {
    if (!data) {
      return;
    }

    if (data.state.type === "Attached") {
      navigation.popToTop();
      navigation.navigate("CommunitiesChat", { liane: data.state.liane.id! });
      return;
    }

    if (data.state.type === "Detached") {
      setState(data as CoLianeMatch<Detached>);
      return;
    }
  }, [data, navigation]);

  const sections = useMemo(() => {
    if (!state) {
      return [];
    }

    return Object.entries(
      ArrayUtils.groupBy(state.state.matches, m => {
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
  }, [state]);

  const handleRefresh = useCallback(
    async (deleted: boolean) => {
      await queryClient.invalidateQueries(LianeQueryKey);
      if (deleted) {
        navigation.popToTop();
      }
    },
    [navigation, queryClient]
  );

  const [myModalVisible, setMyModalVisible] = useState(false);

  return (
    <GestureHandlerRootView style={styles.mainContainer}>
      <ImageBackground source={Wallpapers[0]} style={{ flex: 1 }}>
        <Row style={[styles.header, { paddingTop: insets.top }]} spacing={16}>
          <AppButton onPress={() => navigation.goBack()} icon="arrow-left" color={AppColorPalettes.gray[800]} />
          <AppText style={{ paddingLeft: 5, fontWeight: "bold", fontSize: 24, lineHeight: 27, color: AppColorPalettes.gray[800] }}>
            {state?.lianeRequest?.name}
          </AppText>
          <AppButton onPress={() => setMyModalVisible(true)} icon="edit" color={AppColorPalettes.gray[800]} />
        </Row>
        <SectionList
          renderSectionHeader={renderSectionHeader}
          refreshing={isFetching}
          refreshControl={<RefreshControl refreshing={isFetching || !state} onRefresh={refetch} />}
          ListEmptyComponent={
            <View style={styles.headerSection}>
              <AppText style={{ color: AppColorPalettes.gray[800], fontSize: 18, fontWeight: "bold" }}>
                {!isFetching && !!state ? "Nous n'avons rien à vous proposer :-(" : "Recherche de propostions..."}
              </AppText>
            </View>
          }
          sections={sections}
          renderItem={({ item }) => (
            <GroupItem
              key={item.liane}
              unread={!!unread[item.liane]}
              group={item}
              onPress={() => navigation.navigate("LianeMapDetail", { liane: item, request: state?.lianeRequest })}
            />
          )}
        />
        <ModalLianeRequestItem
          lianeRequest={state?.lianeRequest}
          onRefresh={handleRefresh}
          myModalVisible={myModalVisible}
          setMyModalVisible={setMyModalVisible}
        />
      </ImageBackground>
    </GestureHandlerRootView>
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
      <AppText style={{ color: AppColorPalettes.gray[800], fontWeight: "bold", fontSize: 18 }}>{text}</AppText>
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
  header: {
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.4)"
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
    borderWidth: 1,
    marginRight: 5
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

import { JoinLianeRequestDetailed, Liane, UTCDateTime } from "@/api";
import { extractDatePart } from "@/util/datetime";
import { Pressable, RefreshControl, SectionBase, SectionList, SectionListData, SectionListRenderItemInfo, StyleSheet, View } from "react-native";
import { useAppNavigation } from "@/api/navigation";
import { getLianeStatusStyle } from "@/components/trip/trip";
import React, { useContext, useMemo } from "react";
import { AppContext } from "@/components/context/ContextProvider";
import { useObservable } from "@/util/hooks/subscription";
import { LianeView } from "@/components/trip/LianeView";
import { AppIcon } from "@/components/base/AppIcon";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { UserPicture } from "@/components/UserPicture";
import { JoinRequestSegmentOverview } from "@/components/trip/JoinRequestSegmentOverview";
import { capitalize } from "@/util/strings";
import { formatMonthDay } from "@/api/i18n";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface TripSection extends SectionBase<Liane | JoinLianeRequestDetailed> {
  date: string;
}

export interface TripListViewProps {
  data: (Liane | JoinLianeRequestDetailed)[];
  isFetching?: boolean;
  onRefresh?: () => void;
}
export const TripListView = ({ data, isFetching, onRefresh }: TripListViewProps) => {
  const insets = useSafeAreaInsets();
  const sections = useMemo(() => {
    return convertToDateSections(data);
  }, [data]);
  return (
    <SectionList
      refreshControl={<RefreshControl refreshing={isFetching || false} onRefresh={onRefresh} />}
      sections={sections}
      showsVerticalScrollIndicator={false}
      renderItem={renderItem}
      keyExtractor={item => item.id!}
      renderSectionHeader={renderSectionHeader}
      renderSectionFooter={s => <View style={{ height: s.section === sections[sections.length - 1] ? 96 + insets.bottom : 24 }} />}
    />
  );
};

const isResolvedJoinLianeRequest = (item: Liane | JoinLianeRequestDetailed): item is JoinLianeRequestDetailed => {
  return (item as JoinLianeRequestDetailed).targetLiane !== undefined;
};
const convertToDateSections = (data: (Liane | JoinLianeRequestDetailed)[]): TripSection[] =>
  Object.entries(
    data.reduce((tmp, item) => {
      const liane: Liane = isResolvedJoinLianeRequest(item) ? item.targetLiane : item;
      // Use date for grouping
      const group = extractDatePart(liane.departureTime);
      // Add item to this group (or create the group)

      if (!tmp[group]) {
        tmp[group] = [item];
      } else {
        tmp[group].unshift(item);
      }
      // add this item to its group

      return tmp;
    }, {} as { [key: UTCDateTime]: (Liane | JoinLianeRequestDetailed)[] })
  )
    .map(([group, items]) => ({ date: group, data: items } as TripSection))
    .sort((a, b) => -a.date.localeCompare(b.date));

const renderLianeItem = ({ item, index, section }: SectionListRenderItemInfo<Liane, TripSection>) => {
  const { navigation } = useAppNavigation();
  const [statusText, color] = getLianeStatusStyle(item);

  const { services, user } = useContext(AppContext);
  const unread = useObservable(services.realTimeHub.unreadConversations, undefined);
  const driver = item.members.find(l => l.user.id === item.driver.user)!.user;
  return (
    <Pressable
      onPress={() => {
        navigation.navigate({
          name: "LianeDetail",
          params: { liane: item }
        });
      }}
      style={[styles.item, styles.grayBorder, index === section.data.length - 1 ? styles.itemLast : {}]}>
      <View>
        <Row style={{ alignItems: "center", marginBottom: 8 }} spacing={8}>
          <UserPicture url={undefined} size={24} id={driver.id} />
          <AppText style={{ fontSize: 14, fontWeight: "500" }}>{driver.id === user!.id ? "Moi" : driver.pseudo}</AppText>
        </Row>
        <View style={{ flexGrow: 1, marginRight: 40 }}>
          <LianeView liane={item} />
        </View>
        {item.conversation && item.state !== "Archived" && item.state !== "Canceled" && (
          <Pressable
            onPress={() => navigation.navigate("Chat", { conversationId: item.conversation, liane: item })}
            style={{ alignItems: "flex-end", position: "absolute", padding: 4, top: -8, right: -4 }}>
            <AppIcon name={"message-circle-full"} size={32} color={AppColors.blue} />
            {unread && unread.includes(item.conversation) && (
              <View
                style={{
                  backgroundColor: AppColors.orange,
                  borderRadius: 16,
                  padding: 6,
                  top: 4,
                  right: 4,
                  position: "absolute"
                }}
              />
            )}
          </Pressable>
        )}
      </View>
      <Row
        style={{ flex: 1, justifyContent: "flex-start", paddingTop: 8, borderTopWidth: 1, marginTop: 16, borderColor: AppColorPalettes.gray[100] }}
        spacing={8}>
        {statusText && (
          <Row
            style={{
              paddingHorizontal: 4,
              paddingVertical: 4,
              borderRadius: 4,
              alignItems: "center",
              alignSelf: "center",
              backgroundColor: color
            }}>
            <AppText>{statusText}</AppText>
          </Row>
        )}
        <View style={{ flex: 1 }} />
        {(item.state === "NotStarted" || item.state === "Started") && (
          <Row style={{ position: "relative", left: 12 * (item.members.length - 1) }}>
            {item.members
              .filter(m => m.user.id !== driver.id)
              .map((m, i) => {
                return (
                  <View key={m.user.id} style={{ position: "relative", left: -12 * i }}>
                    <UserPicture size={24} url={m.user.pictureUrl} id={m.user.id} />
                  </View>
                );
              })}
          </Row>
        )}
        {item.state === "Finished" && (
          <Pressable
            onPress={() => {
              navigation.navigate("OpenValidateTrip", { liane: item });
            }}>
            <Row style={{ alignItems: "center", borderRadius: 16, backgroundColor: AppColors.blue, padding: 4, paddingLeft: 12 }} spacing={8}>
              <AppText style={{ fontWeight: "bold", color: AppColors.white }}>Valider ce trajet</AppText>
              <AppIcon name={"arrow-circle-right-outline"} color={AppColors.white} />
            </Row>
          </Pressable>
        )}
      </Row>

      <View style={{ position: "absolute", right: 16, top: -16 }} />
    </Pressable>
  );
};

const renderItem = ({ item, index, section }: SectionListRenderItemInfo<Liane | JoinLianeRequestDetailed, TripSection>) => {
  const isRequest = isResolvedJoinLianeRequest(item);
  // console.debug(JSON.stringify(item));
  if (!isRequest) {
    // @ts-ignore
    return renderLianeItem({ item, index, section });
  }

  // else render join request
  const { navigation } = useAppNavigation();
  return (
    <Pressable
      onPress={() => {
        navigation.navigate({
          name: "LianeJoinRequestDetail",
          params: { request: item }
        });
      }}
      style={[styles.item, styles.grayBorder, index === section.data.length - 1 ? styles.itemLast : {}]}>
      <View>
        <View style={{ flexGrow: 1, marginRight: 40 }}>
          <JoinRequestSegmentOverview request={item} />
        </View>
      </View>

      <Row
        style={{ flex: 1, justifyContent: "flex-start", paddingTop: 8, borderTopWidth: 1, marginTop: 16, borderColor: AppColorPalettes.gray[100] }}
        spacing={8}>
        <Row
          style={{
            paddingHorizontal: 4,
            paddingVertical: 2,
            borderRadius: 4,
            alignItems: "center",
            backgroundColor: AppColorPalettes.gray[100]
          }}>
          <AppText>En attente de validation</AppText>
        </Row>
      </Row>
    </Pressable>
  );
};
const renderSectionHeader = ({ section: { date } }: { section: SectionListData<Liane | JoinLianeRequestDetailed, TripSection> }) => (
  <View style={[styles.header, styles.grayBorder]}>
    <AppText style={styles.headerTitle}>{capitalize(formatMonthDay(new Date(date)))}</AppText>
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    height: "100%"
  },
  grayBorder: {
    borderColor: AppColorPalettes.gray[200]
  },
  header: {
    backgroundColor: AppColorPalettes.yellow[500],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopRightRadius: 16,
    borderTopLeftRadius: 16,
    borderWidth: 1
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600"
  },
  item: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: AppColors.white,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1
  },
  itemLast: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16
  }
});

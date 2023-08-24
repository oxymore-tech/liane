import React, { useContext, useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Pressable,
  RefreshControl,
  SectionBase,
  SectionList,
  SectionListData,
  SectionListRenderItemInfo,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";

import { JoinLianeRequestDetailed, Liane, UTCDateTime, User } from "@/api";
import { formatMonthDay } from "@/api/i18n";
import { useAppNavigation } from "@/api/navigation";

import { AppContext } from "@/components/context/ContextProvider";
import { LianeView } from "@/components/trip/LianeView";
import { LianeStatusView } from "@/components/trip/LianeStatusView";
import { AppIcon } from "@/components/base/AppIcon";
import { Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { UserPicture } from "@/components/UserPicture";
import { JoinRequestSegmentOverview } from "@/components/trip/JoinRequestSegmentOverview";

import { AppColorPalettes, AppColors } from "@/theme/colors";
import { extractDatePart } from "@/util/datetime";
import { useObservable } from "@/util/hooks/subscription";
import { capitalize } from "@/util/strings";

export interface TripSection extends SectionBase<Liane | JoinLianeRequestDetailed> {
  date: string;
}

export interface TripListViewProps {
  data: (Liane | JoinLianeRequestDetailed)[];
  isFetching?: boolean;
  onRefresh?: () => void;
  reverseSort?: boolean;
}

export const TripListView = ({ data, isFetching, onRefresh, reverseSort }: TripListViewProps) => {
  const insets = useSafeAreaInsets();
  const sections = useMemo(() => {
    return convertToDateSections(data, reverseSort ?? false);
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

const convertToDateSections = (data: (Liane | JoinLianeRequestDetailed)[], reverseSort: boolean): TripSection[] =>
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
    .sort((a, b) => (reverseSort ? -a.date.localeCompare(b.date) : a.date.localeCompare(b.date)));

const renderLianeItem = ({ item, index, section }: SectionListRenderItemInfo<Liane, TripSection>) => {
  const { navigation } = useAppNavigation();

  const { services, user } = useContext(AppContext);
  const unread = useObservable(services.realTimeHub.unreadConversations, undefined);
  const driver = useMemo(() => item.members.find(l => l.user.id === item.driver.user)!.user, [item]);

  return (
    <Pressable
      style={[styles.item, styles.grayBorder, index === section.data.length - 1 ? styles.itemLast : {}]}
      onPress={() => navigation.navigate({ name: "LianeDetail", params: { liane: item } })}>
      <View>
        <Row style={styles.driverContainer} spacing={8}>
          <UserPicture url={driver?.pictureUrl} size={24} id={driver.id} />
          {["Finished", "Archived", "Canceled"].includes(item.state) &&
            item.members
              .filter(m => m.user.id !== driver.id)
              .map((m, index) => (
                <UserPicture
                  style={{ position: "absolute", left: index * 8, zIndex: -index }}
                  id={m.user.id}
                  url={m.user.pictureUrl}
                  size={24}
                  borderWidth={2}
                  borderColor={AppColors.white}
                />
              ))}
          <AppText style={styles.driverText}>{driver.id === user!.id ? "Moi" : driver.pseudo}</AppText>
        </Row>
        <View style={styles.lianeContainer}>
          <LianeView liane={item} />
        </View>

        {item.conversation && item.state !== "Archived" && item.state !== "Canceled" && (
          <Pressable onPress={() => navigation.navigate("Chat", { conversationId: item.conversation, liane: item })} style={styles.chatButton}>
            <AppIcon name={"message-circle-full"} size={32} color={AppColors.blue} />
            {unread && unread.includes(item.conversation) && <View style={styles.chatBadge} />}
          </Pressable>
        )}
      </View>

      <Row style={styles.statusRowContainer} spacing={8}>
        <Row style={[styles.statusText]}>
          {true || !["Finished", "Archived", "Canceled"].includes(item.state) ? (
            <LianeStatusView liane={item} />
          ) : (
            <TouchableOpacity style={styles.relaunchStatus} onPress={() => relaunchLiane(item, driver)}>
              <AppText>Relancer la liane</AppText>
            </TouchableOpacity>
          )}
        </Row>
        <View style={{ flex: 1 }} />

        {["NotStarted", "Started"].includes(item.state) && (
          <Row style={{ position: "relative", left: 12 * (item.members.length - 1) }}>
            {item.members
              .filter(m => m.user.id !== driver.id)
              .map((m, i) => (
                <View key={m.user.id} style={{ position: "relative", left: -12 * i }}>
                  <UserPicture size={24} url={m.user.pictureUrl} id={m.user.id} />
                </View>
              ))}
          </Row>
        )}

        {item.state === "Finished" && (
          <Pressable onPress={() => navigation.navigate("OpenValidateTrip", { liane: item })}>
            <Row style={styles.validationContainer} spacing={8}>
              <AppText style={styles.validationText}>Valider ce trajet</AppText>
              <AppIcon name={"arrow-circle-right-outline"} color={AppColors.white} />
            </Row>
          </Pressable>
        )}
      </Row>

      <View style={styles.bottomView} />
    </Pressable>
  );
};

const renderItem = ({ item, index, section }: SectionListRenderItemInfo<Liane | JoinLianeRequestDetailed, TripSection>) => {
  const isRequest = isResolvedJoinLianeRequest(item);
  if (!isRequest) {
    // @ts-ignore
    return renderLianeItem({ item, index, section });
  }

  // else render join request
  const { navigation } = useAppNavigation();
  const driver = useMemo(() => item.targetLiane.members.find(l => l.user.id === item.targetLiane.driver.user)!.user, [item]);
  return (
    <Pressable
      onPress={() => navigation.navigate({ name: "LianeJoinRequestDetail", params: { request: item } })}
      style={[styles.item, styles.grayBorder, index === section.data.length - 1 ? styles.itemLast : {}]}>
      <View>
        <Row style={styles.driverContainer} spacing={8}>
          <UserPicture url={driver?.pictureUrl} size={24} id={driver.id} />
          <AppText style={styles.driverText}>{driver.pseudo}</AppText>
        </Row>
        <View style={styles.lianeContainer}>
          <JoinRequestSegmentOverview request={item} />
        </View>
      </View>

      <Row style={styles.statusRowContainer} spacing={8}>
        <Row style={styles.statusContainer}>
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

const relaunchLiane = (liane: Liane, driver: User) => {
  if (liane.driver.user === driver.id) {
    // CASE Driver
    // TODO: new screen or modal to give choice of passengers to send notif, then navigate to publish screen pre-filled
  } else {
    // CASE Passenger
    // TODO: Send proposition to driver to join existing Liane or create a new one if no path already exists
  }
};

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
  },
  driverContainer: {
    alignItems: "center",
    marginBottom: 8
  },
  driverText: {
    fontSize: 14,
    fontWeight: "500"
  },
  lianeContainer: {
    flexGrow: 1,
    marginRight: 40
  },
  chatButton: {
    alignItems: "flex-end",
    position: "absolute",
    padding: 4,
    top: -8,
    right: -4
  },
  chatBadge: {
    backgroundColor: AppColors.orange,
    borderRadius: 16,
    padding: 6,
    top: 4,
    right: 4,
    position: "absolute"
  },
  statusText: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: 4,
    alignItems: "center",
    alignSelf: "center"
  },
  relaunchStatus: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: AppColorPalettes.gray[100]
  },
  statusRowContainer: {
    flex: 1,
    justifyContent: "flex-start",
    paddingTop: 8,
    borderTopWidth: 1,
    marginTop: 16,
    borderColor: AppColorPalettes.gray[100]
  },
  statusContainer: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    alignItems: "center",
    backgroundColor: AppColorPalettes.gray[100]
  },
  validationContainer: {
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: AppColors.blue,
    padding: 4,
    paddingLeft: 12
  },
  validationText: {
    fontWeight: "bold",
    color: AppColors.white
  },
  bottomView: {
    position: "absolute",
    right: 16,
    top: -16
  }
});

import React, { useContext, useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Pressable,
  RefreshControl,
  SectionBase,
  SectionList,
  SectionListData,
  SectionListRenderItemInfo,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View
} from "react-native";

import { JoinLianeRequestDetailed, Liane, UTCDateTime, User, Ref } from "@/api";
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
import { getTripFromJoinRequest, getTripFromLiane } from "@/components/trip/trip";
import { AppStyles } from "@/theme/styles";

export interface TripSection extends SectionBase<Liane | JoinLianeRequestDetailed> {
  date: string;
}

export interface TripListViewProps {
  data: (Liane | JoinLianeRequestDetailed)[];
  isFetching?: boolean;
  onRefresh?: () => void;
  reverseSort?: boolean;
  loadMore?: () => void;
}

export const TripListView = ({ data, isFetching, onRefresh, reverseSort, loadMore }: TripListViewProps) => {
  const insets = useSafeAreaInsets();
  const { user } = useContext(AppContext);
  const userId = user!.id!;
  const sections = useMemo(() => {
    return convertToDateSections(data, userId, reverseSort);
  }, [data, userId, reverseSort]);
  return (
    <SectionList
      style={{ flex: 1 }}
      refreshControl={<RefreshControl refreshing={isFetching || false} onRefresh={onRefresh} />}
      sections={sections}
      showsVerticalScrollIndicator={false}
      renderItem={renderItem}
      keyExtractor={item => item.id!}
      renderSectionHeader={renderSectionHeader}
      onEndReachedThreshold={0.2}
      onEndReached={loadMore}
      renderSectionFooter={s => <View style={{ height: s.section === sections[sections.length - 1] ? 96 + insets.bottom : 24 }} />}
    />
  );
};

const isResolvedJoinLianeRequest = (item: Liane | JoinLianeRequestDetailed): item is JoinLianeRequestDetailed => {
  return (item as JoinLianeRequestDetailed).targetLiane !== undefined;
};

const convertToDateSections = (data: (Liane | JoinLianeRequestDetailed)[], member: Ref<User>, reverseSort: boolean = false): TripSection[] =>
  Object.entries(
    data.reduce((tmp, item) => {
      const departureTime = isResolvedJoinLianeRequest(item)
        ? getTripFromJoinRequest(item).departureTime
        : getTripFromLiane(item, member).departureTime;

      // Use date for grouping
      const group = extractDatePart(departureTime);

      // Add item to this group (or create the group)
      if (!tmp[group]) {
        tmp[group] = [{ departureTime, item }];
      } else {
        tmp[group].unshift({ departureTime, item });
      }
      // add this item to its group
      return tmp;
    }, {} as { [key: UTCDateTime]: { departureTime: UTCDateTime; item: Liane | JoinLianeRequestDetailed }[] })
  )
    .map(
      ([group, items]) =>
        ({
          date: group,
          data: items.sort((a, b) => a.departureTime.localeCompare(b.departureTime)).map(i => i.item)
        } as TripSection)
    )
    .sort((a, b) => (reverseSort ? -a.date.localeCompare(b.date) : a.date.localeCompare(b.date)));

const renderLianeItem = ({ item, index, section }: SectionListRenderItemInfo<Liane, TripSection>) => {
  const { navigation } = useAppNavigation();
  const { services, user } = useContext(AppContext);

  const unread = useObservable(services.realTimeHub.unreadConversations, undefined);
  const driver = useMemo(() => item.members.find(l => l.user.id === item.driver.user)!.user, [item]);

  const [geolocalisationEnabled, setGeolocalisationEnabled] = useState<boolean>(false);

  return (
    <Pressable
      style={[styles.item, styles.grayBorder, index === section.data.length - 1 ? styles.itemLast : {}, index === 0 ? styles.itemFirst : {}]}
      onPress={() => navigation.navigate({ name: "LianeDetail", params: { liane: item } })}>
      <View>
        <Row style={styles.driverContainer}>
          <Row spacing={8}>
            <UserPicture url={driver.pictureUrl} size={38} id={driver.id} />
            <AppText style={styles.driverText}>{driver.id === user!.id ? "Moi" : driver.pseudo}</AppText>
          </Row>
          <Row spacing={8}>
            <AppText style={[styles.geolocText, { color: geolocalisationEnabled ? AppColors.primaryColor : AppColorPalettes.gray[400] }]}>
              Géolocalisation
            </AppText>
            <Switch
              style={styles.geolocSwitch}
              trackColor={{ false: AppColors.grayBackground, true: AppColors.primaryColor }}
              thumbColor={geolocalisationEnabled ? AppColors.primaryColor : AppColors.grayBackground}
              ios_backgroundColor={AppColors.grayBackground}
              value={geolocalisationEnabled}
              onValueChange={() => setGeolocalisationEnabled(!geolocalisationEnabled)}></Switch>
          </Row>
        </Row>

        <View style={styles.lianeContainer}>
          <LianeView liane={item} />
        </View>
      </View>

      <Row style={styles.infoRowContainer} spacing={8}>
        <Row style={AppStyles.center}>
          {!["Finished", "Archived", "Canceled"].includes(item.state) ? (
            <LianeStatusView liane={item} />
          ) : (
            <TouchableOpacity onPress={() => relaunchLiane(item, driver)}>
              <Row style={styles.validationContainer} spacing={8}>
                <AppText style={styles.validationText}>Relancer la liane</AppText>
              </Row>
            </TouchableOpacity>
          )}
        </Row>
        <Row>
          <Row style={styles.infoContainer}>
            <AppText style={styles.infoText}>{item.members.length}</AppText>
            <AppIcon style={styles.infoIcon} name={"seat"} size={24} color={AppColorPalettes.gray[500]}></AppIcon>
          </Row>
          <Row style={styles.infoContainer}>
            <AppText style={styles.infoText}>10€</AppText>
          </Row>
        </Row>
      </Row>

      {item.state === "Finished" && (
        <Pressable onPress={() => navigation.navigate("OpenValidateTrip", { liane: item })}>
          <Row style={styles.validationContainer} spacing={8}>
            <AppText style={styles.validationText}>Valider ce trajet</AppText>
            <AppIcon name={"arrow-circle-right-outline"} color={AppColors.white} />
          </Row>
        </Pressable>
      )}

      <Row style={styles.statusRowContainer} spacing={8}>
        {["NotStarted", "Started"].includes(item.state) && (
          <Row style={{ position: "relative", left: 12 * (item.members.length - 1) }}>
            {item.members
              .filter(m => m.user.id !== driver.id)
              .map((m, i) => (
                <View key={m.user.id} style={{ position: "relative", left: -12 * (i + 1) }}>
                  <UserPicture size={32} url={m.user.pictureUrl} id={m.user.id} />
                </View>
              ))}
          </Row>
        )}

        {!!item.conversation && item.state !== "Archived" && item.state !== "Canceled" && (
          <Pressable onPress={() => navigation.navigate("Chat", { conversationId: item.conversation, liane: item })} style={styles.chatButton}>
            <AppIcon name={"message-circle-outline"} size={38} color={AppColorPalettes.gray[500]} />
            {unread?.includes(item.conversation) && <View style={styles.chatBadge} />}
          </Pressable>
        )}
      </Row>
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
  <View style={styles.header}>
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
    padding: 12
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "bold"
  },
  item: {
    padding: 8,
    backgroundColor: AppColors.white,
    borderBottomWidth: 1
  },
  itemFirst: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16
  },
  itemLast: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingBottom: 0,
    borderBottomWidth: 0
  },
  driverContainer: {
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8
  },
  driverText: {
    fontSize: 16,
    fontWeight: "500"
  },
  geolocText: {
    marginBottom: -2
  },
  geolocSwitch: {
    marginBottom: -4
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
  relaunchStatus: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: AppColorPalettes.gray[100]
  },
  statusRowContainer: {
    flex: 1,
    alignItems: "center",
    marginTop: 8
  },
  infoRowContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16
  },
  infoContainer: {
    paddingHorizontal: 4
  },
  infoTravel: {
    fontSize: 16,
    marginLeft: 6,
    color: AppColorPalettes.gray[500]
  },
  infoText: {
    fontSize: 14,
    color: AppColorPalettes.gray[600]
  },
  infoIcon: {
    marginTop: 2
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
    backgroundColor: AppColors.primaryColor,
    padding: 4,
    paddingLeft: 12
  },
  validationText: {
    fontWeight: "bold",
    color: AppColors.white,
    marginRight: 8
  },
  bottomView: {
    position: "absolute",
    right: 16,
    top: -16
  }
});

import React, { useContext, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SectionBase,
  SectionList,
  SectionListData,
  SectionListRenderItemInfo,
  StyleSheet,
  View
} from "react-native";
import { capitalize, extractDatePart, getUserTrip, Liane, Ref, User, UTCDateTime } from "@liane/common";
import { AppLocalization } from "@/api/i18n";
import { useAppNavigation } from "@/components/context/routing";
import { AppContext } from "@/components/context/ContextProvider";
import { LianeStatusView } from "@/components/trip/LianeStatusView";
import { AppIcon } from "@/components/base/AppIcon";
import { Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { UserPicture } from "@/components/UserPicture";
import { AppColorPalettes, AppColors, WithAlpha } from "@/theme/colors";
import { WayPointsView } from "@/components/trip/WayPointsView";
import { TripGeolocationProvider, useCarDelay } from "@/screens/detail/TripGeolocationProvider";
import { AppPressableOverlay } from "@/components/base/AppPressable";
import { startGeolocationService } from "@/screens/detail/components/GeolocationSwitch";
import { useTripStatus } from "@/components/trip/trip";
import { useObservable } from "@/util/hooks/subscription";
import { AppLogger } from "@/api/logger";

export interface TripSection extends SectionBase<Liane> {
  date: string;
}

export interface TripListViewProps {
  data: Liane[];
  isFetching?: boolean;
  onRefresh?: () => void;
  reverseSort?: boolean;
  loadMore?: () => void;
}

export const TripListView = ({ data, isFetching, onRefresh, reverseSort, loadMore }: TripListViewProps) => {
  //const insets = useSafeAreaInsets();
  const bottom = 32; //96 + insets.bottom;
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
      renderItem={renderLianeItem}
      keyExtractor={item => item.id!}
      renderSectionHeader={renderSectionHeader}
      onEndReachedThreshold={0.2}
      onEndReached={loadMore}
      renderSectionFooter={s => <View style={{ height: s.section === sections[sections.length - 1] ? bottom : 24 }} />}
    />
  );
};

const convertToDateSections = (data: Liane[], member: Ref<User>, reverseSort: boolean = false): TripSection[] =>
  Object.entries(
    data.reduce((tmp, item) => {
      const departureTime = getUserTrip(item, member).departureTime;

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
    }, {} as { [key: UTCDateTime]: { departureTime: UTCDateTime; item: Liane }[] })
  )
    .map(
      ([group, items]) =>
        ({
          date: group,
          data: items.sort((a, b) => a.departureTime.localeCompare(b.departureTime)).map(i => i.item)
        } as TripSection)
    )
    .sort((a, b) => (reverseSort ? -a.date.localeCompare(b.date) : a.date.localeCompare(b.date)));

const LianeItem = ({ item }: { item: Liane }) => {
  const { navigation } = useAppNavigation();
  const { services, user } = useContext(AppContext);

  const unread = useObservable(services.realTimeHub.unreadConversations, undefined);
  const driver = useMemo(() => item.members.find(l => l.user.id === item.driver.user)!.user, [item]);
  const { wayPoints } = useMemo(() => getUserTrip(item, user!.id!), [item, user]);
  const carLocation = useCarDelay();
  const me = useMemo(() => item.members.find(l => l.user.id === user!.id)!, [item.members, user]);
  const geolocationDisabled = !me.geolocationLevel || me.geolocationLevel === "None";
  const status = useTripStatus(item);
  return (
    <View>
      <View>
        <Row style={styles.driverContainer}>
          <Row spacing={8} style={{ flex: 4 }}>
            <UserPicture url={driver.pictureUrl} size={38} id={driver.id} />
            <AppText style={styles.driverText}>{driver.id === user!.id ? "Moi" : driver.pseudo}</AppText>
          </Row>
          {!["Finished", "Archived", "Canceled"].includes(item.state) && <LianeStatusView liane={item} />}
          {/* <Row spacing={8} style={{ flex: 3 }}>
            <AppText style={[styles.geolocText, { color: geolocalisationEnabled ? AppColors.primaryColor : AppColorPalettes.gray[400] }]}>
              Géolocalisation
            </AppText>
            <Switch
              style={styles.geolocSwitch}
              trackColor={{ false: AppColors.grayBackground, true: AppColors.primaryColor }}
              thumbColor={geolocalisationEnabled ? AppColors.primaryColor : AppColors.grayBackground}
              ios_backgroundColor={AppColors.grayBackground}
              value={geolocalisationEnabled}
              onValueChange={() => setGeolocalisationEnabled(!geolocalisationEnabled)}
            />
          </Row>*/}
        </Row>

        <View style={styles.lianeContainer}>
          <WayPointsView wayPoints={wayPoints} carLocation={carLocation} />
        </View>
      </View>

      {!["Finished", "Archived", "Canceled"].includes(item.state) && (
        <Row style={styles.infoRowContainer} spacing={8}>
          <Row style={{ alignItems: "center" }}>
            <AppIcon name={"navigation-2-outline"} color={geolocationDisabled ? AppColorPalettes.gray[400] : AppColors.primaryColor} size={16} />
            <AppText style={{ color: geolocationDisabled ? AppColorPalettes.gray[400] : AppColors.primaryColor }}>
              Géolocalisation {geolocationDisabled ? "désactivée" : "activée"}
            </AppText>
          </Row>

          <Row style={styles.statusRowContainer} spacing={8}>
            {["NotStarted", "Started"].includes(item.state) && (
              <Row style={{ position: "absolute", right: 42 }}>
                {item.members
                  .filter(m => m.user.id !== driver.id)
                  .map((m, i) => (
                    <View
                      key={m.user.id}
                      style={{ position: "absolute", top: -16, right: 18 * (item.members.filter(m => m.user.id !== driver.id).length - (1 + i)) }}>
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
        </Row>
      )}
      {status === "StartingSoon" && <View style={{ height: 44 }} />}
      {status === "StartingSoon" || (status === "Started" && item.state === "NotStarted" && <StartButton item={item} />)}
    </View>
  );
};

const StartButton = ({ item }: { item: Liane }) => {
  const [loading, setLoading] = useState(false);
  const { services } = useContext(AppContext);
  return (
    <AppPressableOverlay
      backgroundStyle={{
        position: "absolute",
        bottom: 0,
        left: -16,
        right: -16,
        backgroundColor: AppColors.primaryColor,
        borderBottomRightRadius: 16,
        borderBottomLeftRadius: 16
      }}
      onPress={() => {
        setLoading(true);
        services.liane
          .start(item.id!)
          .then(() => startGeolocationService(item))
          .catch(e => {
            AppLogger.error("GEOPINGS", e);
          })
          .finally(() => setLoading(false));
      }}>
      <Row style={{ paddingVertical: 8, paddingHorizontal: 16 }} spacing={8}>
        {!loading && <AppIcon name={"play-circle"} color={AppColors.white} />}
        {loading && <ActivityIndicator size="small" color={AppColors.white} />}
        <AppText style={{ color: AppColors.white, fontSize: 18 }}>Démarrer maintenant</AppText>
      </Row>
    </AppPressableOverlay>
  );
};
const renderLianeItem = ({ item, index, section }: SectionListRenderItemInfo<Liane, TripSection>) => {
  const { navigation } = useAppNavigation();

  return (
    <Pressable
      style={[
        styles.item,
        styles.grayBorder,
        item.members.length > 1 ? {} : styles.disabledItem,
        index === section.data.length - 1 ? styles.itemLast : {},
        index === 0 ? styles.itemFirst : {}
      ]}
      onPress={() => navigation.navigate({ name: "LianeDetail", params: { liane: item } })}>
      <TripGeolocationProvider liane={item}>
        <LianeItem item={item} />
      </TripGeolocationProvider>
    </Pressable>
  );
};

const renderSectionHeader = ({ section: { date } }: { section: SectionListData<Liane, TripSection> }) => (
  <View style={styles.header}>
    <AppText style={styles.headerTitle}>{capitalize(AppLocalization.formatMonthDay(new Date(date)))}</AppText>
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
    padding: 6,
    paddingBottom: 12,
    backgroundColor: AppColors.lightGrayBackground
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "bold"
  },
  disabledItem: { backgroundColor: WithAlpha(AppColors.white, 0.7) },
  item: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
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
    fontWeight: "500",
    alignSelf: "center"
  },
  geolocText: {
    marginBottom: -2,
    alignSelf: "center"
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
    backgroundColor: AppColors.primaryColor,
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
    marginVertical: 8,
    height: 32
  },
  infoRowContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2
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
    paddingLeft: 12,
    marginHorizontal: 4
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

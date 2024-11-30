import React, { useCallback, useContext, useMemo, useState } from "react";

import { FlatList, ListRenderItemInfo, Pressable, RefreshControl, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { getUserTrip, Liane } from "@liane/common";
import { useAppNavigation } from "@/components/context/routing";
import { AppContext } from "@/components/context/ContextProvider";
import { LianeStatusView } from "@/components/trip/LianeStatusView";
import { Center, Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { UserPicture } from "@/components/UserPicture";
import { AppColorPalettes, AppColors, WithAlpha } from "@/theme/colors";
import { WayPointsView } from "@/components/trip/WayPointsView";
import { TripGeolocationProvider, useCarDelay } from "@/screens/detail/TripGeolocationProvider";
import { AppPressableOverlay } from "@/components/base/AppPressable";
import { startGeolocationService } from "@/screens/detail/components/GeolocationSwitch";
import { useTripStatus } from "@/components/trip/trip";
import { AppLogger } from "@/api/logger";
import { AppStyles } from "@/theme/styles.ts";
import { TripQueryKey } from "@/screens/user/MyTripsScreen.tsx";
import { useQueryClient } from "react-query";
import { AppButton } from "@/components/base/AppButton.tsx";
import { AppModalNavigationContext } from "@/components/AppModalNavigationProvider.tsx";

export interface TripListViewProps {
  data: Liane[];
  style?: StyleProp<ViewStyle>;
  isFetching?: boolean;
  onRefresh?: () => void;
  reverseSort?: boolean;
  loadMore?: () => void;
}

export const TripListView = ({ data, style, isFetching, onRefresh, loadMore }: TripListViewProps) => {
  const { user } = useContext(AppContext);
  const userId = user!.id!;
  const isTripStarted = data.some(liane => liane.state === "Started");

  return (
    <FlatList
      style={style}
      refreshControl={<RefreshControl refreshing={isFetching || false} onRefresh={onRefresh} />}
      data={data}
      showsVerticalScrollIndicator={false}
      renderItem={props => renderLianeItem({ ...props, isTripStarted })}
      keyExtractor={item => item.id!}
      onEndReachedThreshold={0.2}
      onEndReached={loadMore}
      ListEmptyComponent={
        <Center>
          <AppText style={AppStyles.noData}>Aucun trajet prévu</AppText>
        </Center>
      }
    />
  );
};

const LianeItem = ({ item, isTripStarted }: { item: Liane; isTripStarted: boolean }) => {
  const { user } = useContext(AppContext);
  const { navigation } = useAppNavigation();

  const driver = useMemo(() => item.members.find(l => l.user.id === item.driver.user)!.user, [item]);
  const { wayPoints } = useMemo(() => getUserTrip(item, user!.id!), [item, user]);
  const carLocation = useCarDelay();
  const status = useTripStatus(item);

  return (
    <View style={{ paddingBottom: 10 }}>
      <View>
        <Row style={styles.driverContainer}>
          <Row>
            <AppPressableOverlay
              style={{
                borderRadius: 20,
                borderWidth: 2,
                borderColor: AppColors.lightGrayBackground
              }}
              onPress={e => {
                navigation.navigate("CommunitiesChat", { lianeId: item.liane });
                e.preventDefault();
              }}>
              <AppText style={{ color: AppColors.black, fontSize: 18, paddingVertical: 6, paddingHorizontal: 16 }}>Accéder au chat</AppText>
            </AppPressableOverlay>
          </Row>
          {status === "StartingSoon" && (isTripStarted ? <LianeStatusView liane={item} /> : <StartButton item={item} />)}
          {status === "Started" && (
            <View
              style={{
                backgroundColor: AppColors.primaryColor,
                borderRadius: 20
              }}>
              <Row style={{ paddingVertical: 6, paddingHorizontal: 16 }} spacing={8}>
                <AppText style={{ color: AppColors.white, fontSize: 18 }}>En cours</AppText>
              </Row>
            </View>
          )}
          {["Finished", "Archived", "Canceled"].includes(item.state) && <LianeStatusView liane={item} />}
        </Row>

        <View style={styles.lianeContainer}>
          <WayPointsView wayPoints={wayPoints} carLocation={carLocation} />
        </View>
      </View>

      {!["Finished", "Archived", "Canceled"].includes(item.state) && item.members.length > 1 && (
        <Row style={styles.infoRowContainer} spacing={8}>
          <Row style={styles.statusRowContainer} spacing={8}>
            {["NotStarted", "Started"].includes(item.state) && (
              <Row style={{ position: "absolute", right: 42 }}>
                {item.members.map((m, i) => (
                  <View
                    key={m.user.id}
                    style={{ position: "absolute", top: -16, right: 18 * (item.members.filter(u => u.user.id !== driver.id).length - (1 + i)) }}>
                    <UserPicture size={32} url={m.user.pictureUrl} id={m.user.id} />
                  </View>
                ))}
              </Row>
            )}
          </Row>
        </Row>
      )}
    </View>
  );
};

const StartButton = ({ item }: { item: Liane }) => {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const { services } = useContext(AppContext);
  const { showTutorial, shouldShow } = useContext(AppModalNavigationContext);

  const handle = useCallback(async () => {
    setLoading(true);
    try {
      if (shouldShow) {
        showTutorial("driver", item.id);
      }
      await services.liane.start(item.id!);
      await queryClient.invalidateQueries(TripQueryKey);
      await startGeolocationService(item);
    } catch (e) {
      AppLogger.error("GEOPINGS", e);
    } finally {
      setLoading(false);
    }
  }, [item, queryClient, services.liane, shouldShow, showTutorial]);

  return <AppButton color={AppColors.primaryColor} loading={loading} onPress={handle} value="C'est parti ?" />;
};
const renderLianeItem = ({ item, index, isTripStarted }: ListRenderItemInfo<Liane> & { isTripStarted: boolean }) => {
  const { navigation } = useAppNavigation();

  return (
    <Pressable
      style={[styles.item, styles.grayBorder, item.members.length > 1 ? {} : styles.disabledItem, index === 0 ? styles.itemFirst : {}]}
      onPress={() => {
        navigation.navigate({ name: "LianeDetail", params: { liane: item } });
      }}>
      <TripGeolocationProvider liane={item}>
        <LianeItem item={item} isTripStarted={isTripStarted} />
      </TripGeolocationProvider>
    </Pressable>
  );
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
    paddingBottom: 10
  },
  driverText: {
    fontSize: 16,
    fontWeight: "bold",
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

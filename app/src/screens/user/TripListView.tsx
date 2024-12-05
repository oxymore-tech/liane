import React, { useCallback, useContext, useState } from "react";

import { FlatList, ListRenderItemInfo, Pressable, RefreshControl, StyleProp, StyleSheet, ViewStyle } from "react-native";
import { IncomingTrip, Trip } from "@liane/common";
import { useAppNavigation } from "@/components/context/routing";
import { AppContext } from "@/components/context/ContextProvider";
import { Center } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { AppColorPalettes, AppColors, WithAlpha } from "@/theme/colors";
import { startGeolocationService } from "@/screens/detail/components/GeolocationSwitch";
import { AppLogger } from "@/api/logger";
import { AppStyles } from "@/theme/styles.ts";
import { TripQueryKey } from "@/screens/user/TripScheduleScreen";
import { useQueryClient } from "react-query";
import { AppButton } from "@/components/base/AppButton.tsx";
import { AppModalNavigationContext } from "@/components/AppModalNavigationProvider.tsx";
import { TripItem } from "@/screens/user/TripItem.tsx";

export interface TripListViewProps {
  data: IncomingTrip[];
  style?: StyleProp<ViewStyle>;
  isFetching?: boolean;
  onRefresh?: () => void;
  reverseSort?: boolean;
  loadMore?: () => void;
}

export const TripListView = ({ data, style, isFetching = false, onRefresh, loadMore }: TripListViewProps) => {
  const { navigation } = useAppNavigation();
  const isTripStarted = data.some(liane => liane.trip.state === "Started");

  const onSelect = useCallback(
    (trip: Trip) => {
      navigation.navigate({ name: "TripDetail", params: { trip } });
    },
    [navigation]
  );

  return (
    <FlatList
      style={style}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={onRefresh} />}
      data={data}
      showsVerticalScrollIndicator={false}
      renderItem={props => <TripItem {...props} />}
      keyExtractor={item => item.trip.id!}
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
//
// const LianeItem = ({ item, isTripStarted }: { item: IncomingTrip; isTripStarted: boolean }) => {
//   const { user } = useContext(AppContext);
//   const { navigation } = useAppNavigation();
//
//   const driver = useMemo(() => item.trip.members.find(l => l.user.id === item.trip.driver.user)!.user, [item]);
//   const { wayPoints } = useMemo(() => getUserTrip(item.trip, user!.id!), [item, user]);
//   const carLocation = useCarDelay();
//   const status = useTripStatus(item.trip);
//
//   return (
//     <View style={{ paddingBottom: 10 }}>
//       <View>
//         <Row style={styles.driverContainer}>
//           <Row>
//             <AppPressableOverlay
//               style={{
//                 borderRadius: 20,
//                 borderWidth: 2,
//                 borderColor: AppColors.lightGrayBackground
//               }}
//               onPress={e => {
//                 navigation.navigate("CommunitiesChat", { lianeId: item.liane });
//                 e.preventDefault();
//               }}>
//               <AppText style={{ color: AppColors.black, fontSize: 18, paddingVertical: 6, paddingHorizontal: 16 }}>Accéder au chat</AppText>
//             </AppPressableOverlay>
//           </Row>
//           {status === "StartingSoon" && (isTripStarted ? <TripStatusView liane={item} /> : <StartButton item={item} />)}
//           {status === "Started" && (
//             <View
//               style={{
//                 backgroundColor: AppColors.primaryColor,
//                 borderRadius: 20
//               }}>
//               <Row style={{ paddingVertical: 6, paddingHorizontal: 16 }} spacing={8}>
//                 <AppText style={{ color: AppColors.white, fontSize: 18 }}>En cours</AppText>
//               </Row>
//             </View>
//           )}
//           {["Finished", "Archived", "Canceled"].includes(item.state) && <TripStatusView liane={item} />}
//         </Row>
//
//         <View style={styles.lianeContainer}>
//           <WayPointsView wayPoints={wayPoints} carLocation={carLocation} />
//         </View>
//       </View>
//
//       {!["Finished", "Archived", "Canceled"].includes(item.state) && item.members.length > 1 && (
//         <Row style={styles.infoRowContainer} spacing={8}>
//           <Row style={styles.statusRowContainer} spacing={8}>
//             {["NotStarted", "Started"].includes(item.state) && (
//               <Row style={{ position: "absolute", right: 42 }}>
//                 {item.members.map((m, i) => (
//                   <View
//                     key={m.user.id}
//                     style={{ position: "absolute", top: -16, right: 18 * (item.members.filter(u => u.user.id !== driver.id).length - (1 + i)) }}>
//                     <UserPicture size={32} url={m.user.pictureUrl} id={m.user.id} />
//                   </View>
//                 ))}
//               </Row>
//             )}
//           </Row>
//         </Row>
//       )}
//     </View>
//   );
// };

const StartButton = ({ item }: { item: Trip }) => {
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
      await services.trip.start(item.id!);
      await queryClient.invalidateQueries(TripQueryKey);
      await startGeolocationService(item);
    } catch (e) {
      AppLogger.error("GEOPINGS", e);
    } finally {
      setLoading(false);
    }
  }, [item, queryClient, services.trip, shouldShow, showTutorial]);

  return <AppButton color={AppColorPalettes.pink[500]} loading={loading} onPress={handle} value="C'est parti ?" />;
};

const renderLianeItem = ({
  item,
  isTripStarted,
  onSelect
}: ListRenderItemInfo<IncomingTrip> & { isTripStarted: boolean; onSelect: (item: Trip) => void }) => {
  return (
    <Pressable
      style={[styles.item, item.trip.members.length > 1 ? {} : styles.disabledItem]}
      onPress={() => {
        onSelect(item.trip);
      }}
    />
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
    marginVertical: 4,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: AppColors.white,
    borderRadius: 16
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

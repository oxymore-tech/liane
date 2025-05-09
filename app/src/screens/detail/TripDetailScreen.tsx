import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import AppMapView from "@/components/map/AppMapView";
import { AppBottomSheet, AppBottomSheetHandleHeight } from "@/components/base/AppBottomSheet";
import { Column, Row } from "@/components/base/AppLayout";
import { FloatingBackButton } from "@/components/FloatingBackButton";
import { getBoundingBox, getTotalDistance, getTripCostContribution, getTripFromMatch, getUserTrip, LianeMatch, Trip } from "@liane/common";
import { useAppNavigation } from "@/components/context/routing";
import { AppContext } from "@/components/context/ContextProvider";
import { GestureHandlerRootView, ScrollView } from "react-native-gesture-handler";
import { useQuery } from "react-query";
import { AppText } from "@/components/base/AppText";
import { TripGeolocationProvider, useCarDelay, useTrackingInfo } from "@/screens/detail/TripGeolocationProvider";
import { LianeMatchUserRouteLayer } from "@/components/map/layers/LianeMatchRouteLayer";
import { InfoItem } from "@/screens/detail/components/InfoItem";
import { WayPointDisplay } from "@/components/map/markers/WayPointDisplay";
import { AppIcon } from "@/components/base/AppIcon";
import { TripMembers } from "@/components/UserPicture";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { AppStyles } from "@/theme/styles";
import { WayPointsView } from "@/components/trip/WayPointsView";
import { LianeProofDisplay } from "@/components/map/layers/LianeProofDisplay";
import { LocationMarker } from "@/screens/detail/components/LocationMarker";
import { TripDetailQueryKey } from "@/util/hooks/query.ts";
import { TripActions } from "@/components/trip/TripActions.tsx";

export const TripDetailScreen = () => {
  const { services, user } = useContext(AppContext);
  const { route } = useAppNavigation<"TripDetail">();
  const tripParam = route.params.trip;

  const { data: trip, refetch } = useQuery(TripDetailQueryKey(typeof tripParam === "string" ? tripParam : tripParam.id!), () => {
    if (typeof tripParam === "string") {
      return services.trip.get(tripParam);
    } else {
      return services.trip.get(tripParam.id!);
    }
  });

  useEffect(() => {
    // Refresh page if object passed as param has changed
    if (typeof tripParam !== "string") {
      refetch().then();
    }
  }, [refetch, tripParam]);

  const match = useMemo(() => (trip ? toLianeMatch(trip, user!.id!) : undefined), [trip, user]);

  const handleUpdate = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return (
    <TripGeolocationProvider trip={trip}>
      <LianeDetailPage match={match} onUpdate={handleUpdate} />
    </TripGeolocationProvider>
  );
};

const LianeDetailPage = ({ match, onUpdate }: { match?: LianeMatch; onUpdate: () => void }) => {
  const { navigation } = useAppNavigation();

  const [bSheetTop, setBSheetTop] = useState<number>(0);

  const tripMatch = useMemo(() => (match ? getTripFromMatch(match) : undefined), [match]);

  const mapBounds = useMemo(() => {
    if (!match) {
      return undefined;
    }
    const bbox = getBoundingBox(tripMatch!.wayPoints.map(w => [w.rallyingPoint.location.lng, w.rallyingPoint.location.lat]));
    bbox.paddingTop = 24;
    bbox.paddingLeft = 100;
    bbox.paddingRight = 100;
    bbox.paddingBottom = bSheetTop + 50 + 24;
    return bbox;
  }, [match, bSheetTop, tripMatch]);

  const driver = useMemo(() => match?.trip.members.find(m => m.user.id === match?.trip.driver.user)!.user, [match]);
  const trackingInfo = useTrackingInfo();
  const notInCar = useMemo(() => {
    if (!trackingInfo?.otherMembers || !match) {
      return [];
    }
    const members = Object.keys(trackingInfo.otherMembers);
    return members
      .map(m => {
        const info = trackingInfo.otherMembers[m];
        return { user: match.trip.members.find(lm => lm.user.id === m)!.user, info: { ...info, position: info.location! } };
      })
      .filter(m => !!m.info.position);
  }, [trackingInfo, match]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.page}>
        <AppMapView bounds={mapBounds}>
          {match && <LianeMatchUserRouteLayer match={match} />}

          {notInCar.map(p => (
            <LocationMarker key={p.user.id} user={p.user} info={p.info} isCar={false} />
          ))}

          {tripMatch?.wayPoints.map((w, i) => {
            let type: "to" | "from" | "step";
            if (i === 0) {
              type = "from";
            } else if (i === tripMatch.wayPoints.length - 1) {
              type = "to";
            } else {
              type = "step";
            }
            return <WayPointDisplay key={w.rallyingPoint.id} rallyingPoint={w.rallyingPoint} type={type} />;
          })}

          {driver && tripMatch && trackingInfo?.car && <LocationMarker isCar={true} user={driver} info={trackingInfo?.car} />}
          {match && ["Finished", "Archived"].includes(match.trip.state) && <LianeProofDisplay id={match.trip.id!} />}
        </AppMapView>
        <AppBottomSheet onChange={v => setBSheetTop(v)} snapPoints={[AppBottomSheetHandleHeight, "50%", "100%"]} index={1} dark={false}>
          {match && (
            <ScrollView style={{ paddingHorizontal: 12, backgroundColor: AppColorPalettes.gray[100], paddingBottom: 100 }}>
              <TripDetailView liane={match} onUpdate={onUpdate} />
            </ScrollView>
          )}

          {!match && <ActivityIndicator style={[AppStyles.center, AppStyles.fullHeight]} color={AppColors.primaryColor} size="large" />}
        </AppBottomSheet>
        <FloatingBackButton onPress={navigation.goBack} />
      </View>
    </GestureHandlerRootView>
  );
};

const toLianeMatch = (trip: Trip, memberId: string): LianeMatch => {
  const m = trip.members.find(u => u.user.id === memberId)!;
  const pickup = m ? trip.wayPoints.find(w => w.rallyingPoint.id === m.from)!.rallyingPoint.id! : trip.wayPoints[0].rallyingPoint.id!;
  const deposit = m
    ? trip.wayPoints.find(w => w.rallyingPoint.id === m.to)!.rallyingPoint.id!
    : trip.wayPoints[trip.wayPoints.length - 1].rallyingPoint.id!;
  return {
    trip,
    match: {
      type: "Exact",
      pickup: pickup,
      deposit: deposit
    },
    freeSeatsCount: trip.members.map(l => l.seatCount).reduce((acc, c) => acc + c, 0)
  };
};

export const TripWithDateView = (props: { trip: Trip; showPassengers?: boolean }) => {
  const { user } = useContext(AppContext);
  const { wayPoints } = useMemo(() => getUserTrip(props.trip, user!.id!), [props.trip, user]);
  const lastDriverLocUpdate = useCarDelay();
  return <WayPointsView wayPoints={wayPoints} carLocation={lastDriverLocUpdate} />;
};

const TripDetailView = ({ liane, onUpdate }: { liane: LianeMatch; onUpdate: () => void }) => {
  const { user } = useContext(AppContext);
  const { wayPoints: currentTrip } = useMemo(() => getTripFromMatch(liane), [liane]);
  const userTripDistance = Math.ceil(getTotalDistance(currentTrip) / 1000);

  const tripPrice = getTripCostContribution(liane.trip);

  const booked = useMemo(() => {
    const member = liane.trip.members.find(m => m.user.id === liane.trip.driver.user);
    return !!member && member.seatCount > 0;
  }, [liane.trip.driver.user, liane.trip.members]);

  return (
    <Column style={styles.bottomContainer}>
      <View>
        <TripMembers trip={liane.trip} showStatus={true} />
        <TripWithDateView trip={liane.trip} showPassengers />
      </View>

      {!["Finished", "Archived", "Canceled"].includes(liane.trip.state) && (
        <Row style={styles.statusLianeContainer}>
          <TripActions trip={liane.trip} booked={booked} onUpdate={onUpdate} user={user} />
        </Row>
      )}

      <Row style={styles.resumeContainer} spacing={4}>
        <Column style={{ flex: 1 }} spacing={4}>
          <Row>
            <Row style={AppStyles.center}>
              <AppIcon name="arrow-right" size={12} color={AppColorPalettes.gray[500]} />
              <AppText style={styles.infoTravel}>Aller simple</AppText>
            </Row>
          </Row>
          <Row>
            <InfoItem icon="twisting-arrow" value={userTripDistance + " km"} />
          </Row>
          <Row>
            <InfoItem
              icon="seat"
              value={liane.freeSeatsCount > 0 ? "Reste " + liane.freeSeatsCount + " place" + (liane.freeSeatsCount > 1 ? "s" : "") : "Complet"}
            />
          </Row>
        </Column>

        <Column>
          <View style={styles.verticalLine} />
        </Column>

        <Column style={{ flex: 1 }}>
          {liane.trip.members
            .filter(member => member.user.id !== liane.trip.driver.user)
            .map(member => (
              <Row key={member.user.id}>
                <AppText style={styles.infoTravel}>{member.user.pseudo}</AppText>
                <View style={styles.horizontalLine} />
                <AppText style={styles.infoTravel}>{tripPrice.byMembers[member.user.id!].toFixed(2)} €</AppText>
              </Row>
            ))}
          <Row style={{ marginTop: 12 }}>
            <AppText style={[styles.infoTravel, { fontWeight: "bold", color: AppColors.fontColor }]}>Total</AppText>
            <View style={styles.horizontalLine} />
            <AppText style={[styles.infoTravel, { fontWeight: "bold", color: AppColors.fontColor }]}>{tripPrice.total.toFixed(2)} €</AppText>
          </Row>
        </Column>
      </Row>
    </Column>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    height: "100%",
    width: "100%"
  },
  bottomContainer: {
    borderRadius: 20,
    marginTop: 12,
    padding: 8,
    backgroundColor: AppColors.backgroundColor
  },
  statusLianeContainer: {
    paddingVertical: 8,
    justifyContent: "space-between"
  },
  infoTravel: {
    fontSize: 14,
    marginLeft: 6,
    color: AppColorPalettes.gray[500]
  },
  resumeContainer: {
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 12
  },
  verticalLine: {
    borderColor: AppColorPalettes.gray[100],
    borderLeftWidth: 1,
    flexGrow: 1,
    flexShrink: 2,
    alignSelf: "center"
  },
  horizontalLine: {
    borderColor: AppColorPalettes.gray[300],
    borderBottomWidth: 1,
    flexGrow: 1,
    flexShrink: 2,
    alignSelf: "center",
    marginHorizontal: 8
  }
});

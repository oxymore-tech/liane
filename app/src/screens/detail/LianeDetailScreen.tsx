import React, { useContext, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import AppMapView from "@/components/map/AppMapView";
import { AppBottomSheet, AppBottomSheetHandleHeight, AppBottomSheetScrollView, BottomSheetRefProps } from "@/components/base/AppBottomSheet";
import { Center, Column, Row } from "@/components/base/AppLayout";
import { DetailedLianeMatchView } from "@/components/trip/WayPointsView";
import { LineSeparator, SectionSeparator } from "@/components/Separator";
import { FloatingBackButton } from "@/components/FloatingBackButton";
import { Exact, getPoint, JoinLianeRequestDetailed, Liane, LianeMatch, UnionUtils } from "@/api";
import { getLianeStatus, getTotalDistance, getTotalDuration, getTripMatch } from "@/components/trip/trip";
import { capitalize } from "@/util/strings";
import { formatMonthDay } from "@/api/i18n";
import { formatDuration } from "@/util/datetime";
import { useAppNavigation } from "@/api/navigation";
import { AppContext } from "@/components/context/ContextProvider";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { getBoundingBox } from "@/util/geometry";
import { useAppWindowsDimensions } from "@/components/base/AppWindowsSizeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "react-query";
import { JoinRequestDetailQueryKey, LianeDetailQueryKey } from "@/screens/user/MyTripsScreen";
import { AppText } from "@/components/base/AppText";
import { TripGeolocationProvider } from "@/screens/detail/TripGeolocationProvider";
import { DriverLocationMarker } from "@/components/map/markers/DriverLocationMarker";
import { LianeMatchRouteLayer } from "@/components/map/layers/LianeMatchRouteLayer";
import { LianeActionRow } from "@/screens/detail/components/LianeActionRow";
import { LianeActionsView } from "@/screens/detail/components/LianeActionsView";
import { InfoItem } from "@/screens/detail/components/InfoItem";
import { DriverInfo } from "@/screens/detail/components/DriverInfo";
import { PassengerListView } from "@/screens/detail/components/PassengerListView";
import { LianeStatusRow } from "@/screens/detail/components/LianeStatusRow";
import { WayPointActionView } from "@/screens/detail/components/WayPointActionView";
import { WayPointDisplay } from "@/components/map/markers/WayPointDisplay";
import { LianeMemberDisplay } from "@/components/map/markers/LianeMemberDisplay";

export const LianeJoinRequestDetailScreen = () => {
  const { services } = useContext(AppContext);
  const { route } = useAppNavigation<"LianeJoinRequestDetail">();
  const lianeParam = route.params!.request;
  const { data: request } = useQuery(JoinRequestDetailQueryKey(typeof lianeParam === "string" ? lianeParam : lianeParam.id!), () => {
    if (typeof lianeParam === "string") {
      return services.liane.getDetailedJoinRequest(lianeParam);
    } else {
      return lianeParam;
    }
  });
  const match = useMemo(() => (request ? { liane: request.targetLiane, match: request.match, freeSeatsCount: request.seats } : undefined), [request]);

  return <LianeDetailPage match={match} request={request} />;
};

export const LianeDetailScreen = () => {
  const { services, user } = useContext(AppContext);
  const { route } = useAppNavigation<"LianeDetail">();
  const lianeParam = route.params!.liane;

  const { data: liane } = useQuery(LianeDetailQueryKey(typeof lianeParam === "string" ? lianeParam : lianeParam.id!), () => {
    if (typeof lianeParam === "string") {
      return services.liane.get(lianeParam);
    } else {
      return lianeParam;
    }
  });

  const match = useMemo(() => (liane ? toLianeMatch(liane, user!.id!) : undefined), [liane]);
  if (liane && ["Started", "StartingSoon"].includes(getLianeStatus(liane))) {
    return (
      <TripGeolocationProvider liane={liane}>
        <LianeDetailPage match={match} />
      </TripGeolocationProvider>
    );
  }
  return <LianeDetailPage match={match} />;
};

const LianeDetailPage = ({ match, request }: { match: LianeMatch | undefined; request?: JoinLianeRequestDetailed }) => {
  const { height } = useAppWindowsDimensions();
  const { navigation } = useAppNavigation();
  const ref = useRef<BottomSheetRefProps>(null);
  const { top: insetsTop } = useSafeAreaInsets();
  const [bSheetTop, setBSheetTop] = useState<number>(0.7 * height);

  const [fromPoint, toPoint] = match ? [getPoint(match, "pickup"), getPoint(match, "deposit")] : [undefined, undefined];

  const mapBounds = useMemo(() => {
    if (!match) {
      return undefined;
    }
    const bSheetTopPixels = bSheetTop > 1 ? bSheetTop : height * bSheetTop;
    const bbox = getBoundingBox(match!.liane.wayPoints.map(w => [w.rallyingPoint.location.lng, w.rallyingPoint.location.lat]));
    bbox.paddingTop = bSheetTopPixels < height / 2 ? insetsTop + 96 : 24;
    bbox.paddingLeft = 72;
    bbox.paddingRight = 72;
    bbox.paddingBottom = Math.min(bSheetTopPixels + 40, (height - bbox.paddingTop) / 2 + 24);
    //console.log(bbox, bSheetTop);
    return bbox;
  }, [match?.liane.id, bSheetTop, insetsTop, height]);

  const driver = match?.liane.members.find(m => m.user.id === match?.liane.driver.user)!.user;
  const { user } = useContext(AppContext);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.page}>
        <AppMapView bounds={mapBounds} showGeolocation={false}>
          {match && <LianeMatchRouteLayer match={match} />}
          {match &&
            match.liane.members
              .filter(m => m.user.id !== user!.id)
              .map(m => {
                const currentRallyingPoint = match.liane.wayPoints.find(w => w.rallyingPoint.id === m.from)!.rallyingPoint;
                const currentUser = m.user;
                return <LianeMemberDisplay rallyingPoint={currentRallyingPoint} size={48} user={currentUser} offsetY={-4} />;
              })}
          {match &&
            !request &&
            match.liane.wayPoints.map(w => {
              let type: "to" | "from" | "step";
              if (w.rallyingPoint.id === fromPoint!.id) {
                type = "from";
              } else if (w.rallyingPoint.id === toPoint!.id) {
                type = "to";
              } else {
                type = "step";
              }
              return <WayPointDisplay key={w.rallyingPoint.id!} rallyingPoint={w.rallyingPoint} type={type} />;
            })}
          {request &&
            match &&
            [request.from, request.to].map((w, i) => {
              let type: "to" | "from" | "step";
              if (i === 0) {
                type = "from";
              } else if (i === match.liane.wayPoints.length - 1) {
                type = "to";
              } else {
                type = "step";
              }
              return <WayPointDisplay key={w.id!} rallyingPoint={w} type={type} />;
            })}

          {match && <DriverLocationMarker user={driver!} />}
        </AppMapView>
        <AppBottomSheet
          onScrolled={v => {
            setBSheetTop(v);
          }}
          ref={ref}
          stops={[AppBottomSheetHandleHeight + 96, 0.7, 1]}
          padding={{ top: 72 }}
          initialStop={1}>
          {match && (
            <AppBottomSheetScrollView>
              <LianeDetailView liane={match} isRequest={!!request} />
              <LianeActionsView match={match} request={request?.id} />
            </AppBottomSheetScrollView>
          )}

          {!match && (
            <Center>
              <ActivityIndicator />
            </Center>
          )}
        </AppBottomSheet>

        <FloatingBackButton onPress={navigation.goBack} />
      </View>
    </GestureHandlerRootView>
  );
};

const toLianeMatch = (liane: Liane, memberId: string): LianeMatch => {
  const m = liane.members.find(m => m.user.id === memberId)!;
  return {
    liane,
    match: {
      type: "Exact",
      pickup: liane.wayPoints.find(w => w.rallyingPoint.id === m.from)!.rallyingPoint.id!,
      deposit: liane.wayPoints.find(w => w.rallyingPoint.id === m.to)!.rallyingPoint.id!
    },
    freeSeatsCount: liane.members.map(l => l.seatCount).reduce((acc, c) => acc + c, 0)
  };
};

const LianeDetailView = ({ liane, isRequest = false }: { liane: LianeMatch; isRequest?: boolean }) => {
  const fromPoint = getPoint(liane, "pickup");
  const toPoint = getPoint(liane, "deposit");
  const wayPoints = UnionUtils.isInstanceOf<Exact>(liane.match, "Exact") ? liane.liane.wayPoints : liane.match.wayPoints;

  const tripMatch = getTripMatch(toPoint, fromPoint, liane.liane.wayPoints, liane.liane.departureTime, wayPoints);

  const formattedDepartureTime = capitalize(formatMonthDay(new Date(liane.liane.departureTime)));

  // const passengers = liane.liane.members.filter(m => m.user !== liane.liane.driver.user);
  const currentTrip = tripMatch.wayPoints.slice(tripMatch.departureIndex, tripMatch.arrivalIndex + 1);
  const tripDuration = formatDuration(getTotalDuration(currentTrip));
  const tripDistance = Math.ceil(getTotalDistance(currentTrip) / 1000) + " km";

  const driver = liane.liane.members.find(m => m.user.id === liane.liane.driver.user)!.user;

  return (
    <Column>
      <AppText style={{ fontWeight: "bold", fontSize: 20, marginBottom: 8, marginHorizontal: 16 }}>{formattedDepartureTime}</AppText>

      <Row>
        <LianeStatusRow liane={liane} />
        <View style={{ flex: 1 }} />
        <LianeActionRow liane={liane} />
      </Row>

      <Column style={styles.section}>
        <DetailedLianeMatchView
          departureTime={liane.liane.departureTime}
          wayPoints={wayPoints.slice(tripMatch.departureIndex, tripMatch.arrivalIndex + 1)}
          renderWayPointAction={wayPoint => (isRequest ? undefined : <WayPointActionView wayPoint={wayPoint} liane={liane.liane} />)}
        />
      </Column>
      <SectionSeparator />

      <Column style={styles.section} spacing={4}>
        {/*!!liane.liane.returnTime && <InfoItem icon={"corner-down-right-outline"} value={"Retour à " + formattedReturnTime!} />*/}
        <InfoItem icon={"clock-outline"} value={tripDuration + " (Estimée)"} />
        <InfoItem icon={"twisting-arrow"} value={tripDistance} />
      </Column>

      <LineSeparator />

      {liane.liane.driver.canDrive && <DriverInfo user={driver} />}
      <SectionSeparator />
      {liane.liane.members.length > 1 && <PassengerListView members={liane.liane.members.filter(m => m.user.id !== liane.liane.driver.user)} />}

      {liane.liane.members.length > 1 && <SectionSeparator />}
    </Column>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    height: "100%",
    width: "100%"
  },
  section: { paddingVertical: 16, marginHorizontal: 24 }
});

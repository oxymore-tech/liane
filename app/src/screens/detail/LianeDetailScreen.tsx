import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import AppMapView from "@/components/map/AppMapView";
import { AppBottomSheet, AppBottomSheetHandleHeight, AppBottomSheetScrollView, BottomSheetRefProps } from "@/components/base/AppBottomSheet";
import { Column, Row } from "@/components/base/AppLayout";
import { FloatingBackButton } from "@/components/FloatingBackButton";
import { JoinLianeRequestDetailed, Liane, LianeMatch, RallyingPoint, User } from "@/api";
import { useLianeStatus, getTotalDistance, getTotalDuration, getTripFromMatch } from "@/components/trip/trip";
import { formatDuration } from "@/util/datetime";
import { useAppNavigation } from "@/api/navigation";
import { AppContext } from "@/components/context/ContextProvider";
import { GestureHandlerRootView, TouchableOpacity } from "react-native-gesture-handler";
import { getBoundingBox } from "@/util/geometry";
import { useAppWindowsDimensions } from "@/components/base/AppWindowsSizeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "react-query";
import { JoinRequestDetailQueryKey, LianeDetailQueryKey } from "@/screens/user/MyTripsScreen";
import { AppText } from "@/components/base/AppText";
import { TripGeolocationProvider } from "@/screens/detail/TripGeolocationProvider";
import { DriverLocationMarker } from "@/screens/detail/components/DriverLocationMarker";
import { LianeMatchUserRouteLayer } from "@/components/map/layers/LianeMatchRouteLayer";
import { LianeActionsView } from "@/screens/detail/components/LianeActionsView";
import { InfoItem } from "@/screens/detail/components/InfoItem";
import { WayPointDisplay } from "@/components/map/markers/WayPointDisplay";
import { PassengerLocationMarker } from "@/screens/detail/components/PassengerLocationMarker";
import { AppIcon } from "@/components/base/AppIcon";
import { LianeView } from "@/components/trip/LianeView";
import { UserPicture } from "@/components/UserPicture";
import { LianeStatusView } from "@/components/trip/LianeStatusView";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { useObservable } from "@/util/hooks/subscription";
import { AppStyles } from "@/theme/styles";
import { GeolocationSwitch } from "@/screens/detail/components/GeolocationSwitch";

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

  const { data: liane, refetch } = useQuery(LianeDetailQueryKey(typeof lianeParam === "string" ? lianeParam : lianeParam.id!), () => {
    if (typeof lianeParam === "string") {
      return services.liane.get(lianeParam);
    } else {
      return lianeParam;
    }
  });

  useEffect(() => {
    // Refresh page if object passed as param has changed
    if (typeof lianeParam !== "string") {
      refetch();
    }
  }, [refetch, lianeParam]);

  const match = useMemo(() => (liane ? toLianeMatch(liane, user!.id!) : undefined), [liane]);
  const lianeStatus = useLianeStatus(liane ? liane : undefined);
  if (liane && ["Started", "StartingSoon"].includes(lianeStatus!)) {
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
  const { services, user } = useContext(AppContext);
  const unread = useObservable(services.realTimeHub.unreadConversations, undefined);
  const ref = useRef<BottomSheetRefProps>(null);
  const { top: insetsTop } = useSafeAreaInsets();

  const [bSheetTop, setBSheetTop] = useState<number>(0.7 * height);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const tripMatch = useMemo(() => (match ? getTripFromMatch(match) : undefined), [match]);

  const mapBounds = useMemo(() => {
    if (!match) {
      return undefined;
    }
    const bSheetTopPixels = bSheetTop > 1 ? bSheetTop : height * bSheetTop;
    const bbox = getBoundingBox(tripMatch!.wayPoints.map(w => [w.rallyingPoint.location.lng, w.rallyingPoint.location.lat]));
    bbox.paddingTop = bSheetTopPixels < height / 2 ? insetsTop + 96 : 24;
    bbox.paddingLeft = 72;
    bbox.paddingRight = 72;
    bbox.paddingBottom = Math.min(bSheetTopPixels + 40, (height - bbox.paddingTop) / 2 + 24);
    return bbox;
  }, [match?.liane.id, bSheetTop, insetsTop, height]);

  const driver = useMemo(() => match?.liane.members.find(m => m.user.id === match?.liane.driver.user)!.user, [match]);
  const tripPassengers = useMemo(() => {
    return match?.liane.members
      .map(m => {
        if (m.user.id === driver?.id) {
          return null;
        }
        const currentRallyingPointIndex = match.liane.wayPoints.findIndex(w => w.rallyingPoint.id === m.from);
        if (currentRallyingPointIndex < tripMatch!.departureIndex) {
          return null;
        }
        const currentRallyingPoint = match.liane.wayPoints[currentRallyingPointIndex].rallyingPoint;
        const currentUser = m.user;
        return { user: currentUser, departurePoint: currentRallyingPoint };
      })
      .filter(m => m !== null) as { user: User; departurePoint: RallyingPoint }[];
  }, [driver?.id, match, tripMatch, user?.id]);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.page}>
        <AppMapView bounds={mapBounds} showGeolocation={false}>
          {match && <LianeMatchUserRouteLayer match={match} />}

          {tripPassengers?.map(p => (
            <PassengerLocationMarker key={p.user.id} user={p.user} defaultLocation={p.departurePoint.location} />
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

          {driver && tripMatch && <DriverLocationMarker user={driver} defaultLocation={tripMatch.wayPoints[0].rallyingPoint.location} />}
        </AppMapView>

        <AppBottomSheet
          onScrolled={v => setBSheetTop(v)}
          ref={ref}
          stops={[AppBottomSheetHandleHeight + 96, 0.5, 1]}
          padding={{ top: 50 }}
          initialStop={1}
          onExpand={setIsExpanded}>
          {match && (
            <AppBottomSheetScrollView style={{ paddingHorizontal: 12, backgroundColor: AppColors.lightGrayBackground }}>
              <LianeDetailView liane={match} request={request?.id} isExpanded={isExpanded} />
            </AppBottomSheetScrollView>
          )}

          {!match && <ActivityIndicator style={[AppStyles.center, AppStyles.fullHeight]} color={AppColors.primaryColor} size="large" />}
        </AppBottomSheet>

        {!!match?.liane.conversation && match?.liane.state !== "Archived" && match?.liane.state !== "Canceled" && (
          <Pressable
            onPress={() => navigation.navigate("Chat", { conversationId: match?.liane.conversation, liane: match?.liane })}
            style={[styles.chatButton, styles.mapOverlay, AppStyles.shadow]}>
            <AppIcon name={"message-circle-outline"} size={36} color={AppColors.secondaryColor} />
            {unread?.includes(match?.liane.conversation) && <View style={styles.chatBadge} />}
          </Pressable>
        )}
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

const LianeDetailView = ({ liane, isExpanded, request = undefined }: { liane: LianeMatch; isExpanded: boolean; request?: string | undefined }) => {
  const { wayPoints: currentTrip } = useMemo(() => getTripFromMatch(liane), [liane]);
  const { navigation } = useAppNavigation();
  const tripDuration = formatDuration(getTotalDuration(currentTrip));
  const tripDistance = Math.ceil(getTotalDistance(currentTrip) / 1000) + " km";

  const driver = liane.liane.members.find(m => m.user.id === liane.liane.driver.user)!.user;

  return (
    <Column style={styles.bottomContainer}>
      <View>
        <Row style={styles.driverContainer}>
          <Row style={{ marginLeft: isExpanded ? 42 : 0 }} spacing={8}>
            <UserPicture url={driver.pictureUrl} size={38} id={driver.id} />
            <AppText style={styles.driverText}>{driver.id === liane.liane?.id ? "Moi" : driver.pseudo}</AppText>
          </Row>

          {!["Finished", "Archived", "Canceled"].includes(liane.liane.state) && <GeolocationSwitch liane={liane.liane} />}
        </Row>
        <View style={styles.lianeContainer}>
          <LianeView liane={liane.liane} />
        </View>
      </View>

      <Row style={styles.statusRowContainer} spacing={8}>
        {["NotStarted", "Started"].includes(liane.liane.state) && (
          <Row style={{ position: "relative", left: 12 * (liane.liane.members.length - 1) }}>
            {liane.liane.members
              .filter(m => m.user.id !== driver.id)
              .map((m, i) => (
                <View key={m.user.id} style={{ position: "relative", left: -12 * (i + 1) }}>
                  <UserPicture size={32} url={m.user.pictureUrl} id={m.user.id} />
                </View>
              ))}
          </Row>
        )}
      </Row>

      <Row style={styles.statusLianeContainer}>
        {liane.liane.state === "Finished" && (
          <Pressable onPress={() => navigation.navigate("OpenValidateTrip", { liane: liane.liane })}>
            <Row style={styles.validationContainer} spacing={8}>
              <AppText style={styles.validationText}>Valider</AppText>
            </Row>
          </Pressable>
        )}
        {!["Finished", "Archived", "Canceled"].includes(liane.liane.state) ? (
          <LianeStatusView liane={liane.liane} />
        ) : (
          <TouchableOpacity onPress={() => {}}>
            <Row style={styles.validationContainer} spacing={8}>
              <AppText style={styles.validationText}>Relancer</AppText>
            </Row>
          </TouchableOpacity>
        )}
      </Row>

      <Row style={styles.resumeContainer} spacing={4}>
        <Column style={{ flex: 1 }} spacing={4}>
          <Row>
            {liane.liane.recurrence?.id ? (
              <InfoItem icon={"sync-outline"} value={"Trajet régulier"} />
            ) : (
              <Row style={AppStyles.center}>
                <AppIcon name={"arrow-forward-outline"} size={12} color={AppColorPalettes.gray[500]} />
                <AppText style={styles.infoTravel}>Aller simple</AppText>
              </Row>
            )}
          </Row>
          <Row>
            <InfoItem icon={"twisting-arrow"} value={tripDistance} />
          </Row>
          <Row>
            <InfoItem icon={"clock-outline"} value={tripDuration + " (Estimée)"} />
          </Row>
        </Column>

        <Column>
          <View style={styles.verticalLine} />
        </Column>

        <Column style={{ flex: 1 }}>
          {liane.liane.members
            .filter(member => member.user.id !== liane.liane.driver.user)
            .map(member => (
              <Row key={member.user.id}>
                <AppText style={styles.infoTravel}>{member.user.pseudo}</AppText>
                <View style={styles.horizontalLine} />
                <AppText style={styles.infoTravel}>10 €</AppText>
              </Row>
            ))}
          <Row style={{ marginTop: 12 }}>
            <AppText style={[styles.infoTravel, { fontWeight: "bold", color: AppColors.fontColor }]}>Total</AppText>
            <View style={styles.horizontalLine} />
            <AppText style={[styles.infoTravel, { fontWeight: "bold", color: AppColors.fontColor }]}>
              {liane.liane.members.filter(member => member.user.id !== liane.liane.driver.user).length * 10} €
            </AppText>
          </Row>
        </Column>
      </Row>

      <LianeActionsView match={liane} request={request} />
    </Column>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    height: "100%",
    width: "100%"
  },
  section: {
    paddingVertical: 16,
    marginHorizontal: 24
  },
  bottomContainer: {
    borderWidth: 2,
    borderColor: AppColors.primaryColor,
    borderRadius: 20,
    marginTop: 12,
    padding: 8,
    backgroundColor: AppColors.backgroundColor
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

  statusContainer: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    alignItems: "center",
    backgroundColor: AppColorPalettes.gray[100]
  },
  statusLianeContainer: {
    paddingVertical: 8
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
  statusRowContainer: {
    flex: 1,
    alignItems: "center",
    marginTop: 8
  },
  infoRowContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8
  },
  validationContainer: {
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: AppColors.primaryColor,
    padding: 4,
    paddingHorizontal: 12,
    marginHorizontal: 6
  },
  validationText: {
    fontWeight: "bold",
    color: AppColors.white
  },
  infoContainer: {
    paddingHorizontal: 4
  },
  infoTravel: {
    fontSize: 14,
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
  mapOverlay: {
    backgroundColor: AppColors.white,
    margin: 16,
    position: "relative",
    top: 0,
    right: "-40%",
    alignSelf: "center",
    padding: 6,
    borderRadius: 25,
    width: 50,
    height: 50
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

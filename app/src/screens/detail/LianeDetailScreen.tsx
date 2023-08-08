import React, { useCallback, useContext, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";
import AppMapView, { LianeMatchRouteLayer, WayPointDisplay } from "@/components/map/AppMapView";
import { AppBottomSheet, AppBottomSheetHandleHeight, AppBottomSheetScrollView, BottomSheetRefProps } from "@/components/base/AppBottomSheet";
import { Center, Column, Row } from "@/components/base/AppLayout";
import { DetailedLianeMatchView } from "@/components/trip/WayPointsView";
import { LineSeparator, SectionSeparator } from "@/components/Separator";
import { ActionFAB, DriverInfo, FloatingBackButton, InfoItem, PassengerListView } from "@/screens/detail/Components";
import { Exact, getPoint, JoinLianeRequestDetailed, Liane, LianeMatch, UnionUtils, WayPoint } from "@/api";
import { getLianeStatus, getLianeStatusStyle, getTotalDistance, getTotalDuration, getTripMatch } from "@/components/trip/trip";
import { capitalize } from "@/util/strings";
import { formatDate, formatMonthDay, formatTime } from "@/api/i18n";
import { addSeconds, formatDuration } from "@/util/datetime";
import { useAppNavigation } from "@/api/navigation";
import { AppContext } from "@/components/ContextProvider";
import { AppColorPalettes, AppColors, ContextualColors } from "@/theme/colors";
import { ActionItem } from "@/components/ActionItem";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { getBoundingBox } from "@/util/geometry";
import { useAppWindowsDimensions } from "@/components/base/AppWindowsSizeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "react-query";
import { JoinRequestDetailQueryKey, JoinRequestsQueryKey, LianeDetailQueryKey, LianeQueryKey } from "@/screens/user/MyTripsScreen";
import { SlideUpModal } from "@/components/modal/SlideUpModal";
import { AppText } from "@/components/base/AppText";
import { AppStyles } from "@/theme/styles";
import { DatePagerSelector, TimeWheelPicker } from "@/components/DatePagerSelector";
import { showLocation } from "react-native-map-link";
import { AppIcon } from "@/components/base/AppIcon";
import { DebugIdView } from "@/components/base/DebugIdView";
import { UserPicture } from "@/components/UserPicture";
import { TripGeolocationProvider, useMemberTripGeolocation, useTripGeolocation } from "@/screens/detail/TripGeolocationProvider";
import { AppButton } from "@/components/base/AppButton";
import { DriverLocationMarker } from "@/screens/detail/DriverLocationMarker";
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
  if (liane && liane.state === "Started") {
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.page}>
        <AppMapView bounds={mapBounds} showGeolocation={false}>
          {match && <LianeMatchRouteLayer match={match} />}
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
          {match && <DriverLocationMarker user={match.liane.members.find(m => m.user.id === match.liane.driver.user)!.user} />}
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

        <FloatingBackButton
          onPress={() => {
            navigation.goBack();
          }}
        />
      </View>
    </GestureHandlerRootView>
  );
};

const LianeActionRow = ({ liane: match }: { liane: LianeMatch }) => {
  const { navigation } = useAppNavigation();
  const geoloc = useTripGeolocation();
  return (
    <Row style={{ justifyContent: "flex-end", alignItems: "center", paddingHorizontal: 24 }} spacing={8}>
      {geoloc && (
        <AppButton
          onPress={() => {
            if (!geoloc.isActive) {
              navigation.navigate("ShareTripLocationScreen", { liane: match.liane });
            }
          }}
          color={geoloc.isActive ? AppColorPalettes.gray[400] : "red"}
          icon={"pin-outline"}
        />
      )}

      {match.liane.state !== "Archived" && match.liane.state !== "Canceled" && match.liane.members.length > 1 && (
        <ActionFAB
          onPress={() => navigation.navigate("Chat", { conversationId: match.liane.conversation, liane: match.liane })}
          color={AppColors.blue}
          icon={"message-circle-full"}
        />
      )}
    </Row>
  );
};

const LianeActionsView = ({ match, request }: { match: LianeMatch; request?: string }) => {
  const liane = match.liane;
  const { user, services } = useContext(AppContext);
  const currentUserIsMember = liane.members.filter(m => m.user.id === user!.id).length === 1;
  const currentUserIsOwner = currentUserIsMember && liane.createdBy === user!.id;
  const currentUserIsDriver = currentUserIsMember && liane.driver.user === user!.id;
  console.log(user, currentUserIsMember, liane.members);
  const { navigation } = useAppNavigation();
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [date, setDate] = useState(new Date(liane.departureTime));
  const creator = liane.members.find(m => m.user.id === liane.createdBy!)!.user;

  return (
    <Column>
      <AppText numberOfLines={-1} style={{ paddingVertical: 4, paddingHorizontal: 24 }}>
        Liane postée le <AppText style={{ fontWeight: "bold" }}>{formatDate(new Date(liane.createdAt!))}</AppText> par{" "}
        <AppText style={{ fontWeight: "bold" }}>{creator.pseudo}</AppText>
      </AppText>
      <DebugIdView style={{ paddingVertical: 4, paddingHorizontal: 24 }} id={liane.id!} />
      {currentUserIsDriver && liane.state === "NotStarted" && <LineSeparator />}
      {currentUserIsDriver && liane.state === "NotStarted" && (
        <ActionItem
          onPress={() => {
            setModalVisible(true);
          }}
          iconName={"clock-outline"}
          text={"Modifier l'horaire de départ"}
        />
      )}
      <SlideUpModal
        actionText={"Modifier l'horaire"}
        backgroundColor={AppColors.yellow}
        onAction={() => {}}
        visible={modalVisible}
        setVisible={setModalVisible}>
        <Column spacing={16} style={{ marginBottom: 16 }}>
          <AppText style={{ ...AppStyles.title, marginVertical: 8, paddingLeft: 8 }}>Quand partez-vous ?</AppText>
          <DatePagerSelector date={date} onSelectDate={setDate} />
          <TimeWheelPicker date={date} minuteStep={5} onChange={setDate} />
        </Column>
      </SlideUpModal>
      {currentUserIsMember && (liane.state === "Finished" || liane.state === "Archived") && (
        <ActionItem
          onPress={() => {
            const fromPoint = getPoint(match, "pickup");
            const toPoint = getPoint(match, "deposit");
            navigation.navigate("Publish", { initialValue: { from: fromPoint, to: toPoint } });
          }}
          iconName={"repeat"}
          text={"Relancer ce trajet"}
        />
      )}

      <LineSeparator />
      {currentUserIsOwner && liane.state === "NotStarted" && liane.members.length === 1 && (
        <ActionItem
          onPress={() => {
            Alert.alert("Supprimer l'annonce", "Voulez-vous vraiment supprimer cette liane ?", [
              {
                text: "Annuler",
                onPress: () => {},
                style: "cancel"
              },
              {
                text: "Supprimer",
                onPress: async () => {
                  await services.liane.delete(liane.id!);
                  await queryClient.invalidateQueries(LianeQueryKey);
                  navigation.goBack();
                },
                style: "default"
              }
            ]);
          }}
          color={ContextualColors.redAlert.text}
          iconName={"trash-outline"}
          text={"Supprimer l'annonce"}
        />
      )}

      {currentUserIsOwner && liane.state === "NotStarted" && liane.members.length > 1 && (
        <ActionItem
          onPress={() => {
            Alert.alert("Annuler ce trajet", "Voulez-vous vraiment annuler ce trajet ?", [
              {
                text: "Fermer",
                onPress: () => {},
                style: "cancel"
              },
              {
                text: "Annuler",
                onPress: async () => {
                  //TODO
                  //await queryClient.invalidateQueries(LianeQueryKey);
                  //navigation.goBack();
                },
                style: "default"
              }
            ]);
          }}
          color={ContextualColors.redAlert.text}
          iconName={"close-outline"}
          text={"Annuler ce trajet"}
        />
      )}

      {!currentUserIsMember && request && (
        <ActionItem
          onPress={() => {
            Alert.alert("Retirer la demande", "Voulez-vous vraiment retirer votre demande ?", [
              {
                text: "Annuler",
                onPress: () => {},
                style: "cancel"
              },
              {
                text: "Retirer",
                onPress: async () => {
                  await services.liane.deleteJoinRequest(request);
                  await queryClient.invalidateQueries(JoinRequestsQueryKey);
                  navigation.goBack();
                },
                style: "default"
              }
            ]);
          }}
          color={ContextualColors.redAlert.text}
          iconName={"trash-outline"}
          text={"Retirer la demande"}
        />
      )}
      {currentUserIsMember && liane.state === "NotStarted" && !currentUserIsOwner && (
        <ActionItem
          onPress={() => {
            Alert.alert("Quitter la liane", "Voulez-vous vraiment quitter cette liane ?", [
              {
                text: "Annuler",
                onPress: () => {},
                style: "cancel"
              },
              {
                text: "Quitter",
                onPress: async () => {
                  await services.liane.leave(liane.id!, user!.id!);
                  await queryClient.invalidateQueries(LianeQueryKey);
                  navigation.goBack();
                },
                style: "default"
              }
            ]);
          }}
          color={ContextualColors.redAlert.text}
          iconName={"log-out-outline"}
          text={"Quitter la liane"}
        />
      )}
      {currentUserIsMember && liane.state === "Started" && (
        <ActionItem
          onPress={() => {
            Alert.alert("Annuler ce trajet", "Voulez-vous vraiment annuler ce trajet ?", [
              {
                text: "Fermer",
                onPress: () => {},
                style: "cancel"
              },
              {
                text: "Annuler",
                onPress: async () => {
                  //TODO
                  //navigation.goBack();
                  //await queryClient.invalidateQueries(LianeQueryKey);
                },
                style: "default"
              }
            ]);
          }}
          color={ContextualColors.redAlert.text}
          iconName={"close-outline"}
          text={"Annuler ce trajet"}
        />
      )}

      {currentUserIsMember && (liane.state === "Finished" || liane.state === "Started") && (
        <ActionItem
          onPress={() => {
            // TODO
          }}
          iconName={"alert-circle-outline"}
          text={"Assistance"}
        />
      )}
    </Column>
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

const LianeStatusRow = ({ liane }: { liane: LianeMatch }) => {
  const [status, color] = getLianeStatusStyle(liane.liane);
  return (
    <View>
      {!!status && (
        <Row style={{ marginHorizontal: 24, marginVertical: 4 }}>
          <View style={{ borderRadius: 4, padding: 4, backgroundColor: color }}>
            <AppText>{status}</AppText>
          </View>
        </Row>
      )}
    </View>
  );
};

const WayPointActionView = ({ wayPoint, liane }: { wayPoint: WayPoint; liane: Liane }) => {
  const lianeStatus = getLianeStatus(liane);
  const { user } = useContext(AppContext);
  const lianeMember = liane.members.find(m => m.user.id === user!.id)!;

  const isDriver = liane.driver.user === user?.id;
  const started = lianeStatus === "Started" || lianeStatus === "StartingSoon";
  //const nextPoint = isDriver ? liane.wayPoints.find(w => new Date(w.eta) > new Date()) : (lianeMember.);
  const fromPoint = liane.wayPoints.findIndex(w => w.rallyingPoint.id === lianeMember.from);

  const getNextPoint = useCallback(() => {
    const now = new Date();
    if (isDriver) {
      return liane.wayPoints.find(w => new Date(w.eta) > now);
    } else {
      if (new Date(liane.wayPoints[fromPoint].eta) > now) {
        return liane.wayPoints[fromPoint];
      }
    }
    return null;
  }, [fromPoint, isDriver, liane.wayPoints]);

  let nextPoint = getNextPoint();
  nextPoint = nextPoint?.rallyingPoint.id === wayPoint.rallyingPoint.id ? nextPoint : null;

  const lastLocUpdate = useMemberTripGeolocation(liane.driver.user);
  const showEstimate =
    !!lastLocUpdate &&
    wayPoint.rallyingPoint.id !== liane.wayPoints[liane.wayPoints.length - 1].rallyingPoint.id &&
    lastLocUpdate.nextPoint === wayPoint.rallyingPoint.id;
  return (
    <Column>
      {started && nextPoint && (
        <Pressable
          onPress={() => {
            showLocation({
              latitude: nextPoint!.rallyingPoint.location.lat,
              longitude: nextPoint!.rallyingPoint.location.lng,
              title: nextPoint!.rallyingPoint.label,
              dialogTitle: "Se rendre au point de rendez-vous",
              googleForceLatLon: true,
              cancelText: "Annuler",
              appsWhiteList: ["google-maps", "apple-maps", "waze"],
              directionsMode: "walk"
            });
          }}>
          <Row spacing={8} style={{ marginVertical: 4 }}>
            <AppIcon name={"navigation-2-outline"} size={16} color={AppColors.blue} />
            <AppText style={{ textDecorationLine: "underline", color: AppColors.blue, fontWeight: "500" }}>Démarrer la navigation</AppText>
          </Row>
        </Pressable>
      )}
      {lianeStatus === "NotStarted" &&
        (isDriver ||
          liane.wayPoints[fromPoint].rallyingPoint.id === wayPoint.rallyingPoint.id ||
          liane.wayPoints.find(w => w.rallyingPoint.id === lianeMember.to)!.rallyingPoint.id === wayPoint.rallyingPoint.id) && (
          <Pressable>
            <Row spacing={8} style={{ marginVertical: 4 }}>
              <AppIcon name={"edit-outline"} size={16} color={AppColorPalettes.gray[500]} />
              <AppText style={{ textDecorationLine: "underline", color: AppColorPalettes.gray[500], fontWeight: "500" }}>
                Changer de point de rendez-vous
              </AppText>
            </Row>
          </Pressable>
        )}
      <Row style={{ justifyContent: "space-between" }}>
        {!showEstimate && <View style={{ flex: 1 }} />}
        {showEstimate && (
          <Row style={{ alignItems: "center" }}>
            <AppIcon name={"arrowhead-right-outline"} size={16} />
            <AppText>Départ estimé à {formatTime(addSeconds(new Date(wayPoint.eta), lastLocUpdate.delay))}</AppText>
          </Row>
        )}
        <Row style={{ position: "relative", left: 12 * (liane.members.length - 1), justifyContent: "flex-end" }}>
          {liane.members
            .filter(m => m.from === wayPoint.rallyingPoint.id)
            .map((m, i) => {
              return (
                <View key={m.user.id} style={{ position: "relative", left: -12 * i }}>
                  <UserPicture size={24} url={m.user.pictureUrl} id={m.user.id} />
                </View>
              );
            })}
        </Row>
      </Row>
    </Column>
  );
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

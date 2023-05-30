import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, ColorValue, Pressable, StyleSheet, View } from "react-native";
import AppMapView, { LianeMatchRouteLayer, WayPointDisplay } from "@/components/map/AppMapView";
import { AppBottomSheet, AppBottomSheetHandleHeight, AppBottomSheetScrollView, BottomSheetRefProps } from "@/components/base/AppBottomSheet";
import { Center, Column, Row } from "@/components/base/AppLayout";
import { DetailedLianeMatchView } from "@/components/trip/WayPointsView";
import { LineSeparator, SectionSeparator } from "@/components/Separator";
import { ActionFAB, DriverInfo, FloatingBackButton, InfoItem, PassengerListView } from "@/screens/detail/Components";
import { Exact, getPoint, Liane, LianeMatch, UnionUtils } from "@/api";
import { getLianeStatus, getLianeStatusStyle, getTotalDistance, getTotalDuration, getTripMatch } from "@/components/trip/trip";
import { capitalize } from "@/util/strings";
import { formatDate, formatMonthDay } from "@/api/i18n";
import { formatDuration } from "@/util/datetime";
import { useAppNavigation } from "@/api/navigation";
import { AppContext } from "@/components/ContextProvider";
import { AppColorPalettes, AppColors, ContextualColors } from "@/theme/colors";
import { ActionItem } from "@/components/ActionItem";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { getBoundingBox } from "@/util/geometry";
import { useAppWindowsDimensions } from "@/components/base/AppWindowsSizeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "react-query";
import { JoinRequestsQueryKey, LianeQueryKey } from "@/screens/MyTripsScreen";
import { SlideUpModal } from "@/components/modal/SlideUpModal";
import { AppText } from "@/components/base/AppText";
import { AppStyles } from "@/theme/styles";
import { DatePagerSelector, TimeWheelPicker } from "@/components/DatePagerSelector";
import { showLocation } from "react-native-map-link";
import { AppIcon } from "@/components/base/AppIcon";

export const LianeJoinRequestDetailScreen = () => {
  const { services } = useContext(AppContext);
  const { route } = useAppNavigation<"LianeJoinRequestDetail">();
  const lianeParam = route.params!.request;
  const [request, setRequest] = useState(typeof lianeParam === "string" ? undefined : lianeParam);

  useEffect(() => {
    if (typeof lianeParam === "string") {
      services.liane.getDetailedJoinRequest(lianeParam).then(l => setRequest(l));
    }
  }, [lianeParam, services.liane]);
  const match = useMemo(() => (request ? { liane: request.targetLiane, match: request.match, freeSeatsCount: request.seats } : undefined), [request]);
  return <LianeDetailPage match={match} />;
};
export const LianeDetailScreen = () => {
  const { services } = useContext(AppContext);
  const { route } = useAppNavigation<"LianeDetail">();
  const lianeParam = route.params!.liane;
  const [liane, setLiane] = useState(typeof lianeParam === "string" ? undefined : lianeParam);

  useEffect(() => {
    if (typeof lianeParam === "string") {
      services.liane.get(lianeParam).then(l => setLiane(l));
    }
  }, [lianeParam, services.liane]);

  const match = useMemo(() => (liane ? toLianeMatch(liane) : undefined), [liane]);
  return <LianeDetailPage match={match} />;
};

const LianeDetailPage = ({ match }: { match: LianeMatch | undefined }) => {
  const { height } = useAppWindowsDimensions();
  const { navigation } = useAppNavigation();
  const ref = useRef<BottomSheetRefProps>(null);
  const { top: insetsTop } = useSafeAreaInsets();
  const [bSheetTop, setBSheetTop] = useState<number>(0.7 * height);

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
    console.log(bbox, bSheetTop);
    return bbox;
  }, [match?.liane.id, bSheetTop, insetsTop, height]);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.page}>
        <AppMapView bounds={mapBounds} showGeolocation={false}>
          {match && <LianeMatchRouteLayer match={match} />}
          {match &&
            match.liane.wayPoints.map((w, i) => {
              let type: "to" | "from" | "step";
              if (i === 0) {
                type = "from";
              } else if (i === match.liane.wayPoints.length - 1) {
                type = "to";
              } else {
                type = "step";
              }
              return <WayPointDisplay key={w.rallyingPoint.id!} rallyingPoint={w.rallyingPoint} type={type} />;
            })}
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
              <LianeStatusRow liane={match} />
              <LianeActionRow liane={match} />
              <LianeDetailView liane={match} />
              {match.liane.state === "NotStarted" && <LianeActionsView liane={match.liane} />}
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

  return (
    <Row style={{ justifyContent: "flex-end", paddingHorizontal: 24 }} spacing={8}>
      <ActionFAB
        onPress={() => navigation.navigate("Chat", { conversationId: match.liane.conversation, liane: match.liane })}
        color={AppColors.blue}
        icon={"message-circle-outline"}
      />
    </Row>
  );
};

const LianeActionsView = ({ liane }: { liane: Liane }) => {
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
        <AppText style={{ fontWeight: "bold" }}>{user?.id === creator.id ? "moi" : creator.pseudo}</AppText>
      </AppText>
      {currentUserIsDriver && <LineSeparator />}
      {currentUserIsDriver && (
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
      <LineSeparator />
      {currentUserIsOwner && (
        <ActionItem
          onPress={() => {
            // TODO
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
                  navigation.goBack();
                  await queryClient.invalidateQueries(LianeQueryKey);
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
      {!currentUserIsMember && (
        <ActionItem
          onPress={() => {
            // TODO
            Alert.alert("Retirer la demande", "Voulez-vous vraiment retirer votre demande ?", [
              {
                text: "Annuler",
                onPress: () => {},
                style: "cancel"
              },
              {
                text: "Retirer",
                onPress: async () => {
                  //TODO
                  navigation.goBack();
                  await queryClient.invalidateQueries(JoinRequestsQueryKey);
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
      {currentUserIsMember && !currentUserIsOwner && (
        <ActionItem
          onPress={() => {
            // TODO
            Alert.alert("Quitter la liane", "Voulez-vous vraiment quitter cette liane ?", [
              {
                text: "Annuler",
                onPress: () => {},
                style: "cancel"
              },
              {
                text: "Supprimer",
                onPress: async () => {
                  //TODO
                  navigation.goBack();
                  await queryClient.invalidateQueries(LianeQueryKey);
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
    </Column>
  );
};

const toLianeMatch = (liane: Liane): LianeMatch => {
  return {
    liane,
    match: {
      type: "Exact",
      pickup: liane.wayPoints[0].rallyingPoint.id!,
      deposit: liane.wayPoints[liane.wayPoints.length - 1].rallyingPoint.id!
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
const LianeDetailView = ({ liane }: { liane: LianeMatch }) => {
  const fromPoint = getPoint(liane, "pickup");
  const toPoint = getPoint(liane, "deposit");
  const wayPoints = UnionUtils.isInstanceOf<Exact>(liane.match, "Exact") ? liane.liane.wayPoints : liane.match.wayPoints;

  const tripMatch = getTripMatch(toPoint, fromPoint, liane.liane.wayPoints, liane.liane.departureTime, wayPoints);

  const formattedDepartureTime = capitalize(formatMonthDay(new Date(liane.liane.departureTime)));

  // const passengers = liane.liane.members.filter(m => m.user !== liane.liane.driver.user);
  const currentTrip = tripMatch.wayPoints.slice(tripMatch.departureIndex, tripMatch.arrivalIndex + 1);
  const tripDuration = formatDuration(getTotalDuration(currentTrip));
  const tripDistance = Math.ceil(getTotalDistance(currentTrip) / 1000) + " km";

  const lianeStatus = getLianeStatus(liane.liane);

  const driver = liane.liane.members.find(m => m.user.id === liane.liane.driver.user)!.user;

  return (
    <Column>
      <Column style={styles.section}>
        <DetailedLianeMatchView
          departureTime={liane.liane.departureTime}
          wayPoints={wayPoints.slice(tripMatch.departureIndex, tripMatch.arrivalIndex + 1)}
          renderWayPointAction={wayPoint => {
            if (lianeStatus === "Started" || lianeStatus === "StartingSoon") {
              const nextPoint = liane.liane.wayPoints[0]; //TODO
              if (wayPoint.rallyingPoint.id !== nextPoint.rallyingPoint.id) {
                return undefined;
              }
              return (
                <Pressable
                  onPress={() => {
                    showLocation({
                      latitude: nextPoint.rallyingPoint.location.lat,
                      longitude: nextPoint.rallyingPoint.location.lng,
                      title: nextPoint.rallyingPoint.label,
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
              );
            } else if (lianeStatus === "NotStarted") {
              return (
                <Pressable>
                  <Row spacing={8} style={{ marginVertical: 4 }}>
                    <AppIcon name={"edit-outline"} size={16} color={AppColorPalettes.gray[500]} />
                    <AppText style={{ textDecorationLine: "underline", color: AppColorPalettes.gray[500], fontWeight: "500" }}>
                      Changer de point de rendez-vous
                    </AppText>
                  </Row>
                </Pressable>
              );
            }

            return undefined;
          }}
        />
      </Column>
      <SectionSeparator />

      <Column style={styles.section} spacing={4}>
        <InfoItem icon={"calendar-outline"} value={formattedDepartureTime} />
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

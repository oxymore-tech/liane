import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Platform, StyleSheet, View } from "react-native";
import AppMapView, { LianeMatchRouteLayer, WayPointDisplay } from "@/components/map/AppMapView";
import { AppBottomSheet, AppBottomSheetHandleHeight, AppBottomSheetScrollView, BottomSheetRefProps } from "@/components/base/AppBottomSheet";
import { Center, Column } from "@/components/base/AppLayout";
import { DetailedLianeMatchView } from "@/components/trip/WayPointsView";
import { LineSeparator, SectionSeparator } from "@/components/Separator";
import { DriverInfo, FloatingBackButton, InfoItem } from "@/screens/detail/Components";
import { Exact, getPoint, Liane, LianeMatch, UnionUtils } from "@/api";
import { getTotalDistance, getTotalDuration, getTripMatch } from "@/components/trip/trip";
import { capitalize } from "@/util/strings";
import { formatMonthDay } from "@/api/i18n";
import { formatDuration } from "@/util/datetime";
import { useAppNavigation } from "@/api/navigation";
import { AppContext } from "@/components/ContextProvider";
import { ContextualColors } from "@/theme/colors";
import { ActionItem } from "@/components/ActionItem";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export const LianeDetailScreen = () => {
  const ref = useRef<BottomSheetRefProps>(null);
  const { services } = useContext(AppContext);
  const { route, navigation } = useAppNavigation<"LianeDetail">();
  const lianeParam = route.params!.liane;
  const [liane, setLiane] = useState(typeof lianeParam === "string" ? undefined : lianeParam);

  useEffect(() => {
    if (typeof lianeParam === "string") {
      services.liane.get(lianeParam).then(l => setLiane(l));
    }
  }, [lianeParam, services.liane]);

  const match = useMemo(() => (liane ? toLianeMatch(liane) : undefined), [liane]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.page}>
        <AppMapView
          //TODO bounds={mapBounds}
          showGeolocation={false}>
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
        <AppBottomSheet ref={ref} stops={[AppBottomSheetHandleHeight + 96, 0.7, 1]} padding={{ top: 72 }} initialStop={1}>
          {match && (
            <AppBottomSheetScrollView>
              <LianeDetailView liane={match} />
              <LianeActionsView liane={match.liane} />
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

const LianeActionsView = ({ liane }: { liane: Liane }) => {
  const { user, services } = useContext(AppContext);
  const currentUserIsOwner = liane.createdBy === user!.id;
  const currentUserIsDriver = liane.driver.user === user!.id;
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const date = new Date(liane.departureTime);
  return (
    <Column>
      {currentUserIsDriver && (
        <ActionItem
          onPress={() => {
            setDatePickerVisible(true);
          }}
          iconName={"clock-outline"}
          text={"Modifier l'horaire de départ"}
        />
      )}
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="time"
        date={date}
        confirmTextIOS={"Valider"}
        cancelTextIOS={"Annuler"}
        onConfirm={d => {
          setDatePickerVisible(false);
          console.log("TODO update", new Date(date.getFullYear(), date.getMonth(), date.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()));
        }}
        onCancel={() => {
          setDatePickerVisible(false);
        }}
        onChange={() => {
          if (Platform.OS === "android") {
            setDatePickerVisible(false);
          }
        }}
      />
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
      {!currentUserIsOwner && (
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
      _t: "Exact",
      pickup: liane.wayPoints[0].rallyingPoint.id!,
      deposit: liane.wayPoints[liane.wayPoints.length - 1].rallyingPoint.id!
    },
    freeSeatsCount: liane.members.map(l => l.seatCount).reduce((acc, c) => acc + c, 0)
  };
};

const LianeDetailView = ({ liane }: { liane: LianeMatch }) => {
  // TODO mutualize with other detail screen

  const fromPoint = getPoint(liane, "pickup");
  const toPoint = getPoint(liane, "deposit");
  const wayPoints = UnionUtils.isInstanceOf<Exact>(liane.match, "Exact") ? liane.liane.wayPoints : liane.match.wayPoints;

  const tripMatch = getTripMatch(toPoint, fromPoint, liane.liane.wayPoints, liane.liane.departureTime, wayPoints);

  const formattedDepartureTime = capitalize(formatMonthDay(new Date(liane.liane.departureTime)));

  // const passengers = liane.liane.members.filter(m => m.user !== liane.liane.driver.user);
  const currentTrip = tripMatch.wayPoints.slice(tripMatch.departureIndex, tripMatch.arrivalIndex + 1);
  const tripDuration = formatDuration(getTotalDuration(currentTrip));
  const tripDistance = Math.ceil(getTotalDistance(currentTrip) / 1000) + " km";

  return (
    <Column>
      <Column style={styles.section}>
        <DetailedLianeMatchView
          departureTime={liane.liane.departureTime}
          wayPoints={wayPoints.slice(tripMatch.departureIndex, tripMatch.arrivalIndex + 1)}
        />
      </Column>
      <SectionSeparator />

      <Column style={styles.section} spacing={4}>
        <InfoItem icon={"calendar-outline"} value={formattedDepartureTime} />
        <InfoItem icon={"clock-outline"} value={tripDuration + " (Estimée)"} />
        <InfoItem icon={"twisting-arrow"} value={tripDistance} />
      </Column>

      <LineSeparator />

      {liane.liane.driver.canDrive && <DriverInfo />}
      <SectionSeparator />
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

import { addSeconds, Liane, TrackedMemberLocation, WayPoint } from "@liane/common";
import { useLianeStatus } from "@/components/trip/trip";
import React, { useCallback, useContext, useEffect, useState } from "react";
import { AppContext } from "@/components/context/ContextProvider";
import { useMemberTripGeolocation } from "@/screens/detail/TripGeolocationProvider";
import { Column, Row, Space } from "@/components/base/AppLayout";
import { Pressable, View } from "react-native";
import { showLocation } from "react-native-map-link";
import { AppIcon } from "@/components/base/AppIcon";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { AppText } from "@/components/base/AppText";
import { formatTime } from "@/api/i18n";
import { UserPicture } from "@/components/UserPicture";

const EstimatedDelayDisplay = ({ locationUpdate, initialTime }: { locationUpdate: TrackedMemberLocation; initialTime: Date }) => {
  const initialTimeMillis = initialTime.getTime();
  const [delay, setDelay] = useState(new Date().getTime() / 1000 - initialTimeMillis / 1000 + locationUpdate.delay);
  useEffect(() => {
    const interval = setInterval(() => {
      //console.log("update delay", new Date().getTime() / 1000 - initialTimeMillis / 1000);
      setDelay(new Date().getTime() / 1000 - initialTimeMillis / 1000 + locationUpdate.delay);
    }, 30000);
    return () => clearInterval(interval);
  }, [initialTimeMillis, locationUpdate.delay]);

  const estimated = addSeconds(initialTime, delay);
  const isOnTime = estimated.getMinutes() === initialTime.getMinutes() && estimated.getHours() === initialTime.getHours();
  return (
    <Row style={{ alignItems: "center" }}>
      <AppIcon name={"arrowhead-right-outline"} size={16} color={AppColorPalettes.gray[500]} />
      {isOnTime && <AppText style={{ color: AppColorPalettes.gray[500] }}>Départ à l'heure prévue</AppText>}
      {!isOnTime && <AppText style={{ color: AppColorPalettes.gray[500] }}>Départ estimé à {formatTime(estimated)}</AppText>}
    </Row>
  );
};

export const WayPointActionView = ({ wayPoint, liane }: { wayPoint: WayPoint; liane: Liane }) => {
  const lianeStatus = useLianeStatus(liane);
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
        {!showEstimate && <Space />}
        {showEstimate && <EstimatedDelayDisplay locationUpdate={lastLocUpdate} initialTime={new Date(wayPoint.eta)} />}
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

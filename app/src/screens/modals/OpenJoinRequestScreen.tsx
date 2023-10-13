import { WithFullscreenModal } from "@/components/WithFullscreenModal";
import { useAppNavigation } from "@/api/navigation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import React, { useContext, useEffect, useRef } from "react";
import { AppContext } from "@/components/context/ContextProvider";
import { Column, Row } from "@/components/base/AppLayout";
import { ScrollView, StyleSheet, View } from "react-native";
import { AppColorPalettes, AppColors, defaultTextColor } from "@/theme/colors";
import { AppRoundedButton } from "@/components/base/AppRoundedButton";
import { AppText } from "@/components/base/AppText";
import { WithFetchResource } from "@/components/base/WithFetchResource";
import { Answer, Compatible, Exact, formatDuration, getBoundingBox, JoinLianeRequestDetailed, UnionUtils } from "@liane/common";
import { LianeMatchView } from "@/components/trip/LianeMatchView";
import { AppIcon } from "@/components/base/AppIcon";
import { formatMonthDay, formatTime } from "@/api/i18n";
import { TripCard } from "@/components/TripCard";
import { useQueryClient } from "react-query";
import { NotificationQueryKey } from "@/screens/notifications/NotificationScreen";
import { JoinRequestsQueryKey, LianeQueryKey } from "@/screens/user/MyTripsScreen";
import { MapStyleProps } from "@/api/location";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { WayPointDisplay, WayPointDisplayType } from "@/components/map/markers/WayPointDisplay";
import { RouteLayer } from "@/components/map/layers/LianeMatchRouteLayer";

export const OpenJoinRequestScreen = WithFullscreenModal(() => {
  const { route, navigation } = useAppNavigation<"OpenJoinLianeRequest">();
  const insets = useSafeAreaInsets();

  const { services } = useContext(AppContext);
  const requestId = typeof route.params.request === "string" ? route.params.request : route.params.request.id;
  const queryClient = useQueryClient();
  const readNotification = useRef<Promise<void> | undefined>();

  useEffect(() => {
    readNotification.current = services.notification.markAsRead(requestId!);
  }, [requestId, services.notification]);
  const acceptRequest = async () => {
    if (readNotification.current) {
      await readNotification.current;
    }
    await services.realTimeHub.postAnswer(requestId!, Answer.Accept);
    await queryClient.invalidateQueries(NotificationQueryKey);
    await queryClient.invalidateQueries(LianeQueryKey);
    await queryClient.invalidateQueries(JoinRequestsQueryKey);
    navigation.goBack();
  };
  const refuseRequest = async () => {
    if (readNotification.current) {
      await readNotification.current;
    }
    await services.realTimeHub.postAnswer(requestId!, Answer.Reject);
    await queryClient.invalidateQueries(NotificationQueryKey);
    navigation.goBack();
  };
  return (
    <ScrollView style={{ flexGrow: 1, flex: 1, marginBottom: insets.bottom }}>
      <Column
        spacing={8}
        style={{
          flex: 1,
          paddingHorizontal: 12,
          paddingTop: 8,
          paddingBottom: 20
        }}>
        <DetailedRequestView params={{ request: { id: requestId } }} />
      </Column>

      <Row style={{ alignItems: "flex-end", justifyContent: "flex-end", paddingHorizontal: 8 }} spacing={8}>
        <AppRoundedButton
          color={defaultTextColor(AppColors.white)}
          onPress={refuseRequest}
          backgroundColor={AppColorPalettes.gray[400]}
          text={"Refuser"}
        />
        <AppRoundedButton
          color={defaultTextColor(AppColors.primaryColor)}
          onPress={acceptRequest}
          backgroundColor={AppColors.primaryColor}
          text={"Accepter"}
        />
      </Row>
    </ScrollView>
  );
}, "");

const DetailedRequestView = WithFetchResource<JoinLianeRequestDetailed>(
  ({ data }) => {
    const userName = data.createdBy!.pseudo ?? "John Doe";
    const role = data.seats > 0 ? "conducteur" : "passager";
    const reqIsExactMatch = UnionUtils.isInstanceOf<Exact>(data.match, "Exact");
    const wayPoints = reqIsExactMatch ? data.targetLiane.wayPoints : data.match.wayPoints;
    const dateTime = `${formatMonthDay(new Date(data.targetLiane.departureTime))} à ${formatTime(new Date(data.targetLiane.departureTime))}`;
    const headerDate = (
      <Row spacing={8}>
        <AppIcon name={"calendar-outline"} />
        <AppText style={{ fontSize: 16 }}>{dateTime}</AppText>
      </Row>
    );
    const tripContent = (
      <LianeMatchView
        from={data.from}
        to={data.to}
        departureTime={data.targetLiane.departureTime}
        originalTrip={data.targetLiane.wayPoints}
        newTrip={wayPoints}
      />
    );
    return (
      <Column spacing={24}>
        <AppText numberOfLines={2} style={{ fontSize: 18 }}>
          {userName} souhaite rejoindre votre Liane en tant que {role} :
        </AppText>
        <TripCard header={headerDate} content={tripContent} />
        <View style={{ backgroundColor: AppColorPalettes.gray[400], borderRadius: 16, overflow: "hidden" }}>
          <TripOverview request={data} />
        </View>
        {data.message.length > 0 && (
          <Row spacing={12} style={[styles.card, { alignItems: "center" }]}>
            <AppIcon name={"message-circle-outline"} />
            <View style={{ paddingLeft: 4, borderLeftWidth: 2, borderLeftColor: AppColorPalettes.gray[400] }}>
              <AppText>{data.message}</AppText>
            </View>
          </Row>
        )}
        <Row spacing={16} style={{ alignItems: "center" }}>
          <AppIcon name={reqIsExactMatch ? "checkmark-circle-2-outline" : "alert-circle-outline"} />
          <AppText numberOfLines={2} style={{ fontSize: 14 }}>
            {reqIsExactMatch || (data.match as Compatible).delta.totalInSeconds <= 60
              ? "Votre trajet reste inchangé"
              : "Le trajet sera rallongé de " + formatDuration((data.match as Compatible).delta.totalInSeconds)}
          </AppText>
        </Row>
        {data.seats > 0 && !data.targetLiane.driver.canDrive && (
          <Row spacing={16} style={{ alignItems: "center" }}>
            <AppIcon name={"car-check-mark"} />
            <AppText numberOfLines={2} style={{ fontSize: 14 }}>
              Avec un conducteur, vous serez fin prêt pour le départ !
            </AppText>
          </Row>
        )}
      </Column>
    );
  },
  (repository, params) => {
    return repository.liane.getDetailedJoinRequest(params.request.id);
  },
  params => DetailedRequestQueryKey + params.request.id
);

const DetailedRequestQueryKey = "DetailedRequestQueryKey";

const TripOverview = ({ request }: { request: JoinLianeRequestDetailed }) => {
  const reqIsExactMatch = UnionUtils.isInstanceOf<Exact>(request.match, "Exact");
  const wayPoints = reqIsExactMatch ? request.targetLiane.wayPoints : request.match.wayPoints;
  const boundingBox = getBoundingBox(
    wayPoints.map(w => [w.rallyingPoint.location.lng, w.rallyingPoint.location.lat]),
    24
  );
  return (
    <MapLibreGL.MapView
      style={{ height: 160, width: "100%" }}
      {...MapStyleProps}
      logoEnabled={false}
      rotateEnabled={false}
      scrollEnabled={false}
      zoomEnabled={false}
      attributionEnabled={false}>
      <MapLibreGL.Camera bounds={boundingBox} animationMode={"moveTo"} />
      {wayPoints.map((w, i) => {
        let type: WayPointDisplayType;
        if (i === 0) {
          type = "from";
        } else if (i === wayPoints.length - 1) {
          type = "to";
        } else if (w.rallyingPoint.id === request.match.pickup || w.rallyingPoint.id === request.match.deposit) {
          type = "pickup";
        } else {
          type = "step";
        }
        return <WayPointDisplay key={w.rallyingPoint.id!} rallyingPoint={w.rallyingPoint} type={type} />;
      })}
      <RouteLayer wayPoints={request.targetLiane.wayPoints} />
      {!reqIsExactMatch && <RouteLayer wayPoints={request.match.wayPoints} id={"alternative"} style={{ lineDasharray: [3, 2] }} />}
    </MapLibreGL.MapView>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: AppColors.white
  },

  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: "center"
  }
});

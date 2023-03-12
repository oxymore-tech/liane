import { WithFullscreenModal } from "@/components/WithFullscreenModal";
import { useAppNavigation } from "@/api/navigation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import React, { useContext } from "react";
import { AppContext } from "@/components/ContextProvider";
import { Column, Row } from "@/components/base/AppLayout";
import { StyleSheet, View } from "react-native";
import { AppColorPalettes, AppColors, defaultTextColor } from "@/theme/colors";
import { AppRoundedButton } from "@/components/base/AppRoundedButton";
import { AppText } from "@/components/base/AppText";
import { WithFetchResource } from "@/components/base/WithFetchResource";
import { Compatible, JoinLianeRequestDetailed } from "@/api";
import { LianeMatchView } from "@/components/trip/LianeMatchView";
import { AppCustomIcon, AppIcon } from "@/components/base/AppIcon";
import { formatDuration } from "@/util/datetime";
import { formatMonthDay, formatTime } from "@/api/i18n";
import { TripCard } from "@/components/TripCard";
import { TripChangeOverview, TripOverview } from "@/components/map/TripOverviewMap";

export const OpenJoinRequestScreen = WithFullscreenModal(() => {
  const { route, navigation } = useAppNavigation<"OpenJoinLianeRequest">();
  const insets = useSafeAreaInsets();

  const { services } = useContext(AppContext);
  const request = route.params.request;

  const acceptRequest = async () => {
    await services.liane.setAcceptedStatus(request.id!, true);
    navigation.goBack();
  };
  const refuseRequest = async () => {
    await services.liane.setAcceptedStatus(request.id!, false);
    navigation.goBack();
  };
  return (
    <Column style={{ flexGrow: 1, marginBottom: insets.bottom }}>
      <Column
        spacing={8}
        style={{
          paddingHorizontal: 12,
          paddingTop: 8,
          paddingBottom: 20
        }}>
        <DetailedRequestView params={{ request }} />
      </Column>
      <Row style={{ flexGrow: 1, alignItems: "flex-end", justifyContent: "flex-end", paddingHorizontal: 8 }} spacing={8}>
        <AppRoundedButton color={defaultTextColor(AppColors.white)} onPress={refuseRequest} backgroundColor={AppColors.white} text={"Refuser"} />
        <AppRoundedButton color={defaultTextColor(AppColors.orange)} onPress={acceptRequest} backgroundColor={AppColors.orange} text={"Accepter"} />
      </Row>
    </Column>
  );
}, "");

const DetailedRequestView = WithFetchResource<JoinLianeRequestDetailed>(
  ({ data }) => {
    const userName = data.createdBy!.pseudo ?? "John Doe";
    const role = data.seats > 0 ? "conducteur" : "passager";
    const isExactMatch = data.match.type === "Exact";
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
        newTrip={data.wayPoints}
      />
    );
    return (
      <Column spacing={24}>
        <AppText numberOfLines={2} style={{ color: AppColors.white, fontSize: 18 }}>
          {userName} souhaite rejoindre votre Liane en tant que {role} :
        </AppText>
        <TripCard header={headerDate} content={tripContent} />
        <View style={{ backgroundColor: AppColorPalettes.gray[400], borderRadius: 16, overflow: "hidden" }}>
          {isExactMatch && <TripOverview params={{ liane: data.targetLiane }} />}
          {!isExactMatch && <TripChangeOverview params={{ liane: data.targetLiane, newWayPoints: data.wayPoints }} />}
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
          <AppIcon name={isExactMatch ? "checkmark-circle-2-outline" : "alert-circle-outline"} color={AppColors.white} />
          <AppText numberOfLines={2} style={{ color: AppColors.white, fontSize: 14 }}>
            {isExactMatch ? "Votre trajet reste inchangé" : "Le trajet sera rallongé de " + formatDuration((data.match as Compatible).deltaInSeconds)}
          </AppText>
        </Row>
        {data.seats > 0 && !data.targetLiane.driver && (
          <Row spacing={16} style={{ alignItems: "center" }}>
            <AppCustomIcon name={"car-check-mark"} color={AppColors.white} />
            <AppText numberOfLines={2} style={{ color: AppColors.white, fontSize: 14 }}>
              Avec un conducteur, vous serez fin prêt pour le départ !
            </AppText>
          </Row>
        )}
      </Column>
    );
  },
  (repository, params) => repository.liane.getDetailedJoinRequest(params.request.id),
  params => DetailedRequestQueryKey + params.request.id
);

const DetailedRequestQueryKey = "DetailedRequestQueryKey";
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

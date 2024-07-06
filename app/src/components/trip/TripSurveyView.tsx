import { ActivityIndicator, View } from "react-native";
import { AppText } from "@/components/base/AppText.tsx";
import { AppColorPalettes, AppColors } from "@/theme/colors.ts";
import { AppLocalization } from "@/api/i18n.ts";
import { capitalize, CoLiane, JoinLianeRequestDetailed, Liane, LianeMessage, LianeState, TripMessage, UTCDateTime } from "@liane/common";
import React, { useCallback, useContext, useMemo } from "react";
import { Row } from "@/components/base/AppLayout.tsx";
import { UserPicture } from "@/components/UserPicture.tsx";
import { AppIcon } from "@/components/base/AppIcon.tsx";
import { AppPressableOverlay } from "@/components/base/AppPressable.tsx";
import { WayPointView } from "@/components/trip/WayPointsView.tsx";
import { useQuery, useQueryClient } from "react-query";
import { JoinRequestDetailQueryKey, JoinRequestsQueryKey, LianeDetailQueryKey, LianeQueryKey } from "@/screens/user/MyTripsScreen.tsx";
import { AppContext } from "@/components/context/ContextProvider.tsx";
import { AppStorage } from "@/api/storage.ts";
import { de } from "@faker-js/faker";
import { LianeStatusView } from "@/components/trip/LianeStatusView.tsx";

export const TripSurveyView = ({ message, coLiane, color }: { message: LianeMessage<TripMessage>; coLiane: CoLiane; color: string }) => {
  const { services, user } = useContext(AppContext);

  const trip = useQuery(LianeDetailQueryKey(message.content.value), () => services.liane.get(message.content.value));

  const { isMember } = useMemo(() => {
    if (!trip.data) {
      return { isMember: false };
    }
    const me = trip.data.members.some(m => m.user.id === user!.id);
    return { isMember: me };
  }, [trip.data, user]);

  const joinRequest = useQuery(JoinRequestDetailQueryKey(message.content.value), async () => {
    const joinRequests = (await services.liane.listJoinRequests()).data;
    return joinRequests.find(j => j.targetTrip.id === message.content.value);
  });

  const queryClient = useQueryClient();

  const handleJoinTrip = useCallback(async () => {
    if (!trip.data) {
      return;
    }
    if (isMember) {
      return;
    }

    const geolocationLevel = await AppStorage.getSetting("geolocation");
    await services.community.joinTrip({ liane: coLiane.id!, trip: trip.data.id!, geolocationLevel });
    await queryClient.invalidateQueries(JoinRequestDetailQueryKey(message.content.value));
    await queryClient.invalidateQueries(LianeDetailQueryKey(message.content.value));
    await queryClient.invalidateQueries(LianeQueryKey);
    await queryClient.invalidateQueries(JoinRequestsQueryKey);
  }, [trip.data, isMember, services.community, coLiane.id, queryClient, message.content.value]);

  return (
    <View>
      {(trip.isLoading || joinRequest.isLoading) && <ActivityIndicator color={AppColors.white} />}
      {trip.isError && <AppText>Erreur de chargement</AppText>}
      {!!trip.data && (
        <>
          <AppText style={{ fontWeight: "bold", fontSize: 18, color }}>
            {capitalize(AppLocalization.formatMonthDay(new Date(trip.data.departureTime)))}
          </AppText>
          <View>
            {trip.data.wayPoints.map((s, i) => (
              <WayPointView
                key={s.rallyingPoint.id}
                wayPoint={s}
                type={i === 0 ? "pickup" : i === trip.data.wayPoints.length - 1 ? "deposit" : "step"}
                isPast={false}
              />
            ))}
          </View>
          {isActive(trip.data) ? (
            <ActiveView trip={trip.data} isMember={isMember} joinRequest={joinRequest.data} handleJoinTrip={handleJoinTrip} />
          ) : (
            <LianeStatusView style={{ alignSelf: "flex-end" }} liane={trip.data} joinRequest={joinRequest.data} />
          )}
        </>
      )}
    </View>
  );
};

type ActiveViewProps = { trip: Liane; isMember: boolean; joinRequest?: JoinLianeRequestDetailed; handleJoinTrip: () => void };

const ActiveView = ({ trip, isMember, joinRequest, handleJoinTrip }: ActiveViewProps) => {
  return (
    <Row style={{ marginTop: 8, justifyContent: "space-between", alignItems: "center" }}>
      <View style={{ marginLeft: 10 }}>
        {trip.members.map(m => (
          <UserPicture key={m.user.id} url={m.user.pictureUrl} id={m.user.id} size={28} style={{ marginLeft: -10 }} />
        ))}
      </View>
      {isMember && <LianeStatusView liane={trip} joinRequest={joinRequest} />}
      {!isMember && joinRequest && (
        <AppText style={{ fontStyle: "italic", color: AppColorPalettes.gray[500] }}>
          {trip.state === "Started" ? "Trajet en cours" : "Demande en attente"}
        </AppText>
      )}
      {!isMember && !joinRequest && (
        <Row spacing={6} style={{ justifyContent: "flex-end" }}>
          <AppPressableOverlay
            backgroundStyle={{ backgroundColor: AppColors.primaryColor, borderRadius: 8 }}
            style={{ paddingHorizontal: 12, paddingVertical: 6 }}
            onPress={handleJoinTrip}>
            <Row style={{ alignItems: "center" }} spacing={6}>
              <AppIcon name={"thumb-up"} color={AppColors.white} size={28} />
              <AppText style={{ color: AppColors.white, fontWeight: "bold", fontSize: 18 }}>Participer</AppText>
            </Row>
          </AppPressableOverlay>
        </Row>
      )}
    </Row>
  );
};

function isActive(liane: Liane): boolean {
  return liane.state === "Started" || liane.state === "NotStarted";
}

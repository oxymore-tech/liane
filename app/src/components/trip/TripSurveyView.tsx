import { ActivityIndicator, View } from "react-native";
import { AppText } from "@/components/base/AppText.tsx";
import { AppColorPalettes, AppColors, ContextualColors } from "@/theme/colors.ts";
import { AppLocalization } from "@/api/i18n.ts";
import { capitalize, CoLiane, JoinLianeRequestDetailed, Liane, LianeMessage, LianeState, TripMessage } from "@liane/common";
import React, { useCallback, useContext, useMemo } from "react";
import { Column, Row } from "@/components/base/AppLayout.tsx";
import { UserPicture } from "@/components/UserPicture.tsx";
import { AppIcon } from "@/components/base/AppIcon.tsx";
import { AppPressableOverlay } from "@/components/base/AppPressable.tsx";
import { WayPointView } from "@/components/trip/WayPointsView.tsx";
import { useQuery, useQueryClient } from "react-query";
import { JoinRequestDetailQueryKey, JoinRequestsQueryKey, LianeDetailQueryKey, LianeQueryKey } from "@/screens/user/MyTripsScreen.tsx";
import { AppContext } from "@/components/context/ContextProvider.tsx";
import { AppStorage } from "@/api/storage.ts";

const LoadedTripSurveyView = ({ coLiane, trip }: { coLiane: CoLiane; trip: Liane }) => {
  const members = useMemo(() => {
    return coLiane.members.map(m => ({
      isMember: trip.members.some(n => m.user.id === n.user.id),
      member: m.user
    }));
  }, [coLiane, trip]);

  return (
    <>
      <Row spacing={4}>
        {members.map(m => (
          <View key={m.member.id} style={{ opacity: m.isMember ? 1 : 0.5 }}>
            <UserPicture url={m.member.pictureUrl} id={m.member.id} size={28} borderColor={AppColors.primaryColor} borderWidth={1} />
            {m.isMember && (
              <View style={{ position: "absolute", bottom: -2, right: -2, backgroundColor: AppColorPalettes.gray[100], borderRadius: 20 }}>
                <AppIcon name={"checkmark"} color={ContextualColors.greenValid.accent} size={16} />
              </View>
            )}
          </View>
        ))}
      </Row>

      <Column style={{ flexGrow: 1, flexShrink: 1 }}>
        {trip.wayPoints.map((s, i) => (
          <WayPointView wayPoint={s} type={i === 0 ? "pickup" : i === trip.wayPoints.length - 1 ? "deposit" : "step"} key={i} isPast={false} />
        ))}
      </Column>
    </>
  );
};

function isActive(liane: Liane): boolean {
  return liane.state === "Started" || liane.state === "NotStarted";
}

export const TripSurveyView = ({ survey, coLiane }: { survey: LianeMessage<TripMessage>; coLiane: CoLiane }) => {
  const date = useMemo(() => {
    return capitalize(AppLocalization.formatMonthDay(new Date(survey.createdAt!)));
  }, [survey.createdAt]);

  const { services, user } = useContext(AppContext);

  const trip = useQuery(LianeDetailQueryKey(survey.content.value), () => services.liane.get(survey.content.value));

  const { isMember, createdBy } = useMemo(() => {
    if (!trip.data) {
      return { isMember: false, createdBy: undefined };
    }
    const c = trip.data.members.find(m => m.user.id === survey.createdBy);
    const me = trip.data.members.some(m => m.user.id === user!.id);
    return { isMember: me, createdBy: c };
  }, [survey.createdBy, trip.data, user]);

  const joinRequest = useQuery(JoinRequestDetailQueryKey(survey.content.value), async () => {
    const joinRequests = (await services.liane.listJoinRequests()).data;
    return joinRequests.find(j => j.targetTrip.id === survey.content.value);
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
    await queryClient.invalidateQueries(JoinRequestDetailQueryKey(survey.content.value));
    await queryClient.invalidateQueries(LianeDetailQueryKey(survey.content.value));
    await queryClient.invalidateQueries(LianeQueryKey);
    await queryClient.invalidateQueries(JoinRequestsQueryKey);
  }, [trip.data, isMember, services.community, coLiane.id, queryClient, survey.content.value]);

  const driver = createdBy?.user.pseudo;

  return (
    <View style={{ backgroundColor: AppColors.backgroundColor, borderRadius: 16, padding: 8 }}>
      {(trip.isLoading || joinRequest.isLoading) && <ActivityIndicator />}
      {trip.isError && <AppText>Erreur de chargement</AppText>}
      {!!trip.data && (
        <>
          <AppText style={{ fontWeight: "bold", color: AppColorPalettes.gray[500], fontSize: 16 }}>
            {driver ? `${driver} propose le trajet pour ` : `Trajet proposé pour `}
          </AppText>
          <AppText style={{ fontWeight: "bold", fontSize: 18 }}>{date}</AppText>
          <LoadedTripSurveyView coLiane={coLiane} trip={trip.data} />

          {isActive(trip.data) ? (
            <ActiveView state={trip.data.state} isMember={isMember} joinRequest={joinRequest.data} handleJoinTrip={handleJoinTrip} />
          ) : (
            <InactiveView state={trip.data.state} />
          )}
        </>
      )}
    </View>
  );
};

type InactiveViewProps = { state: LianeState };

function getStatusText(state: LianeState) {
  if (state === "NotStarted") {
    return "Trajet non démarré";
  }
  if (state === "Started") {
    return "Trajet en cours";
  }
  if (state === "Canceled") {
    return "Trajet annulé";
  }
  if (state === "Finished") {
    return "Trajet terminé";
  }
  return "Trajet archivé";
}

const InactiveView = ({ state }: InactiveViewProps) => {
  return <AppText style={{ fontStyle: "italic", color: AppColorPalettes.gray[500] }}>{getStatusText(state)}</AppText>;
};

type ActiveViewProps = { state: LianeState; isMember: boolean; joinRequest?: JoinLianeRequestDetailed; handleJoinTrip: () => void };

const ActiveView = ({ state, isMember, joinRequest, handleJoinTrip }: ActiveViewProps) => {
  return (
    <>
      {isMember && <AppText style={{ fontStyle: "italic", color: AppColorPalettes.gray[500] }}>{}</AppText>}
      {!isMember && joinRequest && (
        <AppText style={{ fontStyle: "italic", color: AppColorPalettes.gray[500] }}>
          {state === "Started" ? "Trajet en cours" : "Demande en attente"}
        </AppText>
      )}
      {!isMember && !joinRequest && (
        <Row spacing={6}>
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
    </>
  );
};

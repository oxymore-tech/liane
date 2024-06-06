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
import { JoinRequestsQueryKey, LianeDetailQueryKey } from "@/screens/user/MyTripsScreen.tsx";
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

  const trip = useQuery(LianeDetailQueryKey(survey.content.value), async () => {
    const liane = await services.liane.get(survey.content.value);
    const createdBy = liane.members.find(m => m.user.id === survey.createdBy);
    if (liane.members.some(m => m.user.id === user!.id)) {
      // User is already a member of the trip
      return { liane, isMember: true, createdBy };
    } else {
      // TODO compute liane's version if user joins the trip
      return { liane, isMember: false, createdBy };
    }
  });

  const joinRequest = useQuery({
    queryKey: JoinRequestsQueryKey,
    queryFn: async () => {
      const joinRequests = (await services.liane.listJoinRequests()).data;
      return joinRequests.find(j => j.targetTrip.id === survey.content.value);
    }
  });

  const queryClient = useQueryClient();

  const handleJoinTrip = useCallback(async () => {
    if (!trip.data) {
      return;
    }
    if (trip.data.isMember) {
      return;
    }

    const geolocationLevel = await AppStorage.getSetting("geolocation");
    await services.community.joinTrip({ liane: coLiane.id!, trip: trip.data.liane.id!, geolocationLevel });
    await queryClient.invalidateQueries(JoinRequestsQueryKey);
  }, [queryClient, coLiane.id, services.community, trip.data]);

  return (
    <View style={{ backgroundColor: AppColors.backgroundColor, borderRadius: 16, padding: 8 }}>
      {(trip.isLoading || joinRequest.isLoading) && <ActivityIndicator />}
      {trip.isError && <AppText>Erreur de chargement</AppText>}
      {!!trip.data && (
        <>
          <AppText style={{ fontWeight: "bold", color: AppColorPalettes.gray[500], fontSize: 16 }}>
            {trip.data?.createdBy?.user.pseudo} propose le trajet pour{" "}
          </AppText>
          <AppText style={{ fontWeight: "bold", fontSize: 18 }}>{date}</AppText>
          <LoadedTripSurveyView coLiane={coLiane} trip={trip.data.liane} />

          {isActive(trip.data.liane) ? (
            <ActiveView isMember={trip.data.isMember} joinRequest={joinRequest.data} handleJoinTrip={handleJoinTrip} />
          ) : (
            <InactiveView state={trip.data.liane.state} />
          )}
        </>
      )}
    </View>
  );
};

type InactiveViewProps = { state: LianeState };

const InactiveView = ({ state }: InactiveViewProps) => {
  if (state === "Finished") {
    return <AppText style={{ fontStyle: "italic", color: AppColorPalettes.gray[500] }}>Trajet terminé</AppText>;
  }
  if (state === "Canceled") {
    return <AppText style={{ fontStyle: "italic", color: AppColorPalettes.gray[500] }}>Trajet annulé</AppText>;
  }
  return <AppText style={{ fontStyle: "italic", color: AppColorPalettes.gray[500] }}>Trajet archivé</AppText>;
};

type ActiveViewProps = { isMember: boolean; joinRequest?: JoinLianeRequestDetailed; handleJoinTrip: () => void };

const ActiveView = ({ isMember, joinRequest, handleJoinTrip }: ActiveViewProps) => {
  return (
    <>
      {isMember && <AppText style={{ fontStyle: "italic", color: AppColorPalettes.gray[500] }}>En attente de membres</AppText>}
      {!isMember && joinRequest && <AppText style={{ fontStyle: "italic", color: AppColorPalettes.gray[500] }}>Demande en attente</AppText>}
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

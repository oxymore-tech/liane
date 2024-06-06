import { ActivityIndicator, View } from "react-native";
import { AppText } from "@/components/base/AppText.tsx";
import { AppColorPalettes, AppColors, ContextualColors } from "@/theme/colors.ts";
import { AppLocalization } from "@/api/i18n.ts";
import { capitalize, CoLiane, Liane, LianeMessage, TripMessage } from "@liane/common";
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
    const query = { liane: coLiane.id!, trip: trip.data.liane.id!, geolocationLevel };
    console.log("Joining trip", query);
    await services.community.joinTrip(query);
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
          {trip.data.isMember && <AppText style={{ fontStyle: "italic", color: AppColorPalettes.gray[500] }}>En attente de membres</AppText>}
          {!trip.data.isMember && joinRequest.data && (
            <AppText style={{ fontStyle: "italic", color: AppColorPalettes.gray[500] }}>Demande en attente</AppText>
          )}
          {!trip.data.isMember && !joinRequest.data && (
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
              {/*   <AppPressableOverlay
                backgroundStyle={{ backgroundColor: AppColors.lightGrayBackground, borderRadius: 8 }}
                style={{ paddingHorizontal: 12, paddingVertical: 6 }}
                onPress={() => {}}>
                <AppIcon name={"thumb-down"} size={28} />
              </AppPressableOverlay>*/}
            </Row>
          )}
        </>
      )}
    </View>
  );
};

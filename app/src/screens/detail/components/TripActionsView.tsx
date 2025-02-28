import React, { useContext, useMemo, useState } from "react";
import { QueryClient, useQueryClient } from "react-query";
import { Alert } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LianeMatch, TimeOnlyUtils, Trip } from "@liane/common";
import { NavigationParamList, useAppNavigation } from "@/components/context/routing";
import { AppServices } from "@/api/service";
import { AppContext } from "@/components/context/ContextProvider";
import { Column } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { DebugIdView } from "@/components/base/DebugIdView";
import { SlideUpModal } from "@/components/modal/SlideUpModal";
import { TripQueryKey } from "@/screens/user/TripScheduleScreen";
import { AppColors, ContextualColors, defaultTextColor } from "@/theme/colors";
import { AppStyles } from "@/theme/styles";
import { ChoiceModal } from "@/components/modal/ChoiceModal";
import { CommonActions } from "@react-navigation/native";
import { TimeView } from "@/components/TimeView";
import { AppRoundedButton } from "@/components/base/AppRoundedButton";

export const TripActionsView = ({ match }: { match: LianeMatch }) => {
  const trip = match.trip;
  const { user, services } = useContext(AppContext);
  //const creator = trip.members.find(m => m.user.id === trip.createdBy!)!.user;
  const currentUserIsMember = trip.members.filter(m => m.user.id === user!.id).length === 1;
  const currentUserIsOwner = currentUserIsMember && trip.createdBy === user!.id;
  const currentUserIsDriver = currentUserIsMember && trip.driver.user === user!.id;

  const { navigation } = useAppNavigation();
  const queryClient = useQueryClient();

  const [timeModalVisible, setTimeModalVisible] = useState(false);
  const [editOptionsModalVisible, setEditOptionsModalVisible] = useState(false);
  const [date, setDate] = useState(new Date(trip.departureTime));

  const initialMinDate = TimeOnlyUtils.fromDate(new Date(new Date().getTime() + 60000));

  const editOptions = useMemo(() => {
    const buttonList: { text: string; action: () => void; danger?: boolean }[] = [
      {
        text: "Modifier l'horaire",
        action: () => setTimeModalVisible(true)
      }
    ];

    if (currentUserIsOwner && trip.state === "NotStarted" && trip.members.length > 1) {
      buttonList.push({
        text: "Annuler ce trajet",
        action: () => cancelTrip(navigation, services, queryClient, trip),
        danger: true
      });
    }

    if (currentUserIsMember && trip.state === "NotStarted" && !currentUserIsOwner) {
      buttonList.push({
        text: "Quitter le trajet",
        action: () => leaveTrip(navigation, services, queryClient, trip),
        danger: true
      });
    }

    if (currentUserIsOwner && trip.state === "NotStarted" && trip.members.length === 1) {
      buttonList.push({
        text: "Supprimer le trajet",
        action: () => deleteTrip(navigation, services, queryClient, trip),
        danger: true
      });
    }

    return buttonList;
  }, [currentUserIsMember, currentUserIsOwner, trip, navigation, queryClient, services]);

  return (
    <Column style={{ marginTop: 16 }}>
      {!(!currentUserIsDriver || trip.state !== "NotStarted") && (
        <AppRoundedButton
          color={defaultTextColor(AppColors.primaryColor)}
          onPress={() => setEditOptionsModalVisible(true)}
          backgroundColor={AppColors.primaryColor}
          text="Modifier le trajet"
        />
      )}
      {trip.state === "NotStarted" && currentUserIsMember && !currentUserIsDriver && (
        <AppRoundedButton
          color={defaultTextColor(AppColors.primaryColor)}
          onPress={() => {
            leaveTrip(navigation, services, queryClient, trip);
          }}
          backgroundColor={ContextualColors.redAlert.bg}
          text="Quitter le trajet"
        />
      )}
      {trip.state === "Started" && (
        <AppRoundedButton
          color={defaultTextColor(AppColors.primaryColor)}
          onPress={() => {
            cancelTrip(navigation, services, queryClient, trip);
          }}
          backgroundColor={ContextualColors.redAlert.bg}
          text="Annuler ce trajet"
        />
      )}

      <DebugIdView style={{ paddingVertical: 4, paddingHorizontal: 24 }} object={trip} />

      <ChoiceModal
        visible={editOptionsModalVisible}
        setVisible={setEditOptionsModalVisible}
        backgroundColor={AppColors.white}
        choices={editOptions}
      />

      <SlideUpModal
        actionText="Modifier l'horaire"
        backgroundColor={AppColors.white}
        onAction={async () => {
          const updated = await services.trip.updateDepartureTime(trip.id!, date.toISOString());
          // Update current page's content
          navigation.dispatch(CommonActions.setParams({ liane: updated }));
          // Update trip list
          await queryClient.invalidateQueries(TripQueryKey);
          setTimeModalVisible(false);
        }}
        visible={timeModalVisible}
        setVisible={setTimeModalVisible}>
        <Column spacing={16} style={{ marginBottom: 16 }}>
          <AppText style={{ ...AppStyles.title, marginVertical: 8, paddingLeft: 8 }}>À quelle heure partez-vous ?</AppText>
          <TimeView value={date} onChange={d => setDate(d)} minDate={initialMinDate} />
        </Column>
      </SlideUpModal>
    </Column>
  );
};

const deleteTrip = (
  navigation: NativeStackNavigationProp<NavigationParamList, keyof NavigationParamList>,
  services: AppServices,
  queryClient: QueryClient,
  trip: Trip
) => {
  Alert.alert("Supprimer le trajet", "Voulez-vous vraiment supprimer ce trajet ?", [
    {
      text: "Annuler",
      onPress: () => {},
      style: "cancel"
    },
    {
      text: "Supprimer",
      onPress: async () => {
        await services.trip.delete(trip.id!);
        await queryClient.invalidateQueries(TripQueryKey);
        navigation.goBack();
      },
      style: "default"
    }
  ]);
};

const cancelTrip = (
  navigation: NativeStackNavigationProp<NavigationParamList, keyof NavigationParamList>,
  services: AppServices,
  queryClient: QueryClient,
  trip: Trip
) => {
  Alert.alert("Annuler ce trajet", "Voulez-vous vraiment annuler ce trajet ?", [
    {
      text: "Fermer",
      onPress: () => {},
      style: "cancel"
    },
    {
      text: "Confirmer",
      onPress: async () => {
        await services.trip.cancel(trip.id!);
        await queryClient.invalidateQueries(TripQueryKey);
        navigation.goBack();
      },
      style: "default"
    }
  ]);
};

const leaveTrip = (
  navigation: NativeStackNavigationProp<NavigationParamList, keyof NavigationParamList>,
  services: AppServices,
  queryClient: QueryClient,
  liane: Trip
) => {
  Alert.alert("Quitter le trajet", "Voulez-vous vraiment quitter ce trajet ?", [
    {
      text: "Annuler",
      onPress: () => {},
      style: "cancel"
    },
    {
      text: "Quitter",
      onPress: async () => {
        await services.trip.leave(liane.id!);
        await queryClient.invalidateQueries(TripQueryKey);
        navigation.goBack();
      },
      style: "default"
    }
  ]);
};

import React, { useContext, useMemo, useState } from "react";
import { QueryClient, useQueryClient } from "react-query";
import { Alert, View } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { DayOfTheWeekFlag, FullUser, getPoint, Liane, LianeMatch } from "@/api";
import { NavigationParamList, useAppNavigation } from "@/api/navigation";
import { formatDate } from "@/api/i18n";
import { cancelSendLocationPings } from "@/api/service/location";
import { AppServices } from "@/api/service";
import { AppContext } from "@/components/context/ContextProvider";
import { Column, Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { DebugIdView } from "@/components/base/DebugIdView";
import { LineSeparator } from "@/components/Separator";
import { ActionItem } from "@/components/ActionItem";
import { SlideUpModal } from "@/components/modal/SlideUpModal";
import { DayOfTheWeekPicker } from "@/components/DayOfTheWeekPicker";
import { JoinRequestsQueryKey, LianeQueryKey } from "@/screens/user/MyTripsScreen";
import { AppColors, ContextualColors } from "@/theme/colors";
import { AppStyles } from "@/theme/styles";
import { ChoiceModal } from "@/components/modal/ChoiceModal";
import { CommonActions } from "@react-navigation/native";
import { IconName } from "@/components/base/AppIcon";
import { APP_ENV } from "@env";
import { TimeWheelPicker } from "@/components/TimeWheelPicker";

export const LianeActionsView = ({ match, request }: { match: LianeMatch; request?: string }) => {
  const liane = match.liane;
  const { user, services } = useContext(AppContext);
  const creator = liane.members.find(m => m.user.id === liane.createdBy!)!.user;
  const currentUserIsMember = liane.members.filter(m => m.user.id === user!.id).length === 1;
  const currentUserIsOwner = currentUserIsMember && liane.createdBy === user!.id;
  const currentUserIsDriver = currentUserIsMember && liane.driver.user === user!.id;

  const { navigation } = useAppNavigation();
  const queryClient = useQueryClient();

  const [timeModalVisible, setTimeModalVisible] = useState(false);
  const [recurrenceModalVisible, setRecurrenceModalVisible] = useState(false);
  const [editOptionsModalVisible, setEditOptionsModalVisible] = useState(false);
  const [date, setDate] = useState(new Date(liane.departureTime));
  const [daysOfTheWeek, setDaysOfTheWeek] = useState(liane.recurrence?.days || "0000000");

  const initialMinDate = new Date(new Date().getTime() + 10 * 60000);

  const lianeHasRecurrence = !!liane.recurrence;
  const editOptions = useMemo(() => {
    const buttonList: { text: string; action: () => void; danger?: boolean }[] = [
      {
        text: "Modifier l'horaire",
        action: () => setTimeModalVisible(true)
      }
    ];

    if (lianeHasRecurrence) {
      buttonList.push({
        text: "Modifier la récurrence",
        action: () => setRecurrenceModalVisible(true)
      });
    }

    if (currentUserIsMember && (liane.state === "Finished" || liane.state === "Archived")) {
      buttonList.push({
        text: "Relancer la liane",
        action: () => relaunchLiane(navigation, match)
      });
    }

    if (currentUserIsOwner && liane.state === "NotStarted" && liane.members.length > 1) {
      buttonList.push({
        text: "Annuler cette liane",
        action: () => cancelLiane(navigation, services, queryClient, liane),
        danger: true
      });
    }

    if (currentUserIsMember && liane.state === "Started") {
      buttonList.push({
        text: "Annuler cette liane",
        action: () => cancelStartedLiane(navigation, services, queryClient, liane),
        danger: true
      });
    }

    if (!currentUserIsMember && request) {
      buttonList.push({
        text: "Retirer la demande",
        action: () => cancelDemand(navigation, services, queryClient, request!),
        danger: true
      });
    }

    if (currentUserIsMember && liane.state === "NotStarted" && !currentUserIsOwner) {
      buttonList.push({
        text: "Quitter la liane",
        action: () => leaveLiane(navigation, services, queryClient, liane, user),
        danger: true
      });
    }

    if (currentUserIsOwner && liane.state === "NotStarted" && liane.members.length === 1) {
      buttonList.push({
        text: "Supprimer la liane",
        action: () => deleteLiane(navigation, services, queryClient, liane),
        danger: true
      });
    }

    if (lianeHasRecurrence) {
      buttonList.push({
        text: "Supprimer la récurrence",
        action: () => deleteRecurrence(navigation, services, queryClient, liane),
        danger: true
      });
    }

    return buttonList;
  }, [lianeHasRecurrence]);

  return (
    <Column>
      <Row style={{ justifyContent: "space-between" }}>
        <ActionItem
          disabled={!currentUserIsDriver || liane.state !== "NotStarted"}
          onPress={() => setEditOptionsModalVisible(true)}
          iconName={"edit-2"}
          text={"Modifier la liane"}
        />

        {
          //currentUserIsMember && (liane.state === "Finished" || liane.state === "Started") &&
          <ActionItem
            onPress={() => {
              // TODO
            }}
            disabled={true}
            iconName={"alert-circle-outline"}
            text={"Assistance"}
          />
        }
      </Row>

      <DebugIdView style={{ paddingVertical: 4, paddingHorizontal: 24 }} object={liane} />

      <ChoiceModal
        visible={editOptionsModalVisible}
        setVisible={setEditOptionsModalVisible}
        backgroundColor={AppColors.white}
        choices={editOptions}
      />

      <SlideUpModal
        actionText={"Modifier l'horaire"}
        backgroundColor={AppColors.white}
        onAction={async () => {
          const updated = await services.liane.updateDepartureTime(liane.id!, date.toISOString());
          // Update current page's content
          navigation.dispatch(CommonActions.setParams({ liane: updated }));
          // Update liane list
          await queryClient.invalidateQueries(LianeQueryKey);
          setTimeModalVisible(false);
        }}
        visible={timeModalVisible}
        setVisible={setTimeModalVisible}>
        <Column spacing={16} style={{ marginBottom: 16 }}>
          <AppText style={{ ...AppStyles.title, marginVertical: 8, paddingLeft: 8 }}>À quelle heure partez-vous ?</AppText>

          <View>
            <TimeWheelPicker date={date} minuteStep={5} onChange={setDate} minDate={initialMinDate} />
          </View>
        </Column>
      </SlideUpModal>

      {liane.recurrence && (
        <SlideUpModal
          actionText={"Modifier la récurrence"}
          backgroundColor={AppColors.white}
          onAction={() => updateRecurrence(navigation, services, queryClient, liane, daysOfTheWeek, setRecurrenceModalVisible)}
          visible={recurrenceModalVisible}
          setVisible={setRecurrenceModalVisible}>
          <Column spacing={16} style={{ marginBottom: 16 }}>
            <AppText style={{ ...AppStyles.title, marginVertical: 8, paddingLeft: 8 }}>Quels jours partez-vous ?</AppText>

            <View>
              <DayOfTheWeekPicker selectedDays={daysOfTheWeek} onChangeDays={setDaysOfTheWeek} />
            </View>
          </Column>
        </SlideUpModal>
      )}
    </Column>
  );
};

const pauseLiane = (services: AppServices, queryClient: QueryClient, liane: Liane, pause: boolean) => {
  Alert.alert(
    pause ? "Mettre en pause" : "Réactiver la liane",
    pause ? "Voulez-vous vraiment mettre en pause cette liane ?" : "Voulez-vous vraiment réactiver cette liane ?",
    [
      {
        text: "Annuler",
        onPress: () => {},
        style: "cancel"
      },
      {
        text: pause ? "Pause" : "Réactiver",
        onPress: async () => {
          if (pause) {
            await services.liane.pause(liane.id!);
          } else {
            await services.liane.unpause(liane.id!);
          }

          await queryClient.invalidateQueries(LianeQueryKey);
        },
        style: "default"
      }
    ]
  );
};

const deleteRecurrence = async (
  navigation: NativeStackNavigationProp<NavigationParamList, keyof NavigationParamList>,
  services: AppServices,
  queryClient: QueryClient,
  liane: Liane
) => {
  Alert.alert(
    "Supprimer la récurrence",
    "Tous les trajets à venir sont supprimés, sauf ceux comportant des passagers qui devront être supprimés manuellement.",
    [
      {
        text: "Annuler",
        onPress: () => {},
        style: "cancel"
      },
      {
        text: "Supprimer",
        onPress: async () => {
          await services.liane.deleteRecurrence(liane.recurrence!.id!);
          await queryClient.invalidateQueries(LianeQueryKey);
          navigation.goBack();
        },
        style: "default"
      }
    ]
  );
};
const updateRecurrence = async (
  navigation: NativeStackNavigationProp<NavigationParamList, keyof NavigationParamList>,
  services: AppServices,
  queryClient: QueryClient,
  liane: Liane,
  daysOfTheWeek: DayOfTheWeekFlag,
  setRecurrenceModalVisible: (v: boolean) => void
) => {
  await services.liane.updateRecurrence(liane.recurrence!.id!, daysOfTheWeek);
  // Update current liane content
  navigation.dispatch(CommonActions.setParams({ liane: { ...liane, recurrence: { ...liane.recurrence, days: daysOfTheWeek } } }));
  // Update liane list
  await queryClient.invalidateQueries(LianeQueryKey);
  setRecurrenceModalVisible(false);
  // Return to list if regularity is removed on the day of this trip
  if (daysOfTheWeek[(new Date(liane.departureTime).getUTCDay() + 7) % 7] === "0") {
    navigation.goBack();
  }
};
const relaunchLiane = (navigation: NativeStackNavigationProp<NavigationParamList, keyof NavigationParamList>, match: LianeMatch) => {
  const fromPoint = getPoint(match, "pickup");
  const toPoint = getPoint(match, "deposit");
  navigation.navigate("Publish", { initialValue: { from: fromPoint, to: toPoint } });
};

const deleteLiane = (
  navigation: NativeStackNavigationProp<NavigationParamList, keyof NavigationParamList>,
  services: AppServices,
  queryClient: QueryClient,
  liane: Liane
) => {
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
        await queryClient.invalidateQueries(LianeQueryKey);
        navigation.goBack();
      },
      style: "default"
    }
  ]);
};

const cancelLiane = (
  navigation: NativeStackNavigationProp<NavigationParamList, keyof NavigationParamList>,
  services: AppServices,
  queryClient: QueryClient,
  liane: Liane
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
        await services.liane.cancel(liane.id!);
        navigation.goBack();
        await queryClient.invalidateQueries(LianeQueryKey);
      },
      style: "default"
    }
  ]);
};

const cancelDemand = (
  navigation: NativeStackNavigationProp<NavigationParamList, keyof NavigationParamList>,
  services: AppServices,
  queryClient: QueryClient,
  request: string
) => {
  Alert.alert("Retirer la demande", "Voulez-vous vraiment retirer votre demande ?", [
    {
      text: "Annuler",
      onPress: () => {},
      style: "cancel"
    },
    {
      text: "Retirer",
      onPress: async () => {
        await services.liane.deleteJoinRequest(request);
        await queryClient.invalidateQueries(JoinRequestsQueryKey);
        navigation.goBack();
      },
      style: "default"
    }
  ]);
};

const leaveLiane = (
  navigation: NativeStackNavigationProp<NavigationParamList, keyof NavigationParamList>,
  services: AppServices,
  queryClient: QueryClient,
  liane: Liane,
  user: FullUser | undefined
) => {
  Alert.alert("Quitter la liane", "Voulez-vous vraiment quitter cette liane ?", [
    {
      text: "Annuler",
      onPress: () => {},
      style: "cancel"
    },
    {
      text: "Quitter",
      onPress: async () => {
        await services.liane.leave(liane.id!, user!.id!);
        await queryClient.invalidateQueries(LianeQueryKey);
        navigation.goBack();
      },
      style: "default"
    }
  ]);
};

const cancelStartedLiane = (
  navigation: NativeStackNavigationProp<NavigationParamList, keyof NavigationParamList>,
  services: AppServices,
  queryClient: QueryClient,
  liane: Liane
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
        // Cancel ongoing geolocation
        await cancelSendLocationPings();
        // TODO probably fill in some form
        await services.liane.cancel(liane.id!);
        navigation.goBack();
        await queryClient.invalidateQueries(LianeQueryKey);
      },
      style: "default"
    }
  ]);
};

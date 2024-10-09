import React, { useContext, useMemo, useState } from "react";
import { QueryClient, useQueryClient } from "react-query";
import { Alert, View } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Liane, LianeMatch, TimeOnlyUtils } from "@liane/common";
import { NavigationParamList, useAppNavigation } from "@/components/context/routing";
import { AppServices } from "@/api/service";
import { AppContext } from "@/components/context/ContextProvider";
import { Column } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { DebugIdView } from "@/components/base/DebugIdView";
import { SlideUpModal } from "@/components/modal/SlideUpModal";
import { LianeQueryKey } from "@/screens/user/MyTripsScreen";
import { AppColors, ContextualColors, defaultTextColor } from "@/theme/colors";
import { AppStyles } from "@/theme/styles";
import { ChoiceModal } from "@/components/modal/ChoiceModal";
import { CommonActions } from "@react-navigation/native";
import { TimeWheelPicker } from "@/components/TimeWheelPicker";
import { AppRoundedButton } from "@/components/base/AppRoundedButton";

export const LianeActionsView = ({ match }: { match: LianeMatch }) => {
  const liane = match.trip;
  const { user, services } = useContext(AppContext);
  //const creator = liane.members.find(m => m.user.id === liane.createdBy!)!.user;
  const currentUserIsMember = liane.members.filter(m => m.user.id === user!.id).length === 1;
  const currentUserIsOwner = currentUserIsMember && liane.createdBy === user!.id;
  const currentUserIsDriver = currentUserIsMember && liane.driver.user === user!.id;

  const { navigation } = useAppNavigation();
  const queryClient = useQueryClient();

  const [timeModalVisible, setTimeModalVisible] = useState(false);
  const [editOptionsModalVisible, setEditOptionsModalVisible] = useState(false);
  const [date, setDate] = useState(new Date(liane.departureTime));

  const initialMinDate = TimeOnlyUtils.fromDate(new Date(new Date().getTime() + 60000));

  const editOptions = useMemo(() => {
    const buttonList: { text: string; action: () => void; danger?: boolean }[] = [
      {
        text: "Modifier l'horaire",
        action: () => setTimeModalVisible(true)
      }
    ];

    if (currentUserIsOwner && liane.state === "NotStarted" && liane.members.length > 1) {
      buttonList.push({
        text: "Annuler ce trajet",
        action: () => cancelLiane(navigation, services, queryClient, liane),
        danger: true
      });
    }

    if (currentUserIsMember && liane.state === "NotStarted" && !currentUserIsOwner) {
      buttonList.push({
        text: "Quitter le trajet",
        action: () => leaveLiane(navigation, services, queryClient, liane),
        danger: true
      });
    }

    if (currentUserIsOwner && liane.state === "NotStarted" && liane.members.length === 1) {
      buttonList.push({
        text: "Supprimer le trajet",
        action: () => deleteLiane(navigation, services, queryClient, liane),
        danger: true
      });
    }

    return buttonList;
  }, []);

  return (
    <Column style={{ marginTop: 16 }}>
      {!(!currentUserIsDriver || liane.state !== "NotStarted") && (
        <AppRoundedButton
          color={defaultTextColor(AppColors.primaryColor)}
          onPress={() => setEditOptionsModalVisible(true)}
          backgroundColor={AppColors.primaryColor}
          text={"Modifier le trajet"}
        />
      )}
      {liane.state === "NotStarted" && currentUserIsMember && !currentUserIsDriver && (
        <AppRoundedButton
          color={defaultTextColor(AppColors.primaryColor)}
          onPress={() => {
            leaveLiane(navigation, services, queryClient, liane);
          }}
          backgroundColor={ContextualColors.redAlert.bg}
          text={"Quitter le trajet"}
        />
      )}
      {liane.state === "Started" && (
        <AppRoundedButton
          color={defaultTextColor(AppColors.primaryColor)}
          onPress={() => {
            cancelLiane(navigation, services, queryClient, liane);
          }}
          backgroundColor={ContextualColors.redAlert.bg}
          text={"Annuler ce trajet"}
        />
      )}

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
            <TimeWheelPicker
              date={TimeOnlyUtils.fromDate(date)}
              minuteStep={5}
              onChange={d => setDate(TimeOnlyUtils.toDate(d, date))}
              minDate={initialMinDate}
            />
          </View>
        </Column>
      </SlideUpModal>
    </Column>
  );
};

const deleteLiane = (
  navigation: NativeStackNavigationProp<NavigationParamList, keyof NavigationParamList>,
  services: AppServices,
  queryClient: QueryClient,
  liane: Liane
) => {
  Alert.alert("Supprimer l'annonce", "Voulez-vous vraiment supprimer ce trajet ?", [
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
        //  await queryClient.invalidateQueries(LianeQueryKey);
      },
      style: "default"
    }
  ]);
};

const leaveLiane = (
  navigation: NativeStackNavigationProp<NavigationParamList, keyof NavigationParamList>,
  services: AppServices,
  queryClient: QueryClient,
  liane: Liane
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
        await services.liane.leave(liane.id!);
        await queryClient.invalidateQueries(LianeQueryKey);
        navigation.goBack();
      },
      style: "default"
    }
  ]);
};

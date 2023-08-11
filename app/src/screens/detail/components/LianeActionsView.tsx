import { getPoint, LianeMatch } from "@/api";
import React, { useContext, useState } from "react";
import { AppContext } from "@/components/context/ContextProvider";
import { useAppNavigation } from "@/api/navigation";
import { useQueryClient } from "react-query";
import { Column } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { formatDate } from "@/api/i18n";
import { DebugIdView } from "@/components/base/DebugIdView";
import { LineSeparator } from "@/components/Separator";
import { ActionItem } from "@/components/ActionItem";
import { SlideUpModal } from "@/components/modal/SlideUpModal";
import { AppColors, ContextualColors } from "@/theme/colors";
import { AppStyles } from "@/theme/styles";
import { DatePagerSelector, TimeWheelPicker } from "@/components/DatePagerSelector";
import { Alert } from "react-native";
import { JoinRequestsQueryKey, LianeQueryKey } from "@/screens/user/MyTripsScreen";
import { cancelSendLocationPings } from "@/api/service/location";

export const LianeActionsView = ({ match, request }: { match: LianeMatch; request?: string }) => {
  const liane = match.liane;
  const { user, services } = useContext(AppContext);
  const currentUserIsMember = liane.members.filter(m => m.user.id === user!.id).length === 1;
  const currentUserIsOwner = currentUserIsMember && liane.createdBy === user!.id;
  const currentUserIsDriver = currentUserIsMember && liane.driver.user === user!.id;
  //console.log(user, currentUserIsMember, liane.members);
  const { navigation } = useAppNavigation();
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [date, setDate] = useState(new Date(liane.departureTime));
  const creator = liane.members.find(m => m.user.id === liane.createdBy!)!.user;

  return (
    <Column>
      <AppText numberOfLines={-1} style={{ paddingVertical: 4, paddingHorizontal: 24 }}>
        Liane postée le <AppText style={{ fontWeight: "bold" }}>{formatDate(new Date(liane.createdAt!))}</AppText> par{" "}
        <AppText style={{ fontWeight: "bold" }}>{creator.pseudo}</AppText>
      </AppText>
      <DebugIdView style={{ paddingVertical: 4, paddingHorizontal: 24 }} object={liane} />
      {currentUserIsDriver && liane.state === "NotStarted" && <LineSeparator />}
      {currentUserIsDriver && liane.state === "NotStarted" && (
        <ActionItem
          onPress={() => {
            setModalVisible(true);
          }}
          iconName={"clock-outline"}
          text={"Modifier l'horaire de départ"}
        />
      )}
      <SlideUpModal
        actionText={"Modifier l'horaire"}
        backgroundColor={AppColors.yellow}
        onAction={() => {}}
        visible={modalVisible}
        setVisible={setModalVisible}>
        <Column spacing={16} style={{ marginBottom: 16 }}>
          <AppText style={{ ...AppStyles.title, marginVertical: 8, paddingLeft: 8 }}>Quand partez-vous ?</AppText>
          <DatePagerSelector date={date} onSelectDate={setDate} />
          <TimeWheelPicker date={date} minuteStep={5} onChange={setDate} />
        </Column>
      </SlideUpModal>
      {currentUserIsMember && (liane.state === "Finished" || liane.state === "Archived") && (
        <ActionItem
          onPress={() => {
            const fromPoint = getPoint(match, "pickup");
            const toPoint = getPoint(match, "deposit");
            navigation.navigate("Publish", { initialValue: { from: fromPoint, to: toPoint } });
          }}
          iconName={"repeat"}
          text={"Relancer ce trajet"}
        />
      )}

      <LineSeparator />
      {currentUserIsOwner && liane.state === "NotStarted" && liane.members.length === 1 && (
        <ActionItem
          onPress={() => {
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
          }}
          color={ContextualColors.redAlert.text}
          iconName={"trash-outline"}
          text={"Supprimer l'annonce"}
        />
      )}

      {currentUserIsOwner && liane.state === "NotStarted" && liane.members.length > 1 && (
        <ActionItem
          onPress={() => {
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
          }}
          color={ContextualColors.redAlert.text}
          iconName={"close-outline"}
          text={"Annuler ce trajet"}
        />
      )}

      {!currentUserIsMember && request && (
        <ActionItem
          onPress={() => {
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
          }}
          color={ContextualColors.redAlert.text}
          iconName={"trash-outline"}
          text={"Retirer la demande"}
        />
      )}
      {currentUserIsMember && liane.state === "NotStarted" && !currentUserIsOwner && (
        <ActionItem
          onPress={() => {
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
          }}
          color={ContextualColors.redAlert.text}
          iconName={"log-out-outline"}
          text={"Quitter la liane"}
        />
      )}
      {currentUserIsMember && liane.state === "Started" && (
        <ActionItem
          onPress={() => {
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
          }}
          color={ContextualColors.redAlert.text}
          iconName={"close-outline"}
          text={"Annuler ce trajet"}
        />
      )}

      {currentUserIsMember && (liane.state === "Finished" || liane.state === "Started") && (
        <ActionItem
          onPress={() => {
            // TODO
          }}
          iconName={"alert-circle-outline"}
          text={"Assistance"}
        />
      )}
    </Column>
  );
};

import { WithFullscreenModal } from "@/components/WithFullscreenModal";
import { useAppNavigation } from "@/api/navigation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import React, { useContext, useState } from "react";
import { AppContext } from "@/components/ContextProvider";
import { Column, Row } from "@/components/base/AppLayout";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { AppColors, defaultTextColor } from "@/theme/colors";
import { AppRoundedButton } from "@/components/base/AppRoundedButton";
import { AppText } from "@/components/base/AppText";
import { AppCustomIcon, AppIcon } from "@/components/base/AppIcon";
import { formatMonthDay, formatTime } from "@/api/i18n";
import { CardTextInput } from "@/components/base/CardTextInput";
import { JoinLianeRequest } from "@/api";
import { LianeMatchView } from "@/components/trip/LianeMatchView";
import { TripCard } from "@/components/TripCard";
import { useKeyboardState } from "@/util/hooks/keyboardState";

export const RequestJoinScreen = WithFullscreenModal(() => {
  const { route, navigation } = useAppNavigation<"RequestJoin">();
  const insets = useSafeAreaInsets();

  const { services } = useContext(AppContext);
  const keyboardIsVisible = useKeyboardState();
  const request = route.params.request;
  const [message, setMessage] = useState("");

  const plural = Math.abs(request.seats) > 1 ? "s" : "";
  const peopleDescription =
    request.seats > 0 ? `Conducteur (${Math.abs(request.seats)} place${plural})` : Math.abs(request.seats) + " passager" + plural;
  const dateTime = `${formatMonthDay(new Date(request.targetLiane.departureTime))} à ${formatTime(new Date(request.targetLiane.departureTime))}`;
  const requestJoin = async () => {
    const unresolvedRequest: JoinLianeRequest = {
      from: request.from.id!,
      message,
      seats: request.seats,
      takeReturnTrip: request.takeReturnTrip,
      targetLiane: request.targetLiane.id!,
      to: request.to.id!
    };
    const r = { ...unresolvedRequest, message: message };
    await services.liane.join(r);
    navigation.navigate("Home", { screen: "Mes trajets" });
  };
  const headerDate = (
    <Row spacing={8}>
      <AppIcon name={"calendar-outline"} />
      <AppText style={{ fontSize: 16 }}>{dateTime}</AppText>
    </Row>
  );
  const tripContent = (
    <LianeMatchView
      from={request.from}
      to={request.to}
      departureTime={request.targetLiane.departureTime}
      originalTrip={request.targetLiane.wayPoints}
      newTrip={request.wayPoints}
    />
  );

  return (
    <KeyboardAvoidingView keyboardVerticalOffset={64} behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <Column
        style={{
          marginBottom: Math.max(keyboardIsVisible ? 0 : insets.bottom, 8),
          justifyContent: "space-between",
          flexGrow: 1
        }}>
        <ScrollView
          style={{
            flexShrink: 1,
            paddingHorizontal: 12,
            paddingTop: 8,
            paddingBottom: 20
          }}>
          <Column spacing={8}>
            <TripCard header={headerDate} content={tripContent} />
            <Row style={styles.card} spacing={8}>
              {request.seats > 0 ? <AppCustomIcon name={"car"} /> : <AppIcon name={"people-outline"} />}
              <AppText style={{ fontSize: 16 }}>{peopleDescription}</AppText>
            </Row>
          </Column>
          <View style={{ marginVertical: 24 }}>
            <CardTextInput multiline={true} numberOfLines={5} placeholder={"Ajouter un message..."} onChangeText={setMessage} />
          </View>
        </ScrollView>

        <View style={{ justifyContent: "flex-end", paddingHorizontal: 24 }}>
          <AppRoundedButton
            color={defaultTextColor(AppColors.orange)}
            onPress={requestJoin}
            backgroundColor={AppColors.orange}
            text={"Envoyer la demande"}
          />
        </View>
      </Column>
    </KeyboardAvoidingView>
  );
}, "Récapitulatif");

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
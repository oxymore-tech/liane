import { WithFullscreenModal } from "@/components/WithFullscreenModal";
import { useAppNavigation } from "@/api/navigation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import React, { useContext, useState } from "react";
import { AppContext } from "@/components/ContextProvider";
import { Column, Row } from "@/components/base/AppLayout";
import { StyleSheet, View } from "react-native";
import { AppColors, defaultTextColor } from "@/theme/colors";
import { AppRoundedButton } from "@/components/base/AppRoundedButton";
import { AppText } from "@/components/base/AppText";
import { AppCustomIcon, AppIcon } from "@/components/base/AppIcon";
import { formatMonthDay, formatTime } from "@/api/i18n";
import { CardTextInput } from "@/components/base/CardTextInput";
import { JoinLianeRequest } from "@/api";
import { LianeMatchView } from "@/components/trip/LianeMatchView";

export const RequestJoinScreen = WithFullscreenModal(() => {
  const { route } = useAppNavigation<"RequestJoin">();
  const insets = useSafeAreaInsets();

  const { services } = useContext(AppContext);
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
        <Row
          style={[
            styles.tag,
            {
              backgroundColor: AppColors.yellow
            }
          ]}
          spacing={8}>
          <AppIcon name={"calendar-outline"} />
          <AppText style={{ fontSize: 16 }}>{dateTime}</AppText>
        </Row>
        <View style={styles.card}>
          <LianeMatchView
            from={request.from}
            to={request.to}
            departureTime={request.targetLiane.departureTime}
            originalTrip={request.targetLiane.wayPoints}
            newTrip={request.wayPoints}
          />
        </View>
        <Row style={styles.card} spacing={8}>
          {request.seats > 0 ? <AppCustomIcon name={"car"} /> : <AppIcon name={"people-outline"} />}
          <AppText style={{ fontSize: 16 }}>{peopleDescription}</AppText>
        </Row>
        <View style={{ marginTop: 24 }}>
          <CardTextInput multiline={true} numberOfLines={5} placeholder={"Ajouter un message..."} onChangeText={setMessage} />
        </View>
      </Column>
      <View style={{ flexGrow: 1, justifyContent: "flex-end", paddingHorizontal: 24 }}>
        <AppRoundedButton
          color={defaultTextColor(AppColors.orange)}
          onPress={requestJoin}
          backgroundColor={AppColors.orange}
          text={"Envoyer la demande"}
        />
      </View>
    </Column>
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

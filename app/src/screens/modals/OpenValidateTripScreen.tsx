import { WithFullscreenModal } from "@/components/WithFullscreenModal";
import { useAppNavigation } from "@/api/navigation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import React, { useContext, useState } from "react";
import { AppContext } from "@/components/context/ContextProvider";
import { Column, Row } from "@/components/base/AppLayout";
import { ScrollView } from "react-native";
import { AppColors, defaultTextColor } from "@/theme/colors";
import { AppRoundedButton } from "@/components/base/AppRoundedButton";
import { AppText } from "@/components/base/AppText";
import { useQueryClient } from "react-query";
import { LianeQueryKey } from "@/screens/user/MyTripsScreen";
import { AppSwitchToggle } from "@/components/base/AppOptionToggle";
import { CardTextInput } from "@/components/base/CardTextInput";

export const OpenValidateTripScreen = WithFullscreenModal(() => {
  const { route, navigation } = useAppNavigation<"OpenValidateTrip">();
  const insets = useSafeAreaInsets();

  const { services } = useContext(AppContext);
  const liane = route.params.liane;
  const queryClient = useQueryClient();

  const [comment, setComment] = useState("");
  const [tripOk, setTripOk] = useState(true);

  const acceptRequest = async () => {
    const commentTrimmed = comment.trim();
    await services.liane.updateFeedback(liane.id!, { comment: commentTrimmed.length > 0 ? commentTrimmed : null, canceled: !tripOk });
    await queryClient.invalidateQueries(LianeQueryKey);
    navigation.goBack();
  };
  const refuseRequest = async () => {
    navigation.goBack();
  };

  return (
    <ScrollView style={{ flexGrow: 1, flex: 1, marginBottom: insets.bottom }}>
      <Column
        spacing={24}
        style={{
          flex: 1,
          paddingHorizontal: 12,
          paddingTop: 8,
          paddingBottom: 20
        }}>
        <Column spacing={8}>
          <AppText style={{ color: AppColors.fontColor, fontWeight: "bold" }}>Le trajet s'est-il déroulé comme prévu ?</AppText>
          <AppSwitchToggle
            defaultSelectedValue={true}
            options={[true, false]}
            selectionColor={AppColors.primaryColor}
            onSelectValue={() => setTripOk(!tripOk)}
          />
        </Column>
        <Column spacing={8}>
          <AppText style={{ color: AppColors.white, fontWeight: "bold" }}>Une remarque ? </AppText>

          <CardTextInput multiline={true} numberOfLines={5} placeholder={"Ajouter un commentaire..."} onChangeText={setComment} />
        </Column>
      </Column>

      <Row style={{ alignItems: "flex-end", justifyContent: "flex-end", paddingHorizontal: 8 }} spacing={8}>
        <AppRoundedButton color={defaultTextColor(AppColors.white)} onPress={refuseRequest} backgroundColor={AppColors.white} text={"Annuler"} />
        <AppRoundedButton
          color={defaultTextColor(AppColors.primaryColor)}
          onPress={acceptRequest}
          backgroundColor={AppColors.primaryColor}
          text={"Envoyer"}
        />
      </Row>
    </ScrollView>
  );
}, "");

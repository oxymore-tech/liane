import { LianeMatch } from "@/api";
import { useAppNavigation } from "@/api/navigation";
import { useTripGeolocation } from "@/screens/detail/TripGeolocationProvider";
import { Row } from "@/components/base/AppLayout";
import { AppColorPalettes, AppColors, defaultTextColor } from "@/theme/colors";
import React from "react";
import { Alert, ColorValue, Pressable, StyleSheet } from "react-native";
import { AppIcon, IconName } from "@/components/base/AppIcon";
import { cancelSendLocationPings } from "@/api/service/location";
import { AppPressableOverlay } from "@/components/base/AppPressable";
import { AppText } from "@/components/base/AppText";

const ActionFAB = (props: { onPress: () => void; color: ColorValue; icon: IconName }) => {
  return (
    <Pressable
      style={[styles.actionButton, { backgroundColor: props.color, padding: 8 }]}
      onPress={() => {
        props.onPress();
      }}>
      <AppIcon name={props.icon} color={defaultTextColor(props.color)} />
    </Pressable>
  );
};
export const LianeActionRow = ({ liane: match }: { liane: LianeMatch }) => {
  const { navigation } = useAppNavigation();
  const geoloc = useTripGeolocation();

  return (
    <Row style={{ justifyContent: "flex-end", alignItems: "center", paddingHorizontal: 24 }} spacing={8}>
      {geoloc !== undefined && (
        <AppPressableOverlay
          onPress={() => {
            if (!geoloc.isActive) {
              navigation.navigate("ShareTripLocationScreen", { liane: match.liane });
            } else {
              Alert.alert("Arrêter la géolocalisation ?", "Vous pourrez relancer le partage en réappuyant sur ce bouton.", [
                {
                  text: "Annuler",
                  onPress: () => {},
                  style: "cancel"
                },
                {
                  text: "Continuer",
                  onPress: async () => {
                    // Cancel ongoing geolocation
                    await cancelSendLocationPings();
                  },
                  style: "default"
                }
              ]);
            }
          }}
          backgroundStyle={{ backgroundColor: geoloc.isActive ? AppColorPalettes.blue[500] : AppColorPalettes.blue[100], borderRadius: 8 }}>
          <Row style={{ alignItems: "center", paddingHorizontal: 8, paddingVertical: 8 }} spacing={2}>
            <AppIcon name={geoloc.isActive ? "pin-outline" : "pin"} size={18} />
            <AppText>{geoloc.isActive ? "Géolocalisation en cours" : "Me géolocaliser"}</AppText>
          </Row>
        </AppPressableOverlay>
      )}

      {match.liane.state !== "Archived" && match.liane.state !== "Canceled" && match.liane.members.length > 1 && (
        <ActionFAB
          onPress={() => navigation.navigate("Chat", { conversationId: match.liane.conversation, liane: match.liane })}
          color={AppColors.blue}
          icon={"message-circle-full"}
        />
      )}
    </Row>
  );
};

const styles = StyleSheet.create({
  actionButton: {
    padding: 12,
    borderRadius: 52
  },
  section: { paddingVertical: 16, marginHorizontal: 24 } //TODO app global style
});

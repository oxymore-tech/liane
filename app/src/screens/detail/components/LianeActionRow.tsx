import { LianeMatch } from "@/api";
import { useAppNavigation } from "@/api/navigation";
import { useTripGeolocation } from "@/screens/detail/TripGeolocationProvider";
import { Row } from "@/components/base/AppLayout";
import { AppColorPalettes, AppColors, defaultTextColor } from "@/theme/colors";
import React from "react";
import { ColorValue, Pressable, StyleSheet } from "react-native";
import { AppIcon, IconName } from "@/components/base/AppIcon";

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
        <ActionFAB
          onPress={() => {
            if (!geoloc.isActive) {
              navigation.navigate("ShareTripLocationScreen", { liane: match.liane });
            }
          }}
          color={geoloc.isActive ? AppColorPalettes.gray[400] : AppColors.darkBlue}
          icon={"pin-outline"}
        />
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

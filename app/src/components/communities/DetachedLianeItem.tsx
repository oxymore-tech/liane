import { Detached, ResolvedLianeRequest } from "@liane/common";
import { AppText } from "@/components/base/AppText.tsx";
import { AppColors } from "@/theme/colors.ts";
import { Pressable, StyleSheet, View } from "react-native";
import { Row } from "@/components/base/AppLayout.tsx";
import { AppIcon } from "@/components/base/AppIcon.tsx";
import React from "react";
import { useAppNavigation } from "@/components/context/routing.ts";

export type DetachedLianeItemProps = {
  lianeRequest: ResolvedLianeRequest;
  state: Detached;
};

export const DetachedLianeItem = ({ lianeRequest, state }: DetachedLianeItemProps) => {
  const { navigation } = useAppNavigation();

  if (state.matches.length === 0) {
    return <AppText style={{ fontSize: 14, fontWeight: "bold", lineHeight: 23, color: AppColors.darkGray }}>en attente de conducteur</AppText>;
  }

  return (
    <Pressable
      style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "flex-end", flex: 1, paddingVertical: 5 }}
      onPress={() => navigation.navigate("ListGroups", { groups: state.matches, lianeRequest })}>
      <Row>
        {/*<View style={styles.notificationDotContainer}>
          <View style={styles.notificationDot} />
        </View>*/}
        <AppText
          style={{
            fontSize: 14,
            fontWeight: "bold",
            lineHeight: 23,
            color: AppColors.darkGray,
            marginLeft: 5
          }}>
          {state.matches.length === 1 ? "Voir la liane disponible" : `Voir les ${state.matches.length} lianes disponibles`}
        </AppText>
      </Row>
      <AppIcon name={"arrow-right"} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  notificationDotContainer: {
    justifyContent: "center",
    alignItems: "center"
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 6,
    backgroundColor: AppColors.orange
  }
});

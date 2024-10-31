import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { AppButton } from "@/components/base/AppButton.tsx";
import { IconName } from "@/components/base/AppIcon.tsx";
import { AppColors } from "@/theme/colors.ts";
import { contains, FR_BBOX, LatLng } from "@liane/common";
import { displayInfo } from "@/components/base/InfoDisplayer.ts";
import { useCallback, useContext, useMemo } from "react";
import { AppContext } from "@/components/context/ContextProvider.tsx";
import { Column } from "@/components/base/AppLayout.tsx";
import { useAppNavigation } from "@/components/context/routing.ts";
import { AppStyles } from "@/theme/styles.ts";

export type FloatingActionProps = {
  id: Action;
  icon: IconName;
  title: string;
  color: string;
  onPress: () => void;
};

export type FloatingActionsProps = {
  position?: "bottom" | "middle" | "top";
  actions: FloatingActionProps[];
};

export type Action = "add" | "position";

export type DefaultFloatingActionsProps = {
  position?: "bottom" | "middle" | "top";
  onPosition: (pos: LatLng) => void;
  actions?: Action[];
};

export const DefaultFloatingActions = ({ actions = ["add", "position"], position, onPosition }: DefaultFloatingActionsProps) => {
  const { services } = useContext(AppContext);
  const { navigation } = useAppNavigation();

  const set = useMemo(() => new Set(actions), [actions]);

  const handlePosition = useCallback(async () => {
    const currentLocation = await services.location.currentLocation();

    if (!contains(FR_BBOX, currentLocation)) {
      displayInfo("Désolé, Liane n'est pas disponible sur votre territoire.");
      return;
    }

    onPosition(currentLocation);
  }, [onPosition, services.location]);

  const handleCreate = useCallback(() => {
    navigation.navigate("Publish", {});
  }, [navigation]);

  return (
    <FloatingActions
      position={position}
      actions={[
        {
          id: "position",
          icon: "position-on",
          title: "Se positionner sur la carte",
          color: AppColors.white,
          onPress: handlePosition
        } as FloatingActionProps,
        {
          id: "add",
          icon: "plus-outline",
          title: "Créer une annonce",
          color: AppColors.primaryColor,
          onPress: handleCreate
        } as FloatingActionProps
      ].filter(action => set.has(action.id))}
    />
  );
};

function getPositionStyle(position: "bottom" | "middle" | "top"): StyleProp<ViewStyle> {
  switch (position) {
    case "bottom":
      return { bottom: 20 };
    case "top":
      return { top: 20 };
    default:
      return { top: "40%" };
  }
}

export const FloatingActions = ({ position = "bottom", actions }: FloatingActionsProps) => {
  return (
    <View style={[styles.container, AppStyles.shadow, getPositionStyle(position)]}>
      <Column style={styles.buttons} spacing={5}>
        {actions.map(action => (
          <AppButton key={action.id} icon={action.icon} color={action.color} title={action.title} onPress={action.onPress} />
        ))}
      </Column>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 10,
    zIndex: 30
  },
  buttons: {
    backgroundColor: AppColors.white,
    display: "flex",
    alignItems: "flex-end",
    padding: 10,
    borderRadius: 100
  }
});

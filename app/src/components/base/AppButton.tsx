import React from "react";
import { ColorValue, PressableProps, StyleSheet, TouchableOpacity, View } from "react-native";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { AppText } from "./AppText";
import { AppDimensions } from "@/theme/dimensions";
import { AppIcon, IconName } from "@/components/base/AppIcon";
import { AppPressableOverlay } from "@/components/base/AppPressable";
import { User } from "@liane/common";
import { UserPicture } from "../UserPicture";
import { Row } from "./AppLayout";
import { useAppNavigation } from "@/api/navigation";

// @ts-ignore
export type AppButtonProps = PressableProps & {
  color?: ColorValue;
  disabled?: boolean;
  kind?: "circular" | "rounded";
  foregroundColor?: ColorValue;
  user?: User | null;
} & ({ title: string; icon?: IconName } | { icon: IconName; title?: string });

export function AppButton({
  color = AppColors.primaryColor,
  disabled = false,
  title,
  icon,
  user = null,
  kind = "rounded",
  foregroundColor,
  ...props
}: AppButtonProps) {
  const { navigation } = useAppNavigation();
  const backgroundColor = disabled ? AppColorPalettes.gray[300] : color;
  const textColor = foregroundColor || (color === AppColors.white ? AppColorPalettes.gray[800] : AppColors.white);
  const borderRadius = AppDimensions.borderRadius * (kind === "rounded" ? 2 : 1);

  return (
    <AppPressableOverlay
      {...props}
      borderRadius={borderRadius}
      backgroundStyle={{ backgroundColor, borderRadius }}
      style={styles.contentContainer}
      disabled={disabled}>
      <Row>
        {icon && (
          <View style={styles.iconContainer}>
            <AppIcon name={icon} color={textColor} size={28} />
          </View>
        )}

        {title && <AppText style={[{ color: textColor }, styles.text]}>{title}</AppText>}
      </Row>

      {user && (
        <TouchableOpacity
          style={styles.userIconContainer}
          onPress={() =>
            // @ts-ignore
            navigation.navigate("Profile", { user })
          }>
          <UserPicture size={30} url={user?.pictureUrl} id={user?.id} />
        </TouchableOpacity>
      )}
    </AppPressableOverlay>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    paddingVertical: AppDimensions.button.paddingVertical,
    justifyContent: "center"
  },
  userIconContainer: {
    borderWidth: 1,
    borderRadius: 20,
    borderColor: AppColors.white,
    zIndex: 5
  },
  contentContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: AppDimensions.button.paddingHorizontal / 2,
    zIndex: 1
  },
  text: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: AppDimensions.button.paddingVertical,
    marginHorizontal: AppDimensions.button.paddingHorizontal / 2
  }
});

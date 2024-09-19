import React from "react";
import { ActivityIndicator, ColorValue, PressableProps, StyleSheet, TouchableOpacity } from "react-native";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { AppText } from "./AppText";
import { AppDimensions } from "@/theme/dimensions";
import { AppIcon, IconName } from "@/components/base/AppIcon";
import { AppPressable } from "@/components/base/AppPressable";
import { User } from "@liane/common";
import { UserPicture } from "../UserPicture";
import { Row } from "./AppLayout";
import { useAppNavigation } from "@/components/context/routing";
import { AppStyles } from "@/theme/styles.ts";

// @ts-ignore
export type AppButtonProps = PressableProps & {
  color?: ColorValue;
  disabled?: boolean;
  kind?: "circular" | "rounded";
  foregroundColor?: ColorValue;
  user?: User | null;
  loading?: boolean;
} & ({ title: string; icon?: IconName } | { icon: IconName; title?: string });

export function AppButton({
  color = AppColors.primaryColor,
  disabled = false,
  title,
  icon,
  user = null,
  kind = "rounded",
  foregroundColor,
  loading = false,
  style,
  ...props
}: AppButtonProps) {
  const { navigation } = useAppNavigation();
  const backgroundColor = disabled ? AppColorPalettes.gray[300] : color;
  const textColor =
    foregroundColor ||
    (color === AppColors.white || color === AppColors.grayBackground || color === AppColors.lightGrayBackground
      ? AppColorPalettes.gray[800]
      : AppColors.white);
  const borderRadius = AppDimensions.borderRadius * (kind === "rounded" ? 2 : 1);

  const d = disabled || loading;

  return (
    <AppPressable {...props} style={[style, { backgroundColor, borderRadius }]} disabled={d}>
      <Row style={styles.contentContainer}>
        {loading && <ActivityIndicator style={AppStyles.fullHeight} color={AppColors.white} size="large" />}
        {!loading && icon && <AppIcon style={styles.iconContainer} name={icon} color={textColor} size={28} />}
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
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    justifyContent: "center",
    marginRight: 8
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
    justifyContent: "center",
    paddingHorizontal: AppDimensions.button.paddingHorizontal / 2,
    zIndex: 1,
    marginVertical: AppDimensions.button.paddingVertical
  },
  text: {
    fontSize: 18,
    fontWeight: "bold"
  }
});

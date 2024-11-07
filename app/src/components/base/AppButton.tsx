import React, { useState } from "react";
import { ActivityIndicator, ColorValue, PressableProps, StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from "react-native";
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
import Animated, { FadeInRight, FadeOutRight } from "react-native-reanimated";
import { useAppWindowsDimensions } from "@/components/base/AppWindowsSizeProvider.tsx";

// @ts-ignore
export type AppButtonProps = PressableProps & {
  color?: ColorValue;
  disabled?: boolean;
  kind?: "circular" | "rounded";
  foregroundColor?: ColorValue;
  user?: User | null;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  title?: string;
} & ({ value: string; icon?: IconName } | { icon: IconName; value?: string });

export function AppButton({
  color = AppColors.primaryColor,
  disabled = false,
  title,
  value,
  icon,
  user = null,
  kind = "rounded",
  foregroundColor,
  loading = false,
  style,
  ...props
}: AppButtonProps) {
  const { navigation } = useAppNavigation();
  const { width } = useAppWindowsDimensions();
  const [showTitle, setShowTitle] = useState(false);
  const backgroundColor = disabled ? AppColorPalettes.gray[300] : color;
  const textColor =
    foregroundColor ||
    (color === AppColors.white || color === AppColors.grayBackground || color === AppColors.lightGrayBackground
      ? AppColorPalettes.gray[800]
      : AppColors.white);
  const borderRadius = AppDimensions.borderRadius * (kind === "rounded" ? 200 : 1);

  const d = disabled || loading;

  return (
    <AppPressable
      {...props}
      onTouchStart={() => setShowTitle(true)}
      onTouchEnd={() => setShowTitle(false)}
      onTouchCancel={() => setShowTitle(false)}
      style={[{ backgroundColor, borderRadius }, style]}
      disabled={d}>
      {title && showTitle && (
        <Animated.View entering={FadeInRight} exiting={FadeOutRight} style={{ position: "absolute", bottom: 0, right: 0, width }}>
          <View
            style={[
              {
                paddingVertical: 2,
                paddingHorizontal: 8,
                backgroundColor: AppColors.primaryColor,
                borderRadius: 4,
                flexShrink: 1,
                alignSelf: "center"
              },
              AppStyles.shadow
            ]}>
            <AppText style={{ color: AppColors.white, fontWeight: "bold", fontSize: 16 }}>{title}</AppText>
          </View>
        </Animated.View>
      )}

      <Row style={styles.contentContainer} spacing={8}>
        {loading && <ActivityIndicator color={textColor} size="small" />}
        {!loading && icon && <AppIcon style={styles.iconContainer} name={icon} color={textColor} size={28} />}
        {value && <AppText style={[{ color: textColor }, styles.text]}>{value}</AppText>}
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

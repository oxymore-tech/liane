import { AppColorPalettes, AppColors } from "@/theme/colors";
import { Row } from "@/components/base/AppLayout";
import { Platform, StyleSheet, View } from "react-native";
import { AppText } from "@/components/base/AppText";
import React from "react";
import { AppStatusBar } from "@/components/base/AppStatusBar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppPressableIcon } from "@/components/base/AppPressable";

export const WithFullscreenModal =
  (WrappedComponent: React.ComponentType, title: string, dismissible: boolean = true) =>
  (props: any) => {
    const { top, bottom } = useSafeAreaInsets();
    return (
      <View style={[styles.page, { backgroundColor: AppColors.white, paddingTop: Math.max(top, 16), paddingBottom: Math.max(16, bottom) }]}>
        {Platform.OS === "android" && <AppStatusBar style="light-content" />}
        <Row style={{ paddingVertical: 4 }}>
          {dismissible && <AppPressableIcon onPress={props.navigation.goBack} name="close-outline" size={32} />}
          <AppText style={[styles.title]}>{title} </AppText>
        </Row>

        <WrappedComponent {...props} />
      </View>
    );
  };

const styles = StyleSheet.create({
  page: {
    flex: 1,
    padding: 16
  },
  title: { fontSize: 22, fontWeight: "bold", color: AppColorPalettes.gray[800], paddingHorizontal: 8, marginBottom: 16 }
});

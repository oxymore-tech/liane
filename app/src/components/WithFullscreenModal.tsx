import { AppColorPalettes, AppColors } from "@/theme/colors";
import { Row } from "@/components/base/AppLayout";
import { KeyboardAvoidingView, Pressable, StyleSheet, View } from "react-native";
import { AppIcon } from "@/components/base/AppIcon";
import { AppText } from "@/components/base/AppText";
import React from "react";

export const WithFullscreenModal = (WrappedComponent: React.ComponentType, title: string) => (props: any) => {
  return (
    <View style={[styles.page, { backgroundColor: AppColors.darkBlue }]}>
      <Row style={{ paddingVertical: 4 }}>
        <Pressable onPress={props.navigation.goBack}>
          <AppIcon name="close-outline" size={32} color={AppColors.white} />
        </Pressable>
        <AppText style={[styles.title, { color: AppColors.white }]}>{title} </AppText>
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
  title: { fontSize: 22, fontWeight: "500", color: AppColorPalettes.gray[800], paddingHorizontal: 8, marginBottom: 16 }
});

import { Liane } from "@/api";
import { ParamListBase } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React from "react";
import { Pressable, View } from "react-native";
import { LianeView } from "@/components/LianeView";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Column, Row } from "@/components/base/AppLayout";
import { AppIcon } from "@/components/base/AppIcon";
import { AppButton } from "@/components/base/AppButton";

export interface LianeDetailScreenParams extends ParamListBase {
  liane?: Liane;
}

export const LianeDetailScreen = ({ route, navigation }: NativeStackScreenProps<LianeDetailScreenParams, "LianeDetail">) => {
  const liane: Liane = route.params!.liane;
  const insets = useSafeAreaInsets();

  return (
    <View style={{ backgroundColor: AppColors.darkBlue, justifyContent: "flex-end", flex: 1 }}>
      <Row spacing={16} style={{ padding: 16, marginBottom: insets.bottom + 8, marginTop: 8 }}>
        <AppButton
          onPress={() => {
            navigation.navigate("Chat");
          }}
          icon="plus-outline"
          color={AppColors.white}
          kind="circular"
          foregroundColor={AppColors.blue}
        />
      </Row>

      <Column
        spacing={8}
        style={{
          backgroundColor: AppColors.pink,
          margin: 8,
          borderRadius: 16,
          position: "absolute",
          top: insets.top,
          left: 0,
          right: 0,
          paddingVertical: 8,
          paddingHorizontal: 8,
          paddingBottom: 16
        }}>
        <Pressable style={{ padding: 8 }} onPress={() => navigation.goBack()}>
          <AppIcon name={"arrow-ios-back-outline"} />
        </Pressable>
        <View
          style={{
            backgroundColor: AppColors.white,
            borderRadius: 24,
            paddingVertical: 16,
            paddingHorizontal: 24,
            borderColor: AppColorPalettes.gray[200],
            borderWidth: 1
          }}>
          <LianeView liane={liane} />
        </View>
      </Column>
    </View>
  );
};

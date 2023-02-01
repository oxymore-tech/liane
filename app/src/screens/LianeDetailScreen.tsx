import { Liane } from "@/api";
import { ParamListBase } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React from "react";
import { FlatList, Pressable, View } from "react-native";
import { LianeView } from "@/components/LianeView";
import { AppColorPalettes, AppColors, WithAlpha } from "@/theme/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Column, Row } from "@/components/base/AppLayout";
import { AppIcon } from "@/components/base/AppIcon";
import { AppText } from "@/components/base/AppText";
import { AppTextInput } from "@/components/base/AppTextInput";
import { AppButton } from "@/components/base/AppButton";

export interface LianeDetailScreenParams extends ParamListBase {
  liane?: Liane;
}

const MessageBubble = ({ message, sender }) => (
  <Column
    spacing={4}
    style={{
      backgroundColor: sender ? WithAlpha(AppColors.white, 0.68) : AppColorPalettes.blue[300],
      alignSelf: sender ? "flex-end" : "flex-start",
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      marginVertical: 6
    }}>
    <AppText style={{ fontSize: 14 }}>{message}</AppText>
    <AppText style={{ fontSize: 10 }}>{"Hier, 10:02"}</AppText>
  </Column>
);

export const LianeDetailScreen = ({ route, navigation }: NativeStackScreenProps<LianeDetailScreenParams, "LianeDetail">) => {
  const liane: Liane = route.params!.liane;
  const insets = useSafeAreaInsets();
  const messages = [
    { message: "Merci", sender: true },
    { message: "Ok, je vais voir ce que je peux faire.", sender: false },
    { message: "Ou même plus tard ?", sender: true },
    { message: "Bonjour, peut-on décaler le départ à 10h20 ?", sender: true }
  ];

  const sendButton = (
    <Pressable onPress={() => {}}>
      <AppIcon name={"navigation-2-outline"} color={AppColors.blue} />
    </Pressable>
  );

  return (
    <View style={{ backgroundColor: AppColors.darkBlue, justifyContent: "flex-end", flex: 1 }}>
      <FlatList
        style={{ paddingHorizontal: 16 }}
        data={messages}
        renderItem={({ item }) => <MessageBubble sender={item.sender} message={item.message} />}
        inverted={true}
      />

      <Row spacing={16} style={{ padding: 16, marginBottom: insets.bottom + 8, marginTop: 8 }}>
        <AppButton onPress={() => {}} icon="plus-outline" color={AppColors.white} kind="circular" foregroundColor={AppColors.blue} />
        <View style={{ backgroundColor: AppColors.white, borderRadius: 16, padding: 16, flexGrow: 1 }}>
          <AppTextInput multiline={true} trailing={sendButton} />
        </View>
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
/*
  <Substract color={AppColors.yellow} width="55%" style={{ position: "absolute", bottom: -48, left: -2 }} />
        <AppText style={{ fontWeight: "600", fontSize: 16, position: "absolute", bottom: -14, left: 40, color: AppColorPalettes.gray[800] }}>
          {formatMonthDay(new Date(liane.departureTime))}
        </AppText>
 */
/* OR
  <Row style={{ backgroundColor: AppColors.white, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 8 }}>
          <View style={{ backgroundColor: AppColors.yellow, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16 }}>
            <AppText style={{ fontWeight: "600", fontSize: 14 }}>{formatMonthDay(new Date(liane.departureTime))}</AppText>
          </View>
        </Row>

 */
